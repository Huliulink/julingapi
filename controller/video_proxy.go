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

// GetVideoTaskStatus handles async video task queries and always prefers
// channel-compatible response shapes over internal unified task views.
func GetVideoTaskStatus(c *gin.Context) {
	taskID := getVideoTaskID(c)
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "task_id is required", "type": "invalid_request_error"},
		})
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

	if task.Status != model.TaskStatusSuccess && task.Status != model.TaskStatusFailure {
		if refreshedTask, refreshErr := refreshVideoTaskStatus(c.Request.Context(), task); refreshErr != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("refresh video task %s before response failed: %v", taskID, refreshErr))
		} else if refreshedTask != nil {
			task = refreshedTask
		}
	}

	if !storage_setting.IsVideoR2Enabled() {
		respondVideoTaskStatus(c, task, false)
		return
	}

	waitCtx, cancel := context.WithTimeout(c.Request.Context(), r2TransferWaitTimeout)
	defer cancel()

	if isR2TransferInProgress(task) {
		nextTask, waitErr := waitForR2TransferState(waitCtx, task.TaskID)
		if waitErr == nil && nextTask != nil {
			task = nextTask
		} else {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("task %s wait R2 state timeout, keep compatible processing response: %v", task.TaskID, waitErr))
			respondVideoTaskStatus(c, cloneTaskWithR2Pending(task), true)
			return
		}
	}

	if task.Status == model.TaskStatusSuccess && !taskHasR2Result(task) {
		if pendingTask, markErr := markTaskR2TransferPending(task); markErr == nil && pendingTask != nil {
			task = pendingTask
		} else if markErr != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("task %s mark R2 pending failed: %v", task.TaskID, markErr))
		}
		triggerTaskTransferToR2(task.TaskID)
		respondVideoTaskStatus(c, cloneTaskWithR2Pending(task), true)
		return
	}

	respondVideoTaskStatus(c, task, true)
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

		if taskHasR2Result(task) {
			return task, nil
		}
		if task.Status != model.TaskStatusSuccess && !isR2TransferInProgress(task) {
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
	return task != nil && task.Status == model.TaskStatusInProgress && task.Progress == "95%" && task.FailReason == ""
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

func getVideoTaskID(c *gin.Context) string {
	if taskID := strings.TrimSpace(c.Param("task_id")); taskID != "" {
		return taskID
	}
	if taskID := strings.TrimSpace(c.Param("file_id")); taskID != "" {
		return taskID
	}
	if taskID := strings.TrimSpace(c.GetString("task_id")); taskID != "" {
		return taskID
	}
	return strings.TrimSpace(c.Query("task_id"))
}

func refreshVideoTaskStatus(ctx context.Context, task *model.Task) (*model.Task, error) {
	if task == nil {
		return nil, fmt.Errorf("task is nil")
	}
	if task.ChannelId == 0 {
		return task, nil
	}

	channelModel, err := model.CacheGetChannel(task.ChannelId)
	if err != nil {
		return nil, fmt.Errorf("get channel failed: %w", err)
	}

	adaptor := relay.GetTaskAdaptor(constant.TaskPlatform(strconv.Itoa(channelModel.Type)))
	if adaptor == nil {
		return task, nil
	}

	taskMap := map[string]*model.Task{
		task.TaskID: task,
	}
	if err := updateVideoSingleTask(ctx, adaptor, channelModel, task.TaskID, taskMap); err != nil {
		return nil, err
	}
	return task, nil
}

func respondVideoTaskStatus(c *gin.Context, task *model.Task, preferR2 bool) {
	if shouldUseCompatibleVideoTaskResponse(c, task) {
		respondCompatibleVideoTask(c, task, preferR2)
		return
	}

	respondVideoTaskStatusFallback(c, task, preferR2)
}

func shouldUseCompatibleVideoTaskResponse(c *gin.Context, task *model.Task) bool {
	if c == nil || task == nil {
		return false
	}
	path := c.FullPath()
	if path == "" {
		path = c.Request.URL.Path
	}
	channelType := service.ResolveTaskChannelType(task)
	if strings.HasPrefix(path, "/v1/videos/") {
		switch channelType {
		case constant.ChannelTypeSora, constant.ChannelTypeOpenAI, constant.ChannelTypeXai:
			return true
		default:
			return false
		}
	}
	if strings.HasPrefix(path, "/kling/") || strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/jimeng") || path == "/v1/query/video_generation" {
		return true
	}
	return false
}

func respondCompatibleVideoTask(c *gin.Context, task *model.Task, preferR2 bool) {
	if payload, ok, err := service.BuildCompatibleVideoTaskResponse(task, service.VideoTaskCompatOptions{PreferR2: preferR2}); err == nil && ok {
		c.Data(http.StatusOK, "application/json", payload)
		return
	} else if err != nil && task != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("build compatible video payload failed for task %s: %v", task.TaskID, err))
	}
	respondVideoTaskStatusFallback(c, task, preferR2)
}

func respondVideoTaskStatusFallback(c *gin.Context, task *model.Task, preferR2 bool) {
	video := buildVideoResponse(task, preferR2)
	if task != nil && task.Status == model.TaskStatusInProgress && task.Progress == "95%" {
		video.SetMetadata("message", "video transfer in progress")
	}
	c.JSON(http.StatusOK, video)
}

func cloneTaskWithR2Pending(task *model.Task) *model.Task {
	if task == nil {
		return nil
	}
	clone := *task
	clone.Status = model.TaskStatusInProgress
	clone.Progress = "95%"
	return &clone
}

func markTaskR2TransferPending(task *model.Task) (*model.Task, error) {
	if task == nil {
		return nil, fmt.Errorf("task is nil")
	}
	if taskHasR2Result(task) || isR2TransferInProgress(task) {
		return task, nil
	}
	if task.Status != model.TaskStatusSuccess {
		return task, nil
	}
	task.Status = model.TaskStatusInProgress
	task.Progress = "95%"
	if err := task.Update(); err != nil {
		task.Status = model.TaskStatusSuccess
		task.Progress = "100%"
		return nil, err
	}
	return task, nil
}

func triggerTaskTransferToR2(taskID string) {
	if strings.TrimSpace(taskID) == "" {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), r2TransferWaitTimeout)
		defer cancel()
		if _, err := ensureTaskTransferredToR2(ctx, taskID); err != nil {
			restoreTaskAfterR2TransferFailure(taskID, err)
			logger.LogWarn(ctx, fmt.Sprintf("async R2 transfer for task %s not finished yet: %v", taskID, err))
		}
	}()
}

func restoreTaskAfterR2TransferFailure(taskID string, cause error) {
	task, exists, err := model.GetByOnlyTaskId(taskID)
	if err != nil || !exists || task == nil {
		return
	}
	if !isR2TransferInProgress(task) {
		return
	}
	task.Status = model.TaskStatusSuccess
	task.Progress = "100%"
	if updateErr := task.Update(); updateErr != nil {
		logger.LogWarn(context.Background(), fmt.Sprintf("restore task %s after R2 transfer failure failed: %v", taskID, updateErr))
		return
	}
	logger.LogWarn(context.Background(), fmt.Sprintf("restored task %s to success after R2 transfer failure: %v", taskID, cause))
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
	taskID := getVideoTaskID(c)
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

	// When query interception is enabled, /content must not expose upstream URL.
	if storage_setting.IsVideoR2Enabled() {
		waitCtx, cancel := context.WithTimeout(c.Request.Context(), r2TransferWaitTimeout)
		defer cancel()

		if task.Status == model.TaskStatusSuccess && !taskHasR2Result(task) {
			if _, markErr := markTaskR2TransferPending(task); markErr != nil {
				logger.LogWarn(c.Request.Context(), fmt.Sprintf("task %s mark R2 pending for content failed: %v", task.TaskID, markErr))
			}
			triggerTaskTransferToR2(task.TaskID)
		}

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

		if task.Status != model.TaskStatusSuccess {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"message": fmt.Sprintf("Task is not completed yet, current status: %s", task.Status),
					"type":    "invalid_request_error",
				},
			})
			return
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

	if task.Status != model.TaskStatusSuccess {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"message": fmt.Sprintf("Task is not completed yet, current status: %s", task.Status),
				"type":    "invalid_request_error",
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

func RetrieveVideoFile(c *gin.Context) {
	fileID := strings.TrimSpace(c.Query("file_id"))
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"base_resp": gin.H{
				"status_code": 400,
				"status_msg":  "file_id is required",
			},
		})
		return
	}

	task, exists, err := model.GetByOnlyTaskId(fileID)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("RetrieveVideoFile query error for %s: %s", fileID, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"base_resp": gin.H{
				"status_code": 500,
				"status_msg":  "failed to query task",
			},
		})
		return
	}
	if !exists || task == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"base_resp": gin.H{
				"status_code": 404,
				"status_msg":  "task not found",
			},
		})
		return
	}

	preferR2 := storage_setting.IsVideoR2Enabled()
	if preferR2 && task.Status == model.TaskStatusSuccess && !taskHasR2Result(task) {
		if _, markErr := markTaskR2TransferPending(task); markErr != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("task %s mark R2 pending for retrieve failed: %v", task.TaskID, markErr))
		}
		triggerTaskTransferToR2(task.TaskID)
	}

	url := service.ResolveHailuoCompatibleFileURL(task, service.VideoTaskCompatOptions{PreferR2: preferR2})
	if url == "" && preferR2 && isR2TransferInProgress(task) {
		waitCtx, cancel := context.WithTimeout(c.Request.Context(), r2TransferWaitTimeout)
		defer cancel()
		if nextTask, waitErr := waitForR2TransferState(waitCtx, task.TaskID); waitErr == nil && nextTask != nil {
			task = nextTask
			url = service.ResolveHailuoCompatibleFileURL(task, service.VideoTaskCompatOptions{PreferR2: preferR2})
		}
	}
	if url == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"base_resp": gin.H{
				"status_code": 400,
				"status_msg":  "video file is not ready",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file": gin.H{
			"file_id":      task.TaskID,
			"download_url": url,
		},
		"base_resp": gin.H{
			"status_code": 0,
			"status_msg":  "success",
		},
	})
}
