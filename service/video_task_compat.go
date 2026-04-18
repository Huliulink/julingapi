package service

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

func ParseCompatibleVideoTaskResult(respBody []byte) (*relaycommon.TaskInfo, []byte, bool, error) {
	payload, ok, err := compatibleVideoPayload(respBody)
	if err != nil || !ok {
		return nil, nil, ok, err
	}

	taskInfo := &relaycommon.TaskInfo{
		Code:   0,
		TaskID: firstPayloadString(payload, "task_id", "id"),
		Url:    extractCompatibleVideoURL(payload),
		Reason: extractCompatibleVideoReason(payload),
	}

	progressValue, progressOK := extractCompatibleVideoProgress(payload)
	rawStatus := strings.ToLower(strings.TrimSpace(firstPayloadString(payload, "status")))
	switch rawStatus {
	case "submitted":
		taskInfo.Status = model.TaskStatusSubmitted
	case "queued", "pending":
		taskInfo.Status = model.TaskStatusQueued
	case "processing", "running", "in_progress":
		taskInfo.Status = model.TaskStatusInProgress
	case "completed", "done", "succeeded", "success":
		if strings.TrimSpace(taskInfo.Url) == "" {
			taskInfo.Status = model.TaskStatusInProgress
			taskInfo.Progress = "95%"
		} else {
			taskInfo.Status = model.TaskStatusSuccess
			taskInfo.Progress = "100%"
		}
	case "failed", "fail", "error", "aborted", "canceled", "cancelled":
		taskInfo.Status = model.TaskStatusFailure
		taskInfo.Progress = "100%"
		if strings.TrimSpace(taskInfo.Reason) == "" {
			taskInfo.Reason = "task failed"
		}
	case "unknown", "":
		if strings.TrimSpace(taskInfo.Url) != "" {
			taskInfo.Status = model.TaskStatusSuccess
			taskInfo.Progress = "100%"
		} else {
			taskInfo.Status = model.TaskStatusInProgress
		}
	default:
		if strings.TrimSpace(taskInfo.Url) != "" {
			taskInfo.Status = model.TaskStatusSuccess
			taskInfo.Progress = "100%"
		} else {
			taskInfo.Status = model.TaskStatusInProgress
		}
	}

	if taskInfo.Progress == "" && progressOK {
		taskInfo.Progress = fmt.Sprintf("%d%%", progressValue)
	}
	if taskInfo.Progress == "" {
		switch taskInfo.Status {
		case model.TaskStatusSubmitted:
			taskInfo.Progress = "10%"
		case model.TaskStatusQueued:
			taskInfo.Progress = "20%"
		case model.TaskStatusInProgress:
			if progressOK {
				taskInfo.Progress = fmt.Sprintf("%d%%", progressValue)
			} else {
				taskInfo.Progress = "30%"
			}
		case model.TaskStatusSuccess, model.TaskStatusFailure:
			taskInfo.Progress = "100%"
		}
	}

	normalizedBody, err := NormalizeCompatibleVideoPayload(payload, taskInfo, nil)
	if err != nil {
		return nil, nil, false, err
	}
	return taskInfo, normalizedBody, true, nil
}

func PreferredUpstreamVideoTaskID(task *model.Task) string {
	if task == nil {
		return ""
	}
	if upstreamTaskID := strings.TrimSpace(task.PrivateData.UpstreamTaskID); upstreamTaskID != "" {
		return upstreamTaskID
	}
	if len(task.Data) > 0 {
		if upstreamTaskID := ExtractUpstreamVideoTaskID(task.Data, task.TaskID); upstreamTaskID != "" {
			return upstreamTaskID
		}
	}
	return strings.TrimSpace(task.TaskID)
}

func PreferredUpstreamVideoBaseURL(task *model.Task, fallback string) string {
	if task != nil {
		if baseURL := normalizeUpstreamVideoBaseURL(task.PrivateData.UpstreamBaseURL); baseURL != "" {
			return baseURL
		}
		if len(task.Data) > 0 {
			if baseURL := ExtractUpstreamVideoBaseURL(task.Data); baseURL != "" {
				return baseURL
			}
		}
	}
	return normalizeUpstreamVideoBaseURL(fallback)
}

func ExtractUpstreamVideoTaskID(respBody []byte, localTaskID string) string {
	payload, ok, err := compatibleVideoPayload(respBody)
	if err == nil && ok {
		return chooseUpstreamVideoTaskID(payload, localTaskID)
	}

	var raw map[string]any
	if err := common.Unmarshal(respBody, &raw); err != nil {
		return ""
	}
	if upstreamTaskID := chooseUpstreamVideoTaskID(raw, localTaskID); upstreamTaskID != "" {
		return upstreamTaskID
	}
	if data, ok := raw["data"].(map[string]any); ok {
		return chooseUpstreamVideoTaskID(data, localTaskID)
	}
	return ""
}

func ExtractUpstreamVideoBaseURL(respBody []byte) string {
	payload, ok, err := compatibleVideoPayload(respBody)
	if err == nil && ok {
		return chooseUpstreamVideoBaseURL(payload)
	}

	var raw map[string]any
	if err := common.Unmarshal(respBody, &raw); err != nil {
		return ""
	}
	if baseURL := chooseUpstreamVideoBaseURL(raw); baseURL != "" {
		return baseURL
	}
	if data, ok := raw["data"].(map[string]any); ok {
		return chooseUpstreamVideoBaseURL(data)
	}
	return ""
}

func NormalizeCompatibleVideoTaskBody(respBody []byte, taskInfo *relaycommon.TaskInfo, task *model.Task) ([]byte, bool, error) {
	payload, ok, err := compatibleVideoPayload(respBody)
	if err != nil || !ok {
		return nil, ok, err
	}
	normalizedBody, err := NormalizeCompatibleVideoPayload(payload, taskInfo, task)
	if err != nil {
		return nil, false, err
	}
	return normalizedBody, true, nil
}

func NormalizeCompatibleVideoPayload(rawPayload map[string]any, taskInfo *relaycommon.TaskInfo, task *model.Task) ([]byte, error) {
	if rawPayload == nil {
		return nil, fmt.Errorf("video payload is nil")
	}

	payload := clonePayloadMap(rawPayload)
	if payload == nil {
		return nil, fmt.Errorf("video payload is empty")
	}

	if task != nil && strings.TrimSpace(task.TaskID) != "" {
		payload["id"] = task.TaskID
		payload["task_id"] = task.TaskID
	} else if taskInfo != nil && strings.TrimSpace(taskInfo.TaskID) != "" {
		payload["id"] = taskInfo.TaskID
		payload["task_id"] = taskInfo.TaskID
	} else if id := firstPayloadString(payload, "id", "task_id"); id != "" {
		payload["id"] = id
		payload["task_id"] = id
	}

	if strings.TrimSpace(firstPayloadString(payload, "object")) == "" {
		payload["object"] = "video"
	}

	if strings.TrimSpace(firstPayloadString(payload, "model")) == "" && task != nil {
		modelName := strings.TrimSpace(task.Properties.OriginModelName)
		if modelName == "" {
			modelName = strings.TrimSpace(task.Properties.UpstreamModelName)
		}
		if modelName != "" {
			payload["model"] = modelName
		}
	}

	status := compatibleStatusToOpenAI(taskInfo, task)
	if status != "" {
		payload["status"] = status
	}

	if progressValue, ok := extractCompatibleVideoProgress(payload); ok {
		payload["progress"] = progressValue
	} else {
		payload["progress"] = compatibleProgressValue(taskInfo, task)
	}

	if _, ok := payload["created_at"]; !ok && task != nil && task.CreatedAt > 0 {
		payload["created_at"] = task.CreatedAt
	}
	if _, ok := payload["completed_at"]; !ok && task != nil {
		if task.FinishTime > 0 {
			payload["completed_at"] = task.FinishTime
		} else if task.UpdatedAt > 0 {
			payload["completed_at"] = task.UpdatedAt
		}
	}

	urlValue := preferredCompatibleVideoURL(payload, taskInfo, task)
	if urlValue != "" {
		payload["video_url"] = urlValue
		if _, ok := payload["url"]; ok || IsR2URL(urlValue) {
			payload["url"] = urlValue
		}
		if _, ok := payload["output_url"]; ok || IsR2URL(urlValue) {
			payload["output_url"] = urlValue
		}
		metadata := ensurePayloadMap(payload, "metadata")
		metadata["url"] = urlValue
		if IsR2URL(urlValue) {
			rewriteCompatibleVideoURLs(metadata, urlValue)
			if content, ok := payload["content"].(map[string]any); ok {
				rewriteCompatibleVideoURLs(content, urlValue)
			}
			if response, ok := payload["response"].(map[string]any); ok {
				rewriteCompatibleVideoURLs(response, urlValue)
			}
		}
	}

	for _, key := range []string{"metadata", "content", "response"} {
		child, ok := payload[key].(map[string]any)
		if !ok || child == nil {
			continue
		}
		rewriteCompatibleNestedTaskFields(child, task, status)
	}

	if task != nil {
		metadata := ensurePayloadMap(payload, "metadata")
		if upstreamTaskID := PreferredUpstreamVideoTaskID(task); upstreamTaskID != "" && upstreamTaskID != strings.TrimSpace(task.TaskID) {
			metadata["upstream_task_id"] = upstreamTaskID
		}
		if upstreamBaseURL := PreferredUpstreamVideoBaseURL(task, ""); upstreamBaseURL != "" {
			metadata["upstream_base_url"] = upstreamBaseURL
		}
	}

	reason := extractCompatibleVideoReason(payload)
	if reason == "" && taskInfo != nil {
		reason = strings.TrimSpace(taskInfo.Reason)
	}
	if reason == "" && task != nil {
		reason = ExtractTaskFailureReason(task.FailReason, task.Data)
	}
	if status == dto.VideoStatusFailed && reason != "" {
		payload["error"] = map[string]any{
			"message": reason,
			"code":    "task_failed",
		}
	}

	return common.Marshal(payload)
}

func rewriteCompatibleNestedTaskFields(payload map[string]any, task *model.Task, status string) {
	if payload == nil {
		return
	}
	if task != nil && strings.TrimSpace(task.TaskID) != "" {
		for _, key := range []string{"id", "task_id"} {
			if _, ok := payload[key]; ok {
				payload[key] = task.TaskID
			}
		}
	}
	if status != "" {
		if _, ok := payload["status"]; ok {
			payload["status"] = status
		}
	}
}

func compatibleVideoPayload(respBody []byte) (map[string]any, bool, error) {
	var payload map[string]any
	if err := common.Unmarshal(respBody, &payload); err != nil {
		return nil, false, err
	}
	if looksLikeCompatibleVideoPayload(payload) {
		return payload, true, nil
	}
	if data, ok := payload["data"].(map[string]any); ok && looksLikeCompatibleVideoPayload(data) {
		return data, true, nil
	}
	return nil, false, nil
}

func chooseUpstreamVideoTaskID(payload map[string]any, localTaskID string) string {
	localTaskID = strings.TrimSpace(localTaskID)
	if payload == nil {
		return ""
	}
	if upstreamTaskID := strings.TrimSpace(firstPayloadString(payload, "upstream_task_id")); upstreamTaskID != "" && upstreamTaskID != localTaskID {
		return upstreamTaskID
	}
	for _, key := range []string{"task_id", "id"} {
		if upstreamTaskID := strings.TrimSpace(firstPayloadString(payload, key)); upstreamTaskID != "" && upstreamTaskID != localTaskID {
			return upstreamTaskID
		}
	}
	if metadata, ok := payload["metadata"].(map[string]any); ok {
		if upstreamTaskID := strings.TrimSpace(firstPayloadString(metadata, "upstream_task_id")); upstreamTaskID != "" && upstreamTaskID != localTaskID {
			return upstreamTaskID
		}
		for _, key := range []string{"task_id", "id"} {
			if upstreamTaskID := strings.TrimSpace(firstPayloadString(metadata, key)); upstreamTaskID != "" && upstreamTaskID != localTaskID {
				return upstreamTaskID
			}
		}
	}
	if response, ok := payload["response"].(map[string]any); ok {
		if upstreamTaskID := strings.TrimSpace(firstPayloadString(response, "upstream_task_id")); upstreamTaskID != "" && upstreamTaskID != localTaskID {
			return upstreamTaskID
		}
		for _, key := range []string{"task_id", "id"} {
			if upstreamTaskID := strings.TrimSpace(firstPayloadString(response, key)); upstreamTaskID != "" && upstreamTaskID != localTaskID {
				return upstreamTaskID
			}
		}
	}
	if data, ok := payload["data"].(map[string]any); ok {
		if upstreamTaskID := strings.TrimSpace(firstPayloadString(data, "upstream_task_id")); upstreamTaskID != "" && upstreamTaskID != localTaskID {
			return upstreamTaskID
		}
		for _, key := range []string{"task_id", "id"} {
			if upstreamTaskID := strings.TrimSpace(firstPayloadString(data, key)); upstreamTaskID != "" && upstreamTaskID != localTaskID {
				return upstreamTaskID
			}
		}
	}
	return ""
}

func chooseUpstreamVideoBaseURL(payload map[string]any) string {
	if payload == nil {
		return ""
	}
	if baseURL := normalizeUpstreamVideoBaseURL(firstPayloadString(payload, "upstream_base_url")); baseURL != "" {
		return baseURL
	}
	if metadata, ok := payload["metadata"].(map[string]any); ok {
		if baseURL := normalizeUpstreamVideoBaseURL(firstPayloadString(metadata, "upstream_base_url")); baseURL != "" {
			return baseURL
		}
	}
	if response, ok := payload["response"].(map[string]any); ok {
		if baseURL := normalizeUpstreamVideoBaseURL(firstPayloadString(response, "upstream_base_url")); baseURL != "" {
			return baseURL
		}
	}
	if data, ok := payload["data"].(map[string]any); ok {
		if baseURL := normalizeUpstreamVideoBaseURL(firstPayloadString(data, "upstream_base_url")); baseURL != "" {
			return baseURL
		}
	}
	return ""
}

func looksLikeCompatibleVideoPayload(payload map[string]any) bool {
	if payload == nil {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(firstPayloadString(payload, "object")), "video") {
		return true
	}
	status := strings.TrimSpace(firstPayloadString(payload, "status"))
	if status == "" {
		return false
	}
	if firstPayloadString(payload, "id", "task_id", "model") != "" {
		return true
	}
	return extractCompatibleVideoURL(payload) != ""
}

func extractCompatibleVideoURL(payload map[string]any) string {
	if payload == nil {
		return ""
	}
	if urlValue := firstPayloadString(payload, "video_url", "url", "output_url", "result_url"); urlValue != "" {
		return urlValue
	}
	if metadata, ok := payload["metadata"].(map[string]any); ok {
		if urlValue := firstPayloadString(metadata, "video_url", "url", "output_url", "result_url"); urlValue != "" {
			return urlValue
		}
	}
	if content, ok := payload["content"].(map[string]any); ok {
		if urlValue := firstPayloadString(content, "video_url", "url", "output_url", "result_url"); urlValue != "" {
			return urlValue
		}
	}
	if response, ok := payload["response"].(map[string]any); ok {
		if urlValue := firstPayloadString(response, "video_url", "url", "output_url", "result_url"); urlValue != "" {
			return urlValue
		}
	}
	if data, ok := payload["data"].(map[string]any); ok {
		if urlValue := firstPayloadString(data, "video_url", "url", "output_url", "result_url"); urlValue != "" {
			return urlValue
		}
	}
	return ""
}

func preferredCompatibleVideoURL(payload map[string]any, taskInfo *relaycommon.TaskInfo, task *model.Task) string {
	if task != nil {
		if r2URL := extractTaskPrimaryR2URL(task); r2URL != "" {
			return r2URL
		}
	}
	if taskInfo != nil {
		if urlValue := strings.TrimSpace(taskInfo.Url); isCompatibleVideoURL(urlValue) {
			return urlValue
		}
	}
	if urlValue := extractCompatibleVideoURL(payload); urlValue != "" {
		return urlValue
	}
	if task != nil {
		if urlValue := strings.TrimSpace(task.FailReason); isCompatibleVideoURL(urlValue) {
			return urlValue
		}
	}
	return ""
}

func extractTaskPrimaryR2URL(task *model.Task) string {
	if task == nil {
		return ""
	}
	if IsR2URL(task.FailReason) {
		return strings.TrimSpace(task.FailReason)
	}
	if len(task.Data) == 0 {
		return ""
	}

	var payload map[string]any
	if err := common.Unmarshal(task.Data, &payload); err != nil {
		return ""
	}
	for _, key := range []string{"video_url", "url", "output_url", "image_url", "thumbnail_url"} {
		if urlValue := strings.TrimSpace(firstPayloadString(payload, key)); urlValue != "" && IsR2URL(urlValue) {
			return urlValue
		}
	}
	if metadata, ok := payload["metadata"].(map[string]any); ok {
		for _, key := range []string{"video_url", "url", "output_url"} {
			if urlValue := strings.TrimSpace(firstPayloadString(metadata, key)); urlValue != "" && IsR2URL(urlValue) {
				return urlValue
			}
		}
	}
	if content, ok := payload["content"].(map[string]any); ok {
		for _, key := range []string{"video_url", "url", "output_url"} {
			if urlValue := strings.TrimSpace(firstPayloadString(content, key)); urlValue != "" && IsR2URL(urlValue) {
				return urlValue
			}
		}
	}
	if response, ok := payload["response"].(map[string]any); ok {
		for _, key := range []string{"video_url", "url", "output_url"} {
			if urlValue := strings.TrimSpace(firstPayloadString(response, key)); urlValue != "" && IsR2URL(urlValue) {
				return urlValue
			}
		}
	}
	return ""
}

func rewriteCompatibleVideoURLs(payload map[string]any, urlValue string) {
	if payload == nil || strings.TrimSpace(urlValue) == "" {
		return
	}
	for _, key := range []string{"video_url", "url", "output_url"} {
		if _, ok := payload[key]; ok {
			payload[key] = urlValue
		}
	}
}

func isCompatibleVideoURL(urlValue string) bool {
	urlValue = strings.TrimSpace(urlValue)
	if urlValue == "" {
		return false
	}
	if IsR2URL(urlValue) {
		return true
	}
	return strings.HasPrefix(urlValue, "https://") ||
		strings.HasPrefix(urlValue, "http://") ||
		strings.HasPrefix(urlValue, "data:")
}

func extractCompatibleVideoReason(payload map[string]any) string {
	if payload == nil {
		return ""
	}
	if errMap, ok := payload["error"].(map[string]any); ok {
		if msg := firstPayloadString(errMap, "message", "code"); msg != "" {
			return msg
		}
	}
	if msg := firstPayloadString(payload, "message", "reason"); msg != "" {
		return msg
	}
	if metadata, ok := payload["metadata"].(map[string]any); ok {
		if msg := firstPayloadString(metadata, "message", "reason"); msg != "" {
			return msg
		}
	}
	return ""
}

func extractCompatibleVideoProgress(payload map[string]any) (int, bool) {
	if payload == nil {
		return 0, false
	}
	value, ok := payload["progress"]
	if !ok {
		return 0, false
	}
	switch v := value.(type) {
	case float64:
		return clampVideoProgress(int(v)), true
	case float32:
		return clampVideoProgress(int(v)), true
	case int:
		return clampVideoProgress(v), true
	case int64:
		return clampVideoProgress(int(v)), true
	case jsonNumber:
		if iv, err := strconv.Atoi(string(v)); err == nil {
			return clampVideoProgress(iv), true
		}
	case string:
		trimmed := strings.TrimSpace(strings.TrimSuffix(v, "%"))
		if trimmed == "" {
			return 0, false
		}
		if iv, err := strconv.Atoi(trimmed); err == nil {
			return clampVideoProgress(iv), true
		}
	}
	return 0, false
}

type jsonNumber string

func compatibleStatusToOpenAI(taskInfo *relaycommon.TaskInfo, task *model.Task) string {
	if taskInfo != nil && strings.TrimSpace(taskInfo.Status) != "" {
		return model.TaskStatus(taskInfo.Status).ToVideoStatus()
	}
	if task != nil {
		return task.Status.ToVideoStatus()
	}
	return ""
}

func compatibleProgressValue(taskInfo *relaycommon.TaskInfo, task *model.Task) int {
	if taskInfo != nil {
		if v, ok := progressStringToInt(taskInfo.Progress); ok {
			return v
		}
	}
	if task != nil {
		if v, ok := progressStringToInt(task.Progress); ok {
			return v
		}
	}
	return 0
}

func progressStringToInt(progress string) (int, bool) {
	progress = strings.TrimSpace(strings.TrimSuffix(progress, "%"))
	if progress == "" {
		return 0, false
	}
	value, err := strconv.Atoi(progress)
	if err != nil {
		return 0, false
	}
	return clampVideoProgress(value), true
}

func clampVideoProgress(value int) int {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}

func normalizeUpstreamVideoBaseURL(baseURL string) string {
	baseURL = strings.TrimSpace(baseURL)
	baseURL = strings.TrimRight(baseURL, "/")
	return baseURL
}

func firstPayloadString(payload map[string]any, keys ...string) string {
	if payload == nil {
		return ""
	}
	for _, key := range keys {
		if value, ok := payload[key]; ok {
			switch v := value.(type) {
			case string:
				if s := strings.TrimSpace(v); s != "" {
					return s
				}
			case fmt.Stringer:
				if s := strings.TrimSpace(v.String()); s != "" {
					return s
				}
			default:
				if s := strings.TrimSpace(fmt.Sprintf("%v", v)); s != "" && s != "<nil>" {
					return s
				}
			}
		}
	}
	return ""
}

func ensurePayloadMap(payload map[string]any, key string) map[string]any {
	if payload == nil {
		return map[string]any{}
	}
	if existing, ok := payload[key].(map[string]any); ok && existing != nil {
		return existing
	}
	next := map[string]any{}
	payload[key] = next
	return next
}

func clonePayloadMap(src map[string]any) map[string]any {
	if src == nil {
		return nil
	}
	dst := make(map[string]any, len(src))
	for key, value := range src {
		switch typed := value.(type) {
		case map[string]any:
			dst[key] = clonePayloadMap(typed)
		case []any:
			next := make([]any, len(typed))
			copy(next, typed)
			dst[key] = next
		default:
			dst[key] = value
		}
	}
	return dst
}
