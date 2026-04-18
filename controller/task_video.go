package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay"
	"github.com/QuantumNous/new-api/relay/channel"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/QuantumNous/new-api/setting/storage_setting"
	"github.com/QuantumNous/new-api/types"
)

const transientMissingVideoTaskGracePeriod = 3 * time.Minute

func UpdateVideoTaskAll(ctx context.Context, platform constant.TaskPlatform, taskChannelM map[int][]string, taskM map[string]*model.Task) error {
	for channelId, taskIds := range taskChannelM {
		if err := updateVideoTaskAll(ctx, platform, channelId, taskIds, taskM); err != nil {
			logger.LogError(ctx, fmt.Sprintf("Channel #%d failed to update video async tasks: %s", channelId, err.Error()))
		}
	}
	return nil
}

func updateVideoTaskAll(ctx context.Context, platform constant.TaskPlatform, channelId int, taskIds []string, taskM map[string]*model.Task) error {
	logger.LogInfo(ctx, fmt.Sprintf("Channel #%d pending video tasks: %d", channelId, len(taskIds)))
	if len(taskIds) == 0 {
		return nil
	}
	cacheGetChannel, err := model.CacheGetChannel(channelId)
	if err != nil {
		errUpdate := model.TaskBulkUpdate(taskIds, map[string]any{
			"fail_reason": fmt.Sprintf("Failed to get channel info, channel ID: %d", channelId),
			"status":      "FAILURE",
			"progress":    "100%",
		})
		if errUpdate != nil {
			common.SysLog(fmt.Sprintf("UpdateVideoTask error: %v", errUpdate))
		}
		return fmt.Errorf("CacheGetChannel failed: %w", err)
	}
	adaptor := relay.GetTaskAdaptor(platform)
	if adaptor == nil {
		return fmt.Errorf("video adaptor not found")
	}
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelBaseUrl: cacheGetChannel.GetBaseURL(),
	}
	info.ApiKey = cacheGetChannel.Key
	adaptor.Init(info)
	for _, taskId := range taskIds {
		if err := updateVideoSingleTask(ctx, adaptor, cacheGetChannel, taskId, taskM); err != nil {
			logger.LogError(ctx, fmt.Sprintf("Failed to update video task %s: %s", taskId, err.Error()))
		}
	}
	return nil
}

func updateVideoSingleTask(ctx context.Context, adaptor channel.TaskAdaptor, channel *model.Channel, taskId string, taskM map[string]*model.Task) error {
	baseURL := constant.ChannelBaseURLs[channel.Type]
	if channel.GetBaseURL() != "" {
		baseURL = channel.GetBaseURL()
	}
	proxy := channel.GetSetting().Proxy

	task := taskM[taskId]
	if task == nil {
		logger.LogError(ctx, fmt.Sprintf("Task %s not found in taskM", taskId))
		return fmt.Errorf("task %s not found", taskId)
	}
	key := channel.Key

	privateData := task.PrivateData
	if privateData.Key != "" {
		key = privateData.Key
	} else if channel.ChannelInfo.IsMultiKey {
		nextKey, _, keyErr := channel.GetNextEnabledKey()
		if keyErr == nil && strings.TrimSpace(nextKey) != "" {
			key = nextKey
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

	logger.LogDebug(ctx, fmt.Sprintf("UpdateVideoSingleTask query task_id=%s action=%s model=%s", taskId, task.Action, queryModel))
	upstreamTaskID := service.PreferredUpstreamVideoTaskID(task)
	payload := map[string]any{
		"task_id": upstreamTaskID,
		"action":  task.Action,
		"model":   queryModel,
	}
	responseBody, usedKey, err := fetchTaskResponseBody(adaptor, channel, task, baseURL, key, payload, proxy)
	if err != nil {
		return fmt.Errorf("fetchTask failed for task %s: %w", taskId, err)
	}
	queryKey := key
	if strings.TrimSpace(usedKey) != "" {
		queryKey = usedKey
	}
	if usedKey != "" && strings.TrimSpace(task.PrivateData.Key) == "" && channel.ChannelInfo.IsMultiKey {
		task.PrivateData.Key = usedKey
	}

	logger.LogDebug(ctx, fmt.Sprintf("UpdateVideoSingleTask response: %s", string(responseBody)))

	taskResult := &relaycommon.TaskInfo{}
	var responseItems dto.TaskResponse[model.Task]
	if err = common.Unmarshal(responseBody, &responseItems); err == nil && responseItems.IsSuccess() {
		logger.LogDebug(ctx, fmt.Sprintf("UpdateVideoSingleTask parsed as new api response format: %+v", responseItems))
		t := responseItems.Data
		taskResult.TaskID = t.TaskID
		taskResult.Status = string(t.Status)
		taskResult.Url = t.FailReason
		taskResult.Progress = t.Progress
		taskResult.Reason = t.FailReason
		task.Data = t.Data
	} else if compatibleTaskResult, normalizedBody, compatible, compatibleErr := service.ParseCompatibleVideoTaskResult(responseBody); compatibleErr != nil {
		return fmt.Errorf("parse compatible video task result failed for task %s: %w", taskId, compatibleErr)
	} else if compatible {
		taskResult = compatibleTaskResult
		if compatibleTaskResult != nil {
			if upstreamTaskID := strings.TrimSpace(compatibleTaskResult.TaskID); upstreamTaskID != "" && upstreamTaskID != task.TaskID {
				task.PrivateData.UpstreamTaskID = upstreamTaskID
			}
		}
		if taskBody, ok, err := service.NormalizeCompatibleVideoTaskBody(responseBody, compatibleTaskResult, task); err != nil {
			return fmt.Errorf("normalize compatible video task result failed for task %s: %w", taskId, err)
		} else if ok {
			task.Data = taskBody
		} else {
			task.Data = normalizedBody
		}
	} else if taskResult, err = adaptor.ParseTaskResult(responseBody); err != nil {
		return fmt.Errorf("parseTaskResult failed for task %s: %w", taskId, err)
	} else {
		task.Data = redactVideoResponseBody(responseBody)
	}

	logger.LogDebug(ctx, fmt.Sprintf("UpdateVideoSingleTask taskResult: %+v", taskResult))

	now := time.Now().Unix()
	if taskResult.Status == "" {
		if strings.TrimSpace(taskResult.Url) != "" {
			taskResult.Status = string(model.TaskStatusSuccess)
			taskResult.Progress = "100%"
		} else if strings.TrimSpace(taskResult.Reason) != "" {
			taskResult.Status = string(model.TaskStatusFailure)
			taskResult.Progress = "100%"
		} else if taskResult.Code == 0 {
			// Upstream may not materialize a status immediately for async video tasks.
			// Keep polling instead of failing the task early.
			taskResult.Status = string(model.TaskStatusInProgress)
			if strings.TrimSpace(taskResult.Progress) == "" {
				taskResult.Progress = "30%"
			}
			logger.LogWarn(ctx, fmt.Sprintf("Task %s upstream returned empty status, fallback to IN_PROGRESS", taskId))
		} else {
			taskResult = relaycommon.FailTaskInfo("upstream returned empty status")
		}
	}
	if shouldRetryMissingVideoTask(task, taskResult, now) {
		taskResult.Status = string(model.TaskStatusInProgress)
		taskResult.Reason = ""
		if strings.TrimSpace(taskResult.Progress) == "" || taskResult.Progress == "100%" {
			taskResult.Progress = "30%"
		}
		logger.LogWarn(ctx, fmt.Sprintf("Task %s upstream returned transient task_not_exist within grace period, keep polling", taskId))
	}

	shouldRefund := false
	quota := task.Quota
	preStatus := task.Status

	task.Status = model.TaskStatus(taskResult.Status)
	switch taskResult.Status {
	case model.TaskStatusSubmitted:
		task.Progress = "10%"
	case model.TaskStatusQueued:
		task.Progress = "20%"
	case model.TaskStatusInProgress:
		task.Progress = "30%"
		if task.StartTime == 0 {
			task.StartTime = now
		}
	case model.TaskStatusSuccess:
		task.Progress = "100%"
		if task.FinishTime == 0 {
			task.FinishTime = now
		}
		if !strings.HasPrefix(taskResult.Url, "data:") {
			task.FailReason = taskResult.Url
		}

		if storage_setting.IsVideoR2Enabled() {
			savedFailReason := task.FailReason
			task.Status = model.TaskStatusInProgress
			task.Progress = "95%"
			task.FailReason = ""
			if saveErr := task.Update(); saveErr != nil {
				logger.LogWarn(ctx, "pre-R2-transfer status save failed: "+saveErr.Error())
			}

			task.Status = model.TaskStatusSuccess
			task.Progress = "100%"
			task.FailReason = savedFailReason

			prefix := storage_setting.GetVideoR2Prefix()
			isSoraTask := channel.Type == constant.ChannelTypeSora ||
				strings.Contains(task.FailReason, "/v1/videos/") ||
				strings.Contains(string(task.Data), "/v1/videos/")
			var taskData map[string]interface{}
			if err := json.Unmarshal(task.Data, &taskData); err == nil {
				type fieldRule struct {
					name      string
					objectKey string
					asMainURL bool
				}
				rules := []fieldRule{
					{name: "url", objectKey: fmt.Sprintf("%s/%s.mp4", prefix, taskId), asMainURL: true},
					{name: "video_url", objectKey: fmt.Sprintf("%s/%s.mp4", prefix, taskId), asMainURL: true},
					{name: "output_url", objectKey: fmt.Sprintf("%s/%s.mp4", prefix, taskId), asMainURL: true},
					{name: "image_url", objectKey: fmt.Sprintf("%s/%s_image.jpg", prefix, taskId), asMainURL: false},
					{name: "thumbnail_url", objectKey: fmt.Sprintf("%s/%s_thumb.jpg", prefix, taskId), asMainURL: false},
				}

				dataChanged := false
				mainR2URL := ""
				for _, rule := range rules {
					rawURL, ok := taskData[rule.name].(string)
					if !ok || strings.TrimSpace(rawURL) == "" {
						continue
					}
					rawURL = strings.TrimSpace(rawURL)

					if service.IsR2URL(rawURL) {
						if rule.asMainURL && mainR2URL == "" {
							mainR2URL = rawURL
						}
						continue
					}
					if isSoraTask && rule.asMainURL && mainR2URL != "" {
						taskData[rule.name] = mainR2URL
						dataChanged = true
						continue
					}

					sourceURL := rawURL
					if isSoraTask && rule.asMainURL {
						sourceURL = normalizeSoraUpstreamURL(rawURL)
					}
					if strings.Contains(sourceURL, "/v1/videos/") {
						continue
					}

					var res service.R2TransferResult
					if isSoraTask && rule.asMainURL {
						res = transferSoraMainURLToR2(ctx, task, channel, rule.objectKey, sourceURL)
					} else {
						res = service.TransferFileToR2(ctx, rule.objectKey, sourceURL)
					}
					if !res.Success {
						continue
					}

					taskData[rule.name] = res.R2URL
					dataChanged = true
					if rule.asMainURL && mainR2URL == "" {
						mainR2URL = res.R2URL
					}
				}

				if task.FailReason != "" && !service.IsR2URL(task.FailReason) {
					mainKey := fmt.Sprintf("%s/%s.mp4", prefix, taskId)
					if isSoraTask && strings.Contains(task.FailReason, "/v1/videos/") {
						res := transferSoraMainURLToR2(ctx, task, channel, mainKey, "")
						if res.Success {
							task.FailReason = res.R2URL
							if mainR2URL == "" {
								mainR2URL = res.R2URL
							}
						}
					} else if !strings.Contains(task.FailReason, "/v1/videos/") {
						res := service.TransferVideoToR2(ctx, channel.Type, taskId, task.FailReason)
						if res.Success {
							task.FailReason = res.R2URL
							if mainR2URL == "" {
								mainR2URL = res.R2URL
							}
						}
					}
				}

				if isSoraTask && mainR2URL != "" {
					for _, field := range []string{"url", "video_url", "output_url"} {
						rawURL, ok := taskData[field].(string)
						if !ok || strings.TrimSpace(rawURL) == "" || service.IsR2URL(rawURL) {
							continue
						}
						taskData[field] = mainR2URL
						dataChanged = true
					}
				}

				if mainR2URL != "" && !service.IsR2URL(task.FailReason) {
					task.FailReason = mainR2URL
				}
				if dataChanged {
					if newData, err := common.Marshal(taskData); err == nil {
						task.Data = newData
					}
				}
			}
		}

		if taskResult.TotalTokens > 0 {
			var taskData map[string]interface{}
			if err := json.Unmarshal(task.Data, &taskData); err == nil {
				if modelName, ok := taskData["model"].(string); ok && modelName != "" {
					modelRatio, hasRatioSetting, _ := ratio_setting.GetModelRatio(modelName)
					if hasRatioSetting && modelRatio > 0 {
						group := task.Group
						if group == "" {
							user, err := model.GetUserById(task.UserId, false)
							if err == nil {
								group = user.Group
							}
						}
						if group != "" {
							groupRatio := ratio_setting.GetGroupRatio(group)
							userGroupRatio, hasUserGroupRatio := ratio_setting.GetGroupGroupRatio(group, group)

							finalGroupRatio := groupRatio
							if hasUserGroupRatio {
								finalGroupRatio = userGroupRatio
							}

							actualQuota := int(float64(taskResult.TotalTokens) * modelRatio * finalGroupRatio)
							preConsumedQuota := task.Quota
							quotaDelta := actualQuota - preConsumedQuota

							if quotaDelta > 0 {
								logger.LogInfo(ctx, fmt.Sprintf(
									"video task %s token reconciliation consumes extra quota: delta=%s actual=%s previous=%s tokens=%d",
									task.TaskID,
									logger.LogQuota(quotaDelta),
									logger.LogQuota(actualQuota),
									logger.LogQuota(preConsumedQuota),
									taskResult.TotalTokens,
								))
								if err := model.DecreaseUserQuota(task.UserId, quotaDelta); err != nil {
									logger.LogError(ctx, fmt.Sprintf("failed to decrease user quota: %s", err.Error()))
								} else {
									model.UpdateUserUsedQuotaAndRequestCount(task.UserId, quotaDelta)
									model.UpdateChannelUsedQuota(task.ChannelId, quotaDelta)
									task.Quota = actualQuota
									logContent := fmt.Sprintf(
										"Video async task token reconciliation consumed extra quota. Model ratio %.2f, group ratio %.2f, tokens %d, previous %s, actual %s, delta %s",
										modelRatio,
										finalGroupRatio,
										taskResult.TotalTokens,
										logger.LogQuota(preConsumedQuota),
										logger.LogQuota(actualQuota),
										logger.LogQuota(quotaDelta),
									)
									model.RecordLog(task.UserId, model.LogTypeSystem, logContent)
								}
							} else if quotaDelta < 0 {
								refundQuota := -quotaDelta
								logger.LogInfo(ctx, fmt.Sprintf(
									"video task %s token reconciliation refunds quota: refund=%s actual=%s previous=%s tokens=%d",
									task.TaskID,
									logger.LogQuota(refundQuota),
									logger.LogQuota(actualQuota),
									logger.LogQuota(preConsumedQuota),
									taskResult.TotalTokens,
								))
								if err := model.IncreaseUserQuota(task.UserId, refundQuota, false); err != nil {
									logger.LogError(ctx, fmt.Sprintf("failed to refund user quota: %s", err.Error()))
								} else {
									task.Quota = actualQuota
									logContent := fmt.Sprintf(
										"Video async task token reconciliation refunded quota. Model ratio %.2f, group ratio %.2f, tokens %d, previous %s, actual %s, refund %s",
										modelRatio,
										finalGroupRatio,
										taskResult.TotalTokens,
										logger.LogQuota(preConsumedQuota),
										logger.LogQuota(actualQuota),
										logger.LogQuota(refundQuota),
									)
									model.RecordLog(task.UserId, model.LogTypeSystem, logContent)
								}
							} else {
								logger.LogInfo(ctx, fmt.Sprintf(
									"video task %s token reconciliation unchanged: quota=%s tokens=%d",
									task.TaskID,
									logger.LogQuota(actualQuota),
									taskResult.TotalTokens,
								))
							}
						}
					}
				}
			}
		}
	case model.TaskStatusFailure:
		logger.LogJson(ctx, fmt.Sprintf("Task %s failed", taskId), task)
		task.Status = model.TaskStatusFailure
		task.Progress = "100%"
		if task.FinishTime == 0 {
			task.FinishTime = now
		}
		task.FailReason = service.ExtractTaskFailureReason(taskResult.Reason, task.Data)
		if task.FailReason == "" {
			task.FailReason = "task failed"
		}
		logger.LogInfo(ctx, fmt.Sprintf("Task %s failed: %s", task.TaskID, task.FailReason))
		taskResult.Progress = "100%"
		if quota != 0 {
			if preStatus != model.TaskStatusFailure {
				shouldRefund = true
			} else {
				logger.LogWarn(ctx, fmt.Sprintf("Task %s already in failure status, skip refund", task.TaskID))
			}
		}
		if preStatus != model.TaskStatusFailure && service.IsMissingVideoTaskErrorReason(task.FailReason) {
			service.DisableChannel(*types.NewChannelError(
				channel.Id,
				channel.Type,
				channel.Name,
				channel.ChannelInfo.IsMultiKey,
				queryKey,
				channel.GetAutoBan(),
			), "async task query returned task_not_exist")
		}
	default:
		return fmt.Errorf("unknown task status %s for task %s", taskResult.Status, taskId)
	}

	if taskResult.Progress != "" {
		task.Progress = taskResult.Progress
	}
	if err := task.Update(); err != nil {
		common.SysLog("UpdateVideoTask task error: " + err.Error())
		shouldRefund = false
	}

	if shouldRefund {
		if err := model.IncreaseUserQuota(task.UserId, quota, false); err != nil {
			logger.LogWarn(ctx, "Failed to increase user quota: "+err.Error())
		}
		logContent := fmt.Sprintf("Video async task failed %s, refund %s", task.TaskID, logger.LogQuota(quota))
		model.RecordLog(task.UserId, model.LogTypeSystem, logContent)
	}

	return nil
}

func fetchTaskResponseBody(adaptor channel.TaskAdaptor, channel *model.Channel, task *model.Task, baseURL, primaryKey string, payload map[string]any, proxy string) ([]byte, string, error) {
	keys := []string{primaryKey}
	if task != nil && strings.TrimSpace(task.PrivateData.Key) == "" && channel != nil && channel.ChannelInfo.IsMultiKey {
		for _, key := range channel.GetKeys() {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			duplicate := false
			for _, existing := range keys {
				if existing == key {
					duplicate = true
					break
				}
			}
			if !duplicate {
				keys = append(keys, key)
			}
		}
	}

	bestScore := -1
	var bestBody []byte
	bestKey := ""
	var firstErr error

	for _, key := range keys {
		resp, err := adaptor.FetchTask(baseURL, key, payload, proxy)
		if err != nil {
			if firstErr == nil {
				firstErr = err
			}
			continue
		}
		body, err := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if err != nil {
			if firstErr == nil {
				firstErr = err
			}
			continue
		}

		score := scoreTaskResponseBody(adaptor, body)
		if score > bestScore {
			bestScore = score
			bestBody = body
			bestKey = key
		}
		if score >= 5 {
			break
		}
	}

	if len(bestBody) > 0 {
		return bestBody, bestKey, nil
	}
	if firstErr != nil {
		return nil, "", firstErr
	}
	return nil, "", fmt.Errorf("fetch task returned empty response")
}

func scoreTaskResponseBody(adaptor channel.TaskAdaptor, body []byte) int {
	var responseItems dto.TaskResponse[model.Task]
	if err := common.Unmarshal(body, &responseItems); err == nil && responseItems.IsSuccess() {
		return scoreTaskStatus(string(responseItems.Data.Status))
	}

	if taskInfo, _, compatible, err := service.ParseCompatibleVideoTaskResult(body); err == nil && compatible && taskInfo != nil {
		return scoreTaskStatus(taskInfo.Status)
	}

	if taskInfo, err := adaptor.ParseTaskResult(body); err == nil && taskInfo != nil {
		return scoreTaskStatus(taskInfo.Status)
	}
	return 0
}

func scoreTaskStatus(status string) int {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case string(model.TaskStatusSuccess):
		return 5
	case string(model.TaskStatusInProgress):
		return 4
	case string(model.TaskStatusQueued), string(model.TaskStatusSubmitted):
		return 3
	case string(model.TaskStatusFailure):
		return 1
	default:
		return 0
	}
}

func redactVideoResponseBody(body []byte) []byte {
	var m map[string]any
	if err := json.Unmarshal(body, &m); err != nil {
		return body
	}
	resp, _ := m["response"].(map[string]any)
	if resp != nil {
		delete(resp, "bytesBase64Encoded")
		if v, ok := resp["video"].(string); ok {
			resp["video"] = truncateBase64(v)
		}
		if vs, ok := resp["videos"].([]any); ok {
			for i := range vs {
				if vm, ok := vs[i].(map[string]any); ok {
					delete(vm, "bytesBase64Encoded")
				}
			}
		}
	}
	b, err := json.Marshal(m)
	if err != nil {
		return body
	}
	return b
}

func truncateBase64(s string) string {
	const maxKeep = 256
	if len(s) <= maxKeep {
		return s
	}
	return s[:maxKeep] + "..."
}

func shouldRetryMissingVideoTask(task *model.Task, taskResult *relaycommon.TaskInfo, now int64) bool {
	if task == nil || taskResult == nil {
		return false
	}
	if !service.IsMissingVideoTaskErrorReason(taskResult.Reason) {
		return false
	}

	createdAt := task.SubmitTime
	if createdAt <= 0 {
		createdAt = task.CreatedAt
	}
	if createdAt <= 0 {
		return false
	}

	return now-createdAt < int64(transientMissingVideoTaskGracePeriod/time.Second)
}
