package controller

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/storage_setting"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/singleflight"
)

const (
	r2TransferWaitTimeout = 120 * time.Second
	r2TransferPollDelay   = 500 * time.Millisecond
)

var videoTransferGroup singleflight.Group

// GetVideoTaskStatus handles GET /v1/videos/:task_id
//
// When global VideoR2Enable is ON, query is intercepted by local task storage:
// 1) return immediately if task already contains R2 URLs
// 2) otherwise transfer to R2 in-query and wait for completion
// 3) if transfer fails, return transfer error instead of upstream URL
func GetVideoTaskStatus(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "task_id is required", "type": "invalid_request_error"},
		})
		return
	}
	c.Set("relay_mode", relayconstant.RelayModeVideoFetchByID)

	if !storage_setting.IsVideoR2Enabled() {
		RelayTask(c)
		return
	}

	task, exists, err := model.GetByOnlyTaskId(taskID)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("GetVideoTaskStatus query error for %s: %s", taskID, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "Failed to query task", "type": "server_error"},
		})
		return
	}
	if !exists || task == nil {
		RelayTask(c)
		return
	}
	if nextTask, refreshErr := refreshVideoTaskStatusFromUpstream(c.Request.Context(), task); refreshErr != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("GetVideoTaskStatus refresh failed for %s: %s", taskID, refreshErr.Error()))
	} else if nextTask != nil {
		task = nextTask
	}

	waitCtx, cancel := context.WithTimeout(c.Request.Context(), r2TransferWaitTimeout)
	defer cancel()

	if isR2TransferInProgress(task) {
		nextTask, waitErr := waitForR2TransferState(waitCtx, task.TaskID)
		if waitErr != nil {
			if respondSoraUpstreamFallback(c, task, waitErr) {
				return
			}
			respondR2TransferError(c, task, waitErr)
			return
		}
		task = nextTask
	}

	if task.Status == model.TaskStatusSuccess && !taskHasR2Result(task) {
		nextTask, transferErr := ensureTaskTransferredToR2(waitCtx, task.TaskID)
		if transferErr != nil {
			if respondSoraUpstreamFallback(c, task, transferErr) {
				return
			}
			respondR2TransferError(c, task, transferErr)
			return
		}
		task = nextTask
		if !taskHasR2Result(task) {
			if respondSoraUpstreamFallback(c, task, fmt.Errorf("r2 url not available after transfer")) {
				return
			}
			respondR2TransferError(c, task, fmt.Errorf("r2 url not available after transfer"))
			return
		}
	}

	// Always return structured error for failed tasks, even when R2 takeover is enabled.
	if task.Status == model.TaskStatusFailure {
		c.JSON(http.StatusOK, buildVideoResponse(task, true))
		return
	}

	if rawPayload, ok := buildR2TaskDataPayload(task); ok {
		c.Data(http.StatusOK, "application/json", rawPayload)
		return
	}

	video := buildVideoResponse(task, true)
	if task.Status == model.TaskStatusInProgress && task.Progress == "95%" {
		video.SetMetadata("message", "video transfer in progress")
	}
	c.JSON(http.StatusOK, video)
}

func refreshVideoTaskStatusFromUpstream(_ context.Context, task *model.Task) (*model.Task, error) {
	if task == nil {
		return nil, fmt.Errorf("task is nil")
	}
	channelModel, err := model.CacheGetChannel(task.ChannelId)
	if err != nil {
		return nil, fmt.Errorf("get channel failed: %w", err)
	}

	baseURL := constant.ChannelBaseURLs[channelModel.Type]
	if channelModel.GetBaseURL() != "" {
		baseURL = channelModel.GetBaseURL()
	}
	proxy := channelModel.GetSetting().Proxy
	adaptor := relay.GetTaskAdaptor(constant.TaskPlatform(strconv.Itoa(channelModel.Type)))
	if adaptor == nil {
		return nil, fmt.Errorf("video adaptor not found for channel type %d", channelModel.Type)
	}

	requestKey := channelModel.Key
	if strings.TrimSpace(task.PrivateData.Key) != "" {
		requestKey = task.PrivateData.Key
	} else if channelModel.ChannelInfo.IsMultiKey {
		nextKey, _, keyErr := channelModel.GetNextEnabledKey()
		if keyErr == nil && strings.TrimSpace(nextKey) != "" {
			requestKey = nextKey
		}
	}

	queryModel := strings.TrimSpace(task.Properties.UpstreamModelName)
	if queryModel == "" {
		queryModel = strings.TrimSpace(task.Properties.OriginModelName)
	}
	if queryModel == "" && len(task.Data) > 0 {
		var taskData map[string]any
		if err := common.Unmarshal(task.Data, &taskData); err == nil {
			if m, ok := taskData["model"].(string); ok {
				queryModel = strings.TrimSpace(m)
			}
		}
	}

	payload := map[string]any{
		"task_id": task.TaskID,
		"action":  task.Action,
		"model":   queryModel,
	}
	responseBody, usedKey, err := fetchTaskResponseBody(adaptor, channelModel, task, baseURL, requestKey, payload, proxy)
	if err != nil {
		return nil, fmt.Errorf("fetch task failed: %w", err)
	}
	if usedKey != "" && strings.TrimSpace(task.PrivateData.Key) == "" && channelModel.ChannelInfo.IsMultiKey {
		task.PrivateData.Key = usedKey
	}

	taskResult := &relaycommon.TaskInfo{}
	var responseItems dto.TaskResponse[model.Task]
	if err = common.Unmarshal(responseBody, &responseItems); err == nil && responseItems.IsSuccess() {
		t := responseItems.Data
		taskResult.TaskID = t.TaskID
		taskResult.Status = string(t.Status)
		taskResult.Url = t.FailReason
		taskResult.Progress = t.Progress
		taskResult.Reason = t.FailReason
		task.Data = t.Data
	} else if taskResult, err = adaptor.ParseTaskResult(responseBody); err != nil {
		return nil, fmt.Errorf("parse task result failed: %w", err)
	} else {
		task.Data = redactVideoResponseBody(responseBody)
	}

	if taskResult != nil {
		if taskResult.Status != "" {
			task.Status = model.TaskStatus(taskResult.Status)
		}
		if taskResult.Progress != "" {
			task.Progress = taskResult.Progress
		}
		if taskResult.Url != "" && !strings.HasPrefix(taskResult.Url, "data:") {
			task.FailReason = taskResult.Url
		}
		if taskResult.Reason != "" && (task.Status == model.TaskStatusFailure || strings.TrimSpace(task.FailReason) == "") {
			task.FailReason = taskResult.Reason
		}
	}

	if err := task.Update(); err != nil {
		return nil, fmt.Errorf("save refreshed task failed: %w", err)
	}
	return task, nil
}

func ensureTaskTransferredToR2(ctx context.Context, taskID string) (*model.Task, error) {
	workerCtx, cancel := context.WithTimeout(context.Background(), r2TransferWaitTimeout)
	defer cancel()

	ch := videoTransferGroup.DoChan(taskID, func() (interface{}, error) {
		task, exists, err := model.GetByOnlyTaskId(taskID)
		if err != nil {
			return nil, err
		}
		if !exists || task == nil {
			return nil, fmt.Errorf("task %s not found", taskID)
		}

		if isR2TransferInProgress(task) {
			task, err = waitForR2TransferState(workerCtx, taskID)
			if err != nil {
				return nil, err
			}
		}

		if task.Status != model.TaskStatusSuccess {
			return task, nil
		}
		if taskHasR2Result(task) {
			return task, nil
		}

		return transferTaskToR2(workerCtx, task)
	})

	select {
	case res := <-ch:
		if res.Err != nil {
			return nil, res.Err
		}
		task, ok := res.Val.(*model.Task)
		if !ok || task == nil {
			return nil, fmt.Errorf("invalid transfer result for task %s", taskID)
		}
		return task, nil
	case <-ctx.Done():
		return nil, fmt.Errorf("wait r2 transfer timeout: %w", ctx.Err())
	}
}

func transferTaskToR2(ctx context.Context, task *model.Task) (*model.Task, error) {
	if task == nil {
		return nil, fmt.Errorf("task is nil")
	}

	prefix := storage_setting.GetVideoR2Prefix()
	mainR2URL := ""
	dataChanged := false
	var transferChannel *model.Channel

	var taskData map[string]interface{}
	if len(task.Data) > 0 {
		if err := common.Unmarshal(task.Data, &taskData); err != nil {
			return nil, fmt.Errorf("parse task data failed: %w", err)
		}
	}
	if taskData == nil {
		taskData = map[string]interface{}{}
	}
	if isSoraTask(task) && task.ChannelId != 0 {
		channel, err := model.CacheGetChannel(task.ChannelId)
		if err == nil && channel != nil {
			transferChannel = channel
		}
	}

	type fieldRule struct {
		name      string
		fileName  string
		asMainURL bool
	}
	rules := []fieldRule{
		{name: "url", fileName: fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID), asMainURL: true},
		{name: "video_url", fileName: fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID), asMainURL: true},
		{name: "output_url", fileName: fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID), asMainURL: true},
		{name: "image_url", fileName: fmt.Sprintf("%s/%s_image.jpg", prefix, task.TaskID), asMainURL: false},
		{name: "thumbnail_url", fileName: fmt.Sprintf("%s/%s_thumb.jpg", prefix, task.TaskID), asMainURL: false},
	}

	for _, rule := range rules {
		rawURL, ok := taskData[rule.name].(string)
		if !ok || strings.TrimSpace(rawURL) == "" {
			continue
		}
		sourceURL := rawURL
		if isSoraTask(task) && rule.asMainURL {
			sourceURL = normalizeSoraUpstreamURL(rawURL)
		}
		if service.IsR2URL(rawURL) {
			if mainR2URL == "" && rule.asMainURL {
				mainR2URL = rawURL
			}
			continue
		}
		if isSoraTask(task) && rule.asMainURL && mainR2URL != "" {
			taskData[rule.name] = mainR2URL
			dataChanged = true
			continue
		}
		if strings.Contains(sourceURL, "/v1/videos/") {
			continue
		}
		var res service.R2TransferResult
		if isSoraTask(task) && rule.asMainURL && transferChannel != nil {
			res = transferSoraMainURLToR2(ctx, task, transferChannel, rule.fileName, sourceURL)
		} else {
			res = service.TransferFileToR2(ctx, rule.fileName, sourceURL)
		}
		if !res.Success {
			if isSoraTask(task) && rule.asMainURL && transferChannel != nil {
				return nil, fmt.Errorf("transfer %s failed: %w", rule.name, res.Error)
			}
			if rule.asMainURL && strings.Contains(task.FailReason, "/v1/videos/") {
				continue
			}
			return nil, fmt.Errorf("transfer %s failed: %w", rule.name, res.Error)
		}
		taskData[rule.name] = res.R2URL
		dataChanged = true
		if mainR2URL == "" && rule.asMainURL {
			mainR2URL = res.R2URL
		}
	}

	if task.FailReason != "" {
		if service.IsR2URL(task.FailReason) {
			if mainR2URL == "" {
				mainR2URL = task.FailReason
			}
		} else {
			if strings.Contains(task.FailReason, "/v1/videos/") {
				if task.ChannelId != 0 {
					channel, err := model.CacheGetChannel(task.ChannelId)
					if err != nil {
						return nil, fmt.Errorf("get channel for protected transfer failed: %w", err)
					}
					transferChannel = channel
				}
				if transferChannel != nil && transferChannel.Type == constant.ChannelTypeSora {
					fileName := fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID)
					res := transferSoraMainURLToR2(ctx, task, transferChannel, fileName, "")
					if !res.Success {
						return nil, fmt.Errorf("transfer protected main video failed: %w", res.Error)
					}
					task.FailReason = res.R2URL
					if mainR2URL == "" {
						mainR2URL = res.R2URL
					}
				}
			} else {
				fileName := fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID)
				res := service.TransferFileToR2(ctx, fileName, task.FailReason)
				if !res.Success {
					return nil, fmt.Errorf("transfer main video failed: %w", res.Error)
				}
				task.FailReason = res.R2URL
				if mainR2URL == "" {
					mainR2URL = res.R2URL
				}
			}
		}
	}

	if mainR2URL != "" && !service.IsR2URL(task.FailReason) {
		task.FailReason = mainR2URL
	}
	if task.FailReason == "" {
		return task, nil
	}

	if dataChanged {
		newData, err := common.Marshal(taskData)
		if err != nil {
			return nil, fmt.Errorf("marshal r2 task data failed: %w", err)
		}
		task.Data = newData
	}

	task.Status = model.TaskStatusSuccess
	task.Progress = "100%"
	if err := task.Update(); err != nil {
		return nil, fmt.Errorf("save r2 task result failed: %w", err)
	}

	logger.LogInfo(ctx, fmt.Sprintf("task %s query-transfer to R2 finished, url=%s", task.TaskID, task.FailReason))
	return task, nil
}

func waitForR2TransferState(ctx context.Context, taskID string) (*model.Task, error) {
	ticker := time.NewTicker(r2TransferPollDelay)
	defer ticker.Stop()

	for {
		task, exists, err := model.GetByOnlyTaskId(taskID)
		if err != nil {
			return nil, err
		}
		if !exists || task == nil {
			return nil, fmt.Errorf("task %s not found", taskID)
		}
		if !isR2TransferInProgress(task) {
			return task, nil
		}

		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("wait transfer state timeout: %w", ctx.Err())
		case <-ticker.C:
		}
	}
}

func isR2TransferInProgress(task *model.Task) bool {
	return task != nil && task.Status == model.TaskStatusInProgress && task.Progress == "95%"
}

func taskHasR2Result(task *model.Task) bool {
	return taskPrimaryR2URL(task) != ""
}

func taskPrimaryR2URL(task *model.Task) string {
	if task == nil {
		return ""
	}
	if service.IsR2URL(task.FailReason) {
		return task.FailReason
	}
	if len(task.Data) == 0 {
		return ""
	}

	var taskData map[string]interface{}
	if err := common.Unmarshal(task.Data, &taskData); err != nil {
		return ""
	}

	keys := []string{"url", "video_url", "output_url", "image_url", "thumbnail_url"}
	for _, k := range keys {
		v, ok := taskData[k].(string)
		if ok && v != "" && service.IsR2URL(v) {
			return v
		}
	}
	return ""
}

func buildR2TaskDataPayload(task *model.Task) ([]byte, bool) {
	if task == nil || len(task.Data) == 0 {
		return nil, false
	}

	var payload map[string]interface{}
	if err := common.Unmarshal(task.Data, &payload); err != nil || payload == nil {
		return nil, false
	}

	urlKeys := []string{"url", "video_url", "output_url", "image_url", "thumbnail_url"}
	hasR2URL := false
	changed := false
	for _, k := range urlKeys {
		v, ok := payload[k].(string)
		if !ok || strings.TrimSpace(v) == "" {
			continue
		}
		if service.IsR2URL(v) {
			hasR2URL = true
			continue
		}
		delete(payload, k)
		changed = true
	}

	if !hasR2URL {
		r2URL := taskPrimaryR2URL(task)
		if r2URL == "" {
			return nil, false
		}
		payload["video_url"] = r2URL
		hasR2URL = true
		changed = true
	}

	if !hasR2URL {
		return nil, false
	}
	if !changed {
		return task.Data, true
	}

	b, err := common.Marshal(payload)
	if err != nil {
		return nil, false
	}
	return b, true
}

func buildVideoResponse(task *model.Task, onlyR2 bool) *dto.OpenAIVideo {
	video := task.ToOpenAIVideo()
	if !onlyR2 {
		return video
	}

	video.Metadata = nil
	if task != nil && task.Status == model.TaskStatusFailure {
		reason := service.ExtractTaskFailureReason(task.FailReason, task.Data)
		if reason == "" {
			reason = "task failed"
		}
		video.Error = &dto.OpenAIVideoError{
			Message: reason,
			Code:    "task_failed",
		}
		video.SetMetadata("message", reason)
		return video
	}

	if service.IsR2URL(task.FailReason) {
		video.SetMetadata("url", task.FailReason)
	}

	if len(task.Data) > 0 {
		var taskData map[string]interface{}
		if err := common.Unmarshal(task.Data, &taskData); err == nil {
			keys := []string{"video_url", "output_url", "thumbnail_url", "image_url", "url"}
			for _, k := range keys {
				v, ok := taskData[k].(string)
				if ok && v != "" && service.IsR2URL(v) {
					video.SetMetadata(k, v)
				}
			}
		}
	}

	if video.Metadata == nil {
		video.Metadata = map[string]any{}
	}

	// Ensure metadata.url exists when we already have R2 media links.
	if _, ok := video.Metadata["url"]; !ok {
		for _, k := range []string{"video_url", "output_url", "image_url", "thumbnail_url"} {
			if v, ok := video.Metadata[k].(string); ok && v != "" {
				video.SetMetadata("url", v)
				break
			}
		}
	}

	return video
}

func respondR2TransferError(c *gin.Context, task *model.Task, err error) {
	if respondSoraUpstreamFallback(c, task, err) {
		return
	}
	if task == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": err.Error(), "type": "server_error"},
		})
		return
	}

	logger.LogWarn(c.Request.Context(), fmt.Sprintf("R2 transfer failed for task %s: %s", task.TaskID, err.Error()))
	video := buildVideoResponse(task, true)
	video.Status = dto.VideoStatusFailed
	video.Progress = 100
	video.Error = &dto.OpenAIVideoError{
		Message: err.Error(),
		Code:    "r2_transfer_failed",
	}
	video.SetMetadata("message", err.Error())
	c.JSON(http.StatusOK, video)
}

func isSoraTask(task *model.Task) bool {
	if task == nil {
		return false
	}
	if task.Platform == constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeSora)) {
		return true
	}
	if looksLikeSoraModel(task.Properties.OriginModelName) || looksLikeSoraModel(task.Properties.UpstreamModelName) {
		return true
	}
	if task.ChannelId == 0 {
		return taskDataLooksLikeSora(task)
	}
	channel, err := model.CacheGetChannel(task.ChannelId)
	if err == nil && channel != nil && channel.Type == constant.ChannelTypeSora {
		return true
	}
	return taskDataLooksLikeSora(task)
}

func extractSoraUpstreamFallbackURL(task *model.Task) string {
	if task == nil || len(task.Data) == 0 {
		return ""
	}

	var payload map[string]interface{}
	if err := common.Unmarshal(task.Data, &payload); err != nil {
		return ""
	}

	if rawURL := firstNonR2URL(payload, "url", "video_url", "output_url"); rawURL != "" {
		return normalizeSoraUpstreamURL(rawURL)
	}
	if metadata, ok := payload["metadata"].(map[string]interface{}); ok {
		if rawURL := firstNonR2URL(metadata, "url", "video_url", "output_url"); rawURL != "" {
			return normalizeSoraUpstreamURL(rawURL)
		}
	}
	if response, ok := payload["response"].(map[string]interface{}); ok {
		if rawURL := firstNonR2URL(response, "url", "video_url", "output_url"); rawURL != "" {
			return normalizeSoraUpstreamURL(rawURL)
		}
	}
	return ""
}

func firstNonR2URL(payload map[string]interface{}, keys ...string) string {
	if payload == nil {
		return ""
	}
	for _, key := range keys {
		if rawURL, ok := payload[key].(string); ok && strings.TrimSpace(rawURL) != "" && !service.IsR2URL(rawURL) {
			return rawURL
		}
	}
	return ""
}

func looksLikeSoraModel(modelName string) bool {
	return strings.Contains(strings.ToLower(strings.TrimSpace(modelName)), "sora")
}

func taskDataLooksLikeSora(task *model.Task) bool {
	if task == nil || len(task.Data) == 0 {
		return false
	}

	var payload map[string]interface{}
	if err := common.Unmarshal(task.Data, &payload); err != nil {
		return false
	}

	if modelName, ok := payload["model"].(string); ok && looksLikeSoraModel(modelName) {
		return true
	}
	if metadata, ok := payload["metadata"].(map[string]interface{}); ok {
		if permalink, ok := metadata["permalink"].(string); ok && strings.Contains(strings.ToLower(permalink), "sora") {
			return true
		}
	}
	return false
}

func normalizeSoraUpstreamURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	rawURL = strings.Replace(rawURL, "https://videos.fluxai.us.ci/videos.openai.com/", "https://videos.openai.com/", 1)
	rawURL = strings.Replace(rawURL, "http://videos.fluxai.us.ci/videos.openai.com/", "https://videos.openai.com/", 1)
	return rawURL
}

func buildSoraUpstreamFallbackPayload(task *model.Task) ([]byte, bool) {
	if !isSoraTask(task) || len(task.Data) == 0 {
		return nil, false
	}

	var payload map[string]interface{}
	if err := common.Unmarshal(task.Data, &payload); err != nil || payload == nil {
		return nil, false
	}

	fallbackURL := extractSoraUpstreamFallbackURL(task)
	if fallbackURL == "" {
		return nil, false
	}

	delete(payload, "error")
	payload["url"] = fallbackURL
	for _, key := range []string{"video_url", "output_url"} {
		if rawURL, ok := payload[key].(string); ok && strings.TrimSpace(rawURL) != "" {
			payload[key] = normalizeSoraUpstreamURL(rawURL)
		}
	}
	if metadata, ok := payload["metadata"].(map[string]interface{}); ok {
		delete(metadata, "permalink")
		if len(metadata) == 0 {
			delete(payload, "metadata")
		}
	}
	b, err := common.Marshal(payload)
	if err != nil {
		return nil, false
	}
	return b, true
}

func respondSoraUpstreamFallback(c *gin.Context, task *model.Task, cause error) bool {
	payload, ok := buildSoraUpstreamFallbackPayload(task)
	if !ok {
		return false
	}
	logger.LogWarn(c.Request.Context(), fmt.Sprintf("task %s fallback to upstream sora url after r2 transfer error: %s", task.TaskID, cause.Error()))
	c.Data(http.StatusOK, "application/json", payload)
	return true
}

func VideoProxy(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"message": "task_id is required",
				"type":    "invalid_request_error",
			},
		})
		return
	}

	task, exists, err := model.GetByOnlyTaskId(taskID)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to query task %s: %s", taskID, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to query task",
				"type":    "server_error",
			},
		})
		return
	}
	if !exists || task == nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to get task %s: %v", taskID, err))
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "Task not found",
				"type":    "invalid_request_error",
			},
		})
		return
	}

	if task.Status != model.TaskStatusSuccess {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"message": fmt.Sprintf("Task is not completed yet, current status: %s", task.Status),
				"type":    "invalid_request_error",
			},
		})
		return
	}

	// When query interception is enabled, /content must not expose upstream URL.
	if storage_setting.IsVideoR2Enabled() {
		waitCtx, cancel := context.WithTimeout(c.Request.Context(), r2TransferWaitTimeout)
		defer cancel()

		if isR2TransferInProgress(task) {
			nextTask, waitErr := waitForR2TransferState(waitCtx, task.TaskID)
			if waitErr != nil {
				if isSoraTask(task) {
					if fallbackURL := extractSoraUpstreamFallbackURL(task); fallbackURL != "" {
						c.Redirect(http.StatusFound, fallbackURL)
						return
					}
				}
				c.JSON(http.StatusBadGateway, gin.H{
					"error": gin.H{
						"message": fmt.Sprintf("R2 transfer pending: %s", waitErr.Error()),
						"type":    "server_error",
					},
				})
				return
			}
			task = nextTask
		}

		if !service.IsR2URL(task.FailReason) {
			nextTask, transferErr := ensureTaskTransferredToR2(waitCtx, task.TaskID)
			if transferErr != nil {
				if isSoraTask(task) {
					if fallbackURL := extractSoraUpstreamFallbackURL(task); fallbackURL != "" {
						c.Redirect(http.StatusFound, fallbackURL)
						return
					}
				}
				c.JSON(http.StatusBadGateway, gin.H{
					"error": gin.H{
						"message": fmt.Sprintf("R2 transfer failed: %s", transferErr.Error()),
						"type":    "server_error",
					},
				})
				return
			}
			task = nextTask
		}

		r2URL := taskPrimaryR2URL(task)
		if r2URL != "" {
			c.Redirect(http.StatusFound, r2URL)
			return
		}
		if isSoraTask(task) {
			if fallbackURL := extractSoraUpstreamFallbackURL(task); fallbackURL != "" {
				c.Redirect(http.StatusFound, fallbackURL)
				return
			}
		}
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "R2 transfer failed: r2 url not available after transfer",
				"type":    "server_error",
			},
		})
		return
	}

	// R2 URL -> 302 redirect, zero server bandwidth
	if r2URL := taskPrimaryR2URL(task); r2URL != "" {
		c.Redirect(http.StatusFound, r2URL)
		return
	}

	// Video expired: FailReason was cleared by R2 cleanup task
	// Only check for R2 platforms - Sora/Gemini may have empty FailReason normally.
	if task.FailReason == "" {
		ch, chErr := model.CacheGetChannel(task.ChannelId)
		if chErr == nil && storage_setting.GetPlatformPrefix(ch.Type) != "unknown" {
			c.JSON(http.StatusGone, gin.H{
				"error": gin.H{
					"message": "video expired",
					"type":    "video_expired",
				},
			})
			return
		}
	}

	channel, err := model.CacheGetChannel(task.ChannelId)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to get task %s: not found", taskID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to retrieve channel information",
				"type":    "server_error",
			},
		})
		return
	}
	baseURL := channel.GetBaseURL()
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}

	var videoURL string
	proxy := channel.GetSetting().Proxy
	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to create proxy client for task %s: %s", taskID, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to create proxy client",
				"type":    "server_error",
			},
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "", nil)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to create request: %s", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to create proxy request",
				"type":    "server_error",
			},
		})
		return
	}

	switch channel.Type {
	case constant.ChannelTypeGemini:
		apiKey := task.PrivateData.Key
		if apiKey == "" {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Missing stored API key for Gemini task %s", taskID))
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "API key not stored for task",
					"type":    "server_error",
				},
			})
			return
		}

		videoURL, err = getGeminiVideoURL(channel, task, apiKey)
		if err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to resolve Gemini video URL for task %s: %s", taskID, err.Error()))
			c.JSON(http.StatusBadGateway, gin.H{
				"error": gin.H{
					"message": "Failed to resolve Gemini video URL",
					"type":    "server_error",
				},
			})
			return
		}
		req.Header.Set("x-goog-api-key", apiKey)
	case constant.ChannelTypeOpenAI, constant.ChannelTypeSora:
		videoURL = fmt.Sprintf("%s/v1/videos/%s/content", baseURL, task.TaskID)
		req.Header.Set("Authorization", "Bearer "+channel.Key)
	default:
		videoURL = task.FailReason
	}

	req.URL, err = url.Parse(videoURL)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to parse URL %s: %s", videoURL, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to create proxy request",
				"type":    "server_error",
			},
		})
		return
	}

	resp, err := client.Do(req)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to fetch video from %s: %s", videoURL, err.Error()))
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "Failed to fetch video content",
				"type":    "server_error",
			},
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Upstream returned status %d for %s", resp.StatusCode, videoURL))
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": fmt.Sprintf("Upstream service returned status %d", resp.StatusCode),
				"type":    "server_error",
			},
		})
		return
	}

	for key, values := range resp.Header {
		for _, value := range values {
			c.Writer.Header().Add(key, value)
		}
	}

	c.Writer.Header().Set("Cache-Control", "public, max-age=86400")
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = io.Copy(c.Writer, resp.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to stream video content: %s", err.Error()))
	}
}
