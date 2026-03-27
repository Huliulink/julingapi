package service

import (
	"encoding/base64"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
)

type VideoTaskCompatOptions struct {
	PreferR2 bool
}

type videoTaskCompatState struct {
	channelType int
	status      model.TaskStatus
	progress    string
	url         string
	reason      string
	r2Pending   bool
}

func BuildCompatibleVideoTaskResponse(task *model.Task, opts VideoTaskCompatOptions) ([]byte, bool, error) {
	if task == nil {
		return nil, false, nil
	}

	state := resolveVideoTaskCompatState(task, opts)
	payload, ok := loadTaskPayload(task)
	if !ok {
		payload = map[string]any{}
	}

	switch state.channelType {
	case constant.ChannelTypeSora, constant.ChannelTypeOpenAI:
		applySoraCompatPayload(payload, task, state)
	case constant.ChannelTypeXai:
		applyXAICompatPayload(payload, task, state)
	case constant.ChannelTypeJimeng:
		applyJimengCompatPayload(payload, task, state)
	case constant.ChannelTypeKling:
		applyKlingCompatPayload(payload, task, state)
	case constant.ChannelTypeVidu:
		applyViduCompatPayload(payload, task, state)
	case constant.ChannelTypeAli:
		applyAliCompatPayload(payload, task, state)
	case constant.ChannelTypeDoubaoVideo, constant.ChannelTypeVolcEngine:
		applyDoubaoCompatPayload(payload, task, state)
	case constant.ChannelTypeMiniMax:
		applyHailuoCompatPayload(payload, task, state)
	case constant.ChannelTypeGemini:
		applyGeminiCompatPayload(payload, task, state)
	default:
		return nil, false, nil
	}

	b, err := common.Marshal(payload)
	if err != nil {
		return nil, false, err
	}
	return b, true, nil
}

func ResolveHailuoCompatibleFileURL(task *model.Task, opts VideoTaskCompatOptions) string {
	if task == nil {
		return ""
	}
	state := resolveVideoTaskCompatState(task, opts)
	if state.status != model.TaskStatusSuccess || state.r2Pending {
		return ""
	}
	if state.url != "" {
		return state.url
	}
	return extractTaskPreferredVideoURL(task, opts.PreferR2)
}

func ResolveTaskChannelType(task *model.Task) int {
	if task == nil {
		return constant.ChannelTypeUnknown
	}
	if task.ChannelId != 0 {
		if channel, err := model.CacheGetChannel(task.ChannelId); err == nil && channel != nil {
			if channel.Type == constant.ChannelTypeOpenAI && looksLikeSoraTask(task) {
				return constant.ChannelTypeSora
			}
			return channel.Type
		}
	}
	if channelType, err := strconv.Atoi(string(task.Platform)); err == nil {
		if channelType == constant.ChannelTypeOpenAI && looksLikeSoraTask(task) {
			return constant.ChannelTypeSora
		}
		return channelType
	}
	if looksLikeSoraTask(task) {
		return constant.ChannelTypeSora
	}
	return constant.ChannelTypeUnknown
}

func resolveVideoTaskCompatState(task *model.Task, opts VideoTaskCompatOptions) videoTaskCompatState {
	state := videoTaskCompatState{
		channelType: ResolveTaskChannelType(task),
		status:      task.Status,
		progress:    normalizeCompatProgress(task.Progress, task.Status),
		reason:      ExtractTaskFailureReason(task.FailReason, task.Data),
	}

	if opts.PreferR2 && task.Status == model.TaskStatusSuccess && !taskHasAnyR2URL(task) {
		state.status = model.TaskStatusInProgress
		state.progress = "95%"
		state.r2Pending = true
		return state
	}

	if task.Status == model.TaskStatusFailure {
		state.progress = "100%"
		return state
	}

	if task.Status == model.TaskStatusSuccess {
		state.progress = "100%"
		state.url = extractTaskPreferredVideoURL(task, opts.PreferR2)
	}

	return state
}

func normalizeCompatProgress(progress string, status model.TaskStatus) string {
	progress = strings.TrimSpace(progress)
	if progress != "" {
		return progress
	}
	switch status {
	case model.TaskStatusSuccess, model.TaskStatusFailure:
		return "100%"
	case model.TaskStatusInProgress:
		return "50%"
	case model.TaskStatusQueued:
		return "20%"
	case model.TaskStatusSubmitted:
		return "10%"
	default:
		return "0%"
	}
}

func loadTaskPayload(task *model.Task) (map[string]any, bool) {
	if task == nil || len(task.Data) == 0 {
		return nil, false
	}
	var payload map[string]any
	if err := common.Unmarshal(task.Data, &payload); err != nil || payload == nil {
		return nil, false
	}
	return payload, true
}

func extractTaskPreferredVideoURL(task *model.Task, preferR2 bool) string {
	if task == nil {
		return ""
	}
	if preferR2 {
		if IsR2URL(task.FailReason) {
			return task.FailReason
		}
	} else if isUsableVideoURL(task.FailReason) {
		return task.FailReason
	}

	payload, ok := loadTaskPayload(task)
	if !ok {
		return ""
	}
	return extractPayloadPreferredURL(payload, preferR2)
}

func extractPayloadPreferredURL(payload map[string]any, preferR2 bool) string {
	if payload == nil {
		return ""
	}
	for _, candidate := range collectCandidateURLs(payload) {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if preferR2 {
			if IsR2URL(candidate) {
				return candidate
			}
			continue
		}
		if isUsableVideoURL(candidate) {
			return candidate
		}
	}
	return ""
}

func collectCandidateURLs(payload map[string]any) []string {
	var urls []string
	add := func(v string) {
		v = strings.TrimSpace(v)
		if v == "" {
			return
		}
		for _, existing := range urls {
			if existing == v {
				return
			}
		}
		urls = append(urls, v)
	}
	for _, key := range []string{"url", "video_url", "output_url", "download_url", "uri"} {
		add(getMapString(payload, key))
	}
	if content, ok := getMap(payload, "content"); ok {
		add(getMapString(content, "video_url"))
	}
	if output, ok := getMap(payload, "output"); ok {
		add(getMapString(output, "video_url"))
	}
	if data, ok := getMap(payload, "data"); ok {
		add(getMapString(data, "video_url"))
		if taskResult, ok := getMap(data, "task_result"); ok {
			if videos, ok := taskResult["videos"].([]any); ok && len(videos) > 0 {
				if video, ok := anyToMap(videos[0]); ok {
					add(getMapString(video, "url"))
				}
			}
		}
	}
	if creations, ok := payload["creations"].([]any); ok && len(creations) > 0 {
		if creation, ok := anyToMap(creations[0]); ok {
			add(getMapString(creation, "url"))
		}
	}
	if response, ok := getMap(payload, "response"); ok {
		add(getMapString(response, "url"))
		add(getMapString(response, "video"))
		add(getMapString(response, "video_url"))
		add(getMapString(response, "output_url"))
		if gvr, ok := getMap(response, "generateVideoResponse"); ok {
			if samples, ok := gvr["generatedSamples"].([]any); ok && len(samples) > 0 {
				if sample, ok := anyToMap(samples[0]); ok {
					if video, ok := getMap(sample, "video"); ok {
						add(getMapString(video, "uri"))
					}
				}
			}
		}
	}
	if file, ok := getMap(payload, "file"); ok {
		add(getMapString(file, "download_url"))
	}
	return urls
}

func taskHasAnyR2URL(task *model.Task) bool {
	return extractTaskPreferredVideoURL(task, true) != ""
}

func isUsableVideoURL(raw string) bool {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return false
	}
	return strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") || strings.HasPrefix(raw, "data:") || strings.HasPrefix(raw, "/v1/videos/")
}

func looksLikeSoraTask(task *model.Task) bool {
	if task == nil {
		return false
	}
	if strings.Contains(strings.ToLower(strings.TrimSpace(task.Properties.OriginModelName)), "sora") {
		return true
	}
	if strings.Contains(strings.ToLower(strings.TrimSpace(task.Properties.UpstreamModelName)), "sora") {
		return true
	}
	payload, ok := loadTaskPayload(task)
	if !ok {
		return false
	}
	if modelName := getMapString(payload, "model"); strings.Contains(strings.ToLower(modelName), "sora") {
		return true
	}
	if metadata, ok := getMap(payload, "metadata"); ok {
		permalink := strings.ToLower(strings.TrimSpace(getMapString(metadata, "permalink")))
		return strings.Contains(permalink, "sora")
	}
	return false
}

func applySoraCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	payload["id"] = task.TaskID
	payload["task_id"] = task.TaskID
	payload["object"] = defaultString(getMapString(payload, "object"), "video")
	if payload["created_at"] == nil && task.CreatedAt > 0 {
		payload["created_at"] = task.CreatedAt
	}
	if payload["completed_at"] == nil && task.UpdatedAt > 0 && state.status == model.TaskStatusSuccess {
		payload["completed_at"] = task.UpdatedAt
	}
	payload["progress"] = percentToInt(state.progress)

	switch state.status {
	case model.TaskStatusSuccess:
		payload["status"] = "completed"
		delete(payload, "error")
		if state.url != "" {
			payload["url"] = state.url
			payload["video_url"] = state.url
			payload["output_url"] = state.url
		}
	case model.TaskStatusFailure:
		payload["status"] = "failed"
		payload["error"] = map[string]any{
			"message": defaultString(state.reason, "task failed"),
			"code":    "task_failed",
		}
		delete(payload, "url")
		delete(payload, "video_url")
		delete(payload, "output_url")
	default:
		payload["status"] = "processing"
		delete(payload, "error")
		delete(payload, "url")
		delete(payload, "video_url")
		delete(payload, "output_url")
	}
}

func applyXAICompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	payload["id"] = task.TaskID
	if payload["created_at"] == nil && task.CreatedAt > 0 {
		payload["created_at"] = task.CreatedAt
	}
	payload["progress"] = percentToInt(state.progress)

	switch state.status {
	case model.TaskStatusSuccess:
		payload["status"] = "completed"
		delete(payload, "error")
		if state.url != "" {
			payload["output_url"] = state.url
			payload["video_url"] = state.url
		}
	case model.TaskStatusFailure:
		payload["status"] = "failed"
		payload["error"] = map[string]any{
			"message": defaultString(state.reason, "task failed"),
			"code":    "task_failed",
		}
		delete(payload, "output_url")
		delete(payload, "video_url")
	default:
		payload["status"] = "processing"
		delete(payload, "error")
		delete(payload, "output_url")
		delete(payload, "video_url")
	}
}

func applyJimengCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	payload["code"] = 10000
	payload["request_id"] = defaultString(getMapString(payload, "request_id"), task.TaskID)
	data := ensureMap(payload, "data")
	data["task_id"] = task.TaskID

	switch state.status {
	case model.TaskStatusSuccess:
		data["status"] = "done"
		data["video_url"] = state.url
		payload["message"] = "Success"
	case model.TaskStatusFailure:
		payload["code"] = 50000
		payload["message"] = defaultString(state.reason, "task failed")
		data["status"] = "failed"
		data["video_url"] = ""
	default:
		payload["message"] = "Success"
		if state.r2Pending {
			data["status"] = "done"
			data["video_url"] = ""
		} else {
			data["status"] = "in_queue"
			delete(data, "video_url")
		}
	}
}

func applyKlingCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	payload["code"] = 0
	if payload["message"] == nil {
		payload["message"] = "success"
	}
	data := ensureMap(payload, "data")
	data["task_id"] = task.TaskID
	if payload["task_id"] == nil {
		payload["task_id"] = task.TaskID
	}
	video := ensureFirstMap(ensureMap(data, "task_result"), "videos")

	switch state.status {
	case model.TaskStatusSuccess:
		data["task_status"] = "succeed"
		data["task_status_msg"] = "success"
		video["url"] = state.url
	case model.TaskStatusFailure:
		data["task_status"] = "failed"
		data["task_status_msg"] = defaultString(state.reason, "task failed")
		delete(video, "url")
	default:
		if state.r2Pending {
			data["task_status"] = "succeed"
			data["task_status_msg"] = "r2 transfer in progress"
			delete(video, "url")
		} else if state.status == model.TaskStatusSubmitted || state.status == model.TaskStatusQueued {
			data["task_status"] = "submitted"
			data["task_status_msg"] = "submitted"
			delete(video, "url")
		} else {
			data["task_status"] = "processing"
			data["task_status_msg"] = "processing"
			delete(video, "url")
		}
	}
}

func applyViduCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	switch state.status {
	case model.TaskStatusSuccess:
		payload["state"] = "success"
		creation := ensureFirstMap(payload, "creations")
		creation["url"] = state.url
	case model.TaskStatusFailure:
		payload["state"] = "failed"
		payload["err_code"] = defaultString(state.reason, "task_failed")
		creation := ensureFirstMap(payload, "creations")
		delete(creation, "url")
	default:
		if state.r2Pending {
			payload["state"] = "success"
			creation := ensureFirstMap(payload, "creations")
			delete(creation, "url")
		} else if state.status == model.TaskStatusSubmitted || state.status == model.TaskStatusQueued {
			payload["state"] = "queueing"
		} else {
			payload["state"] = "processing"
		}
	}
	payload["task_id"] = task.TaskID
}

func applyAliCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	output := ensureMap(payload, "output")
	output["task_id"] = task.TaskID
	switch state.status {
	case model.TaskStatusSuccess:
		output["task_status"] = "SUCCEEDED"
		output["video_url"] = state.url
		payload["code"] = ""
		payload["message"] = ""
	case model.TaskStatusFailure:
		output["task_status"] = "FAILED"
		output["message"] = defaultString(state.reason, "task failed")
		payload["message"] = defaultString(state.reason, "task failed")
		delete(output, "video_url")
	default:
		if state.r2Pending {
			output["task_status"] = "SUCCEEDED"
			output["video_url"] = ""
		} else if state.status == model.TaskStatusSubmitted || state.status == model.TaskStatusQueued {
			output["task_status"] = "PENDING"
			delete(output, "video_url")
		} else {
			output["task_status"] = "RUNNING"
			delete(output, "video_url")
		}
	}
}

func applyDoubaoCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	payload["id"] = task.TaskID
	content := ensureMap(payload, "content")
	switch state.status {
	case model.TaskStatusSuccess:
		payload["status"] = "succeeded"
		content["video_url"] = state.url
	case model.TaskStatusFailure:
		payload["status"] = "failed"
		delete(content, "video_url")
	default:
		if state.r2Pending {
			payload["status"] = "succeeded"
			content["video_url"] = ""
		} else if state.status == model.TaskStatusSubmitted || state.status == model.TaskStatusQueued {
			payload["status"] = "pending"
			delete(content, "video_url")
		} else {
			payload["status"] = "processing"
			delete(content, "video_url")
		}
	}
}

func applyHailuoCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	payload["task_id"] = task.TaskID
	baseResp := ensureMap(payload, "base_resp")
	baseResp["status_code"] = 0
	baseResp["status_msg"] = "success"
	switch state.status {
	case model.TaskStatusSuccess:
		payload["status"] = "Success"
		payload["file_id"] = task.TaskID
	case model.TaskStatusFailure:
		payload["status"] = "Fail"
		baseResp["status_code"] = 500
		baseResp["status_msg"] = defaultString(state.reason, "task failed")
		delete(payload, "file_id")
	default:
		if state.r2Pending {
			payload["status"] = "Success"
			delete(payload, "file_id")
		} else if state.status == model.TaskStatusSubmitted || state.status == model.TaskStatusQueued {
			payload["status"] = "Queueing"
			delete(payload, "file_id")
		} else {
			payload["status"] = "Processing"
			delete(payload, "file_id")
		}
	}
}

func applyGeminiCompatPayload(payload map[string]any, task *model.Task, state videoTaskCompatState) {
	response := ensureMap(payload, "response")
	gvr := ensureMap(response, "generateVideoResponse")
	sample := ensureFirstMap(gvr, "generatedSamples")
	video := ensureMap(sample, "video")

	if payload["name"] == nil {
		if decoded, err := decodeCompatGeminiTaskID(task.TaskID); err == nil && strings.TrimSpace(decoded) != "" {
			payload["name"] = decoded
		} else {
			payload["name"] = task.TaskID
		}
	}
	if payload["done"] == nil {
		payload["done"] = false
	}

	switch state.status {
	case model.TaskStatusSuccess:
		payload["done"] = true
		delete(payload, "error")
		video["uri"] = state.url
	case model.TaskStatusFailure:
		payload["done"] = true
		payload["error"] = map[string]any{
			"message": defaultString(state.reason, "task failed"),
		}
		delete(video, "uri")
	default:
		payload["done"] = false
		delete(payload, "error")
		delete(video, "uri")
	}
}

func defaultString(value string, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func percentToInt(progress string) int {
	progress = strings.TrimSpace(strings.TrimSuffix(progress, "%"))
	if progress == "" {
		return 0
	}
	v, _ := strconv.Atoi(progress)
	return v
}

func getMapString(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	v, _ := m[key].(string)
	return strings.TrimSpace(v)
}

func getMap(parent map[string]any, key string) (map[string]any, bool) {
	if parent == nil {
		return nil, false
	}
	return anyToMap(parent[key])
}

func anyToMap(value any) (map[string]any, bool) {
	switch typed := value.(type) {
	case map[string]any:
		return typed, true
	default:
		return nil, false
	}
}

func ensureMap(parent map[string]any, key string) map[string]any {
	if parent == nil {
		return map[string]any{}
	}
	if existing, ok := parent[key].(map[string]any); ok && existing != nil {
		return existing
	}
	m := map[string]any{}
	parent[key] = m
	return m
}

func ensureFirstMap(parent map[string]any, key string) map[string]any {
	if parent == nil {
		return map[string]any{}
	}
	if items, ok := parent[key].([]any); ok && len(items) > 0 {
		if item, ok := items[0].(map[string]any); ok && item != nil {
			return item
		}
	}
	item := map[string]any{}
	parent[key] = []any{item}
	return item
}

func decodeCompatGeminiTaskID(taskID string) (string, error) {
	b, err := base64.RawURLEncoding.DecodeString(taskID)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
