package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

const (
	openAIVideoProbeTimeout       = 20 * time.Second
	openAIVideoTaskNotFoundGrace  = 20 * time.Minute
)

func IsOpenAIVideoTaskChannel(channelType int) bool {
	return channelType == constant.ChannelTypeOpenAI || channelType == constant.ChannelTypeSora
}

func ParseOpenAIVideoTaskNotFound(respBody []byte) (string, bool) {
	if len(respBody) == 0 {
		return "", false
	}

	var payload map[string]any
	if err := common.Unmarshal(respBody, &payload); err != nil {
		return "", false
	}

	reason := strings.TrimSpace(firstOpenAIVideoString(payload, "message", "reason"))
	code := strings.ToLower(strings.TrimSpace(firstOpenAIVideoString(payload, "code")))

	if errObj, ok := payload["error"].(map[string]any); ok {
		if reason == "" {
			reason = strings.TrimSpace(firstOpenAIVideoString(errObj, "message", "reason"))
		}
		if code == "" {
			code = strings.ToLower(strings.TrimSpace(firstOpenAIVideoString(errObj, "code", "type")))
		}
	}

	switch code {
	case "task_not_exist", "task_not_found", "not_found":
		if reason == "" {
			reason = code
		}
		return reason, true
	}

	switch strings.ToLower(reason) {
	case "task_not_exist", "task_not_found", "not_found":
		return reason, true
	}

	return "", false
}

func ProbeOpenAIVideoContentAvailable(ctx context.Context, protectedURL, apiKey, proxy string) (bool, error) {
	protectedURL = strings.TrimSpace(protectedURL)
	apiKey = strings.TrimSpace(apiKey)
	if protectedURL == "" {
		return false, fmt.Errorf("protected content url is empty")
	}
	if apiKey == "" {
		return false, fmt.Errorf("api key is empty")
	}

	if ctx == nil {
		ctx = context.Background()
	}
	probeCtx, cancel := context.WithTimeout(ctx, openAIVideoProbeTimeout)
	defer cancel()

	client, err := GetHttpClientWithProxy(proxy)
	if err != nil {
		return false, fmt.Errorf("create probe client failed: %w", err)
	}

	req, err := http.NewRequestWithContext(probeCtx, http.MethodGet, protectedURL, nil)
	if err != nil {
		return false, fmt.Errorf("create probe request failed: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Range", "bytes=0-0")

	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("probe content request failed: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK, http.StatusPartialContent:
		return true, nil
	case http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound:
		return false, nil
	default:
		return false, fmt.Errorf("probe content returned status %d", resp.StatusCode)
	}
}

func LocalOpenAIVideoContentURL(taskID string) string {
	taskID = strings.TrimSpace(taskID)
	if taskID == "" {
		return ""
	}
	return fmt.Sprintf("%s/v1/videos/%s/content", system_setting.ServerAddress, taskID)
}

func BuildSyntheticOpenAIVideoTaskPayload(task *model.Task, status, videoURL, reason string, completedAt int64) ([]byte, error) {
	if task == nil {
		return nil, fmt.Errorf("task is nil")
	}

	status = strings.ToLower(strings.TrimSpace(status))
	if status != "completed" && status != "failed" {
		return nil, fmt.Errorf("unsupported synthetic status: %s", status)
	}

	if completedAt <= 0 {
		completedAt = time.Now().Unix()
	}

	payload := map[string]any{
		"id":         task.TaskID,
		"task_id":    task.TaskID,
		"object":     "video",
		"status":     status,
		"progress":   100,
		"created_at": task.CreatedAt,
	}
	if completedAt > 0 {
		payload["completed_at"] = completedAt
	}

	modelName := strings.TrimSpace(task.Properties.OriginModelName)
	if modelName == "" {
		modelName = strings.TrimSpace(task.Properties.UpstreamModelName)
	}
	if modelName != "" {
		payload["model"] = modelName
	}

	if status == "completed" {
		videoURL = strings.TrimSpace(videoURL)
		if videoURL != "" {
			payload["video_url"] = videoURL
			payload["url"] = videoURL
			payload["output_url"] = videoURL
			payload["metadata"] = map[string]any{
				"url": videoURL,
			}
		}
	}

	if status == "failed" {
		reason = strings.TrimSpace(reason)
		if reason == "" {
			reason = "task_not_exist"
		}
		payload["error"] = map[string]any{
			"message": reason,
			"code":    "task_not_exist",
		}
	}

	return common.Marshal(payload)
}

func BuildSyntheticOpenAIVideoPendingPayload(task *model.Task) ([]byte, string, string, error) {
	if task == nil {
		return nil, "", "", fmt.Errorf("task is nil")
	}

	status := "queued"
	taskStatus := string(model.TaskStatusQueued)
	progress := 20
	now := time.Now().Unix()
	elapsed := int64(0)
	baseTime := task.SubmitTime
	if baseTime <= 0 {
		baseTime = task.CreatedAt
	}
	if baseTime > 0 {
		elapsed = now - baseTime
	}

	if task.StartTime > 0 || task.Status == model.TaskStatusInProgress || elapsed >= 60 {
		status = "processing"
		taskStatus = string(model.TaskStatusInProgress)
		progress = 30
	}

	if parsedProgress, ok := parseOpenAIVideoProgressString(task.Progress); ok {
		if parsedProgress > 0 && parsedProgress < 100 {
			if parsedProgress > progress {
				progress = parsedProgress
			}
			if progress >= 30 {
				status = "processing"
				taskStatus = string(model.TaskStatusInProgress)
			}
		}
	}

	payload := map[string]any{
		"id":         task.TaskID,
		"task_id":    task.TaskID,
		"object":     "video",
		"status":     status,
		"progress":   progress,
		"created_at": task.CreatedAt,
	}

	modelName := strings.TrimSpace(task.Properties.OriginModelName)
	if modelName == "" {
		modelName = strings.TrimSpace(task.Properties.UpstreamModelName)
	}
	if modelName != "" {
		payload["model"] = modelName
	}

	body, err := common.Marshal(payload)
	if err != nil {
		return nil, "", "", err
	}
	return body, taskStatus, fmt.Sprintf("%d%%", progress), nil
}

func ShouldFailOpenAIVideoTaskNotFound(task *model.Task, now int64) bool {
	if task == nil {
		return false
	}
	if now <= 0 {
		now = time.Now().Unix()
	}

	baseTime := task.SubmitTime
	if baseTime <= 0 {
		baseTime = task.CreatedAt
	}
	if baseTime <= 0 {
		return false
	}

	return now-baseTime >= int64(openAIVideoTaskNotFoundGrace/time.Second)
}

func parseOpenAIVideoProgressString(progress string) (int, bool) {
	progress = strings.TrimSpace(strings.TrimSuffix(progress, "%"))
	if progress == "" {
		return 0, false
	}
	value, err := strconv.Atoi(progress)
	if err != nil {
		return 0, false
	}
	if value < 0 {
		value = 0
	}
	if value > 100 {
		value = 100
	}
	return value, true
}

func firstOpenAIVideoString(payload map[string]any, keys ...string) string {
	if payload == nil {
		return ""
	}
	for _, key := range keys {
		value, ok := payload[key]
		if !ok {
			continue
		}
		switch typed := value.(type) {
		case string:
			if s := strings.TrimSpace(typed); s != "" {
				return s
			}
		default:
			if s := strings.TrimSpace(fmt.Sprintf("%v", typed)); s != "" && s != "<nil>" {
				return s
			}
		}
	}
	return ""
}
