package relay

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/QuantumNous/new-api/setting/storage_setting"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/singleflight"
)

/*
Task 任务通过平台、Action 区分任务
*/
func RelayTaskSubmit(c *gin.Context, info *relaycommon.RelayInfo) (taskErr *dto.TaskError) {
	info.InitChannelMeta(c)
	// ensure TaskRelayInfo is initialized to avoid nil dereference when accessing embedded fields
	if info.TaskRelayInfo == nil {
		info.TaskRelayInfo = &relaycommon.TaskRelayInfo{}
	}
	path := c.Request.URL.Path
	if strings.Contains(path, "/v1/videos/") && strings.HasSuffix(path, "/remix") {
		info.Action = constant.TaskActionRemix
	}

	// 提取 remix 任务的 video_id
	if info.Action == constant.TaskActionRemix {
		videoID := c.Param("video_id")
		if strings.TrimSpace(videoID) == "" {
			return service.TaskErrorWrapperLocal(fmt.Errorf("video_id is required"), "invalid_request", http.StatusBadRequest)
		}
		info.OriginTaskID = videoID
	}

	platform := constant.TaskPlatform(c.GetString("platform"))

	// 获取原始任务信息
	if info.OriginTaskID != "" {
		originTask, exist, err := model.GetByTaskId(info.UserId, info.OriginTaskID)
		if err != nil {
			taskErr = service.TaskErrorWrapper(err, "get_origin_task_failed", http.StatusInternalServerError)
			return
		}
		if !exist {
			taskErr = service.TaskErrorWrapperLocal(errors.New("task_origin_not_exist"), "task_not_exist", http.StatusBadRequest)
			return
		}
		if info.OriginModelName == "" {
			if originTask.Properties.OriginModelName != "" {
				info.OriginModelName = originTask.Properties.OriginModelName
			} else if originTask.Properties.UpstreamModelName != "" {
				info.OriginModelName = originTask.Properties.UpstreamModelName
			} else {
				var taskData map[string]interface{}
				_ = json.Unmarshal(originTask.Data, &taskData)
				if m, ok := taskData["model"].(string); ok && m != "" {
					info.OriginModelName = m
					platform = originTask.Platform
				}
			}
		}
		if originTask.ChannelId != info.ChannelId {
			channel, err := model.GetChannelById(originTask.ChannelId, true)
			if err != nil {
				taskErr = service.TaskErrorWrapperLocal(err, "channel_not_found", http.StatusBadRequest)
				return
			}
			if channel.Status != common.ChannelStatusEnabled {
				taskErr = service.TaskErrorWrapperLocal(errors.New("the channel of the origin task is disabled"), "task_channel_disable", http.StatusBadRequest)
				return
			}
			key, _, newAPIError := channel.GetNextEnabledKey()
			if newAPIError != nil {
				taskErr = service.TaskErrorWrapper(newAPIError, "channel_no_available_key", newAPIError.StatusCode)
				return
			}
			common.SetContextKey(c, constant.ContextKeyChannelKey, key)
			common.SetContextKey(c, constant.ContextKeyChannelType, channel.Type)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, channel.GetBaseURL())
			common.SetContextKey(c, constant.ContextKeyChannelId, originTask.ChannelId)

			info.ChannelBaseUrl = channel.GetBaseURL()
			info.ChannelId = originTask.ChannelId
			info.ChannelType = channel.Type
			info.ApiKey = key
			platform = originTask.Platform
		}

		// 使用原始任务的参数
		if info.Action == constant.TaskActionRemix {
			var taskData map[string]interface{}
			_ = json.Unmarshal(originTask.Data, &taskData)
			secondsStr, _ := taskData["seconds"].(string)
			seconds, _ := strconv.Atoi(secondsStr)
			if seconds <= 0 {
				seconds = 4
			}
			sizeStr, _ := taskData["size"].(string)
			if info.PriceData.OtherRatios == nil {
				info.PriceData.OtherRatios = map[string]float64{}
			}
			info.PriceData.OtherRatios["seconds"] = float64(seconds)
			info.PriceData.OtherRatios["size"] = 1
			if sizeStr == "1792x1024" || sizeStr == "1024x1792" {
				info.PriceData.OtherRatios["size"] = 1.666667
			}
		}
	}
	if platform == "" {
		platform = GetTaskPlatform(c)
	}

	info.InitChannelMeta(c)
	adaptor := GetTaskAdaptor(platform)
	if adaptor == nil {
		return service.TaskErrorWrapperLocal(fmt.Errorf("invalid api platform: %s", platform), "invalid_api_platform", http.StatusBadRequest)
	}
	adaptor.Init(info)
	// get & validate taskRequest 获取并验证文本请求
	taskErr = adaptor.ValidateRequestAndSetAction(c, info)
	if taskErr != nil {
		return
	}

	modelName := info.OriginModelName
	if modelName == "" {
		modelName = service.CoverTaskActionToModelName(platform, info.Action)
	}
	modelPrice, success := ratio_setting.GetModelPrice(modelName, true)
	if !success {
		defaultPrice, ok := ratio_setting.GetDefaultModelPriceMap()[modelName]
		if !ok {
			modelPrice = float64(common.PreConsumedQuota) / common.QuotaPerUnit
		} else {
			modelPrice = defaultPrice
		}
	}

	// 处理 auto 分组：从 context 获取实际选中的分组
	// 当使用 auto 分组时，Distribute 中间件会将实际选中的分组存储在 ContextKeyAutoGroup 中
	if autoGroup, exists := common.GetContextKey(c, constant.ContextKeyAutoGroup); exists {
		if groupStr, ok := autoGroup.(string); ok && groupStr != "" {
			info.UsingGroup = groupStr
		}
	}

	// 预扣
	groupRatio := ratio_setting.GetGroupRatio(info.UsingGroup)
	var ratio float64
	userGroupRatio, hasUserGroupRatio := ratio_setting.GetGroupGroupRatio(info.UserGroup, info.UsingGroup)
	if hasUserGroupRatio {
		ratio = modelPrice * userGroupRatio
	} else {
		ratio = modelPrice * groupRatio
	}
	// FIXME: 临时修补，支持任务仅按次计费
	if !common.StringsContains(constant.TaskPricePatches, modelName) {
		if len(info.PriceData.OtherRatios) > 0 {
			for _, ra := range info.PriceData.OtherRatios {
				if 1.0 != ra {
					ratio *= ra
				}
			}
		}
	}
	println(fmt.Sprintf("model: %s, model_price: %.4f, group: %s, group_ratio: %.4f, final_ratio: %.4f", modelName, modelPrice, info.UsingGroup, groupRatio, ratio))
	userQuota, err := model.GetUserQuota(info.UserId, false)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "get_user_quota_failed", http.StatusInternalServerError)
		return
	}
	quota := int(ratio * common.QuotaPerUnit)
	if userQuota-quota < 0 {
		taskErr = service.TaskErrorWrapperLocal(errors.New("user quota is not enough"), "quota_not_enough", http.StatusForbidden)
		return
	}

	// build body
	requestBody, err := adaptor.BuildRequestBody(c, info)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "build_request_failed", http.StatusInternalServerError)
		return
	}
	// do request
	resp, err := adaptor.DoRequest(c, info, requestBody)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "do_request_failed", http.StatusInternalServerError)
		return
	}
	// handle response
	if resp != nil && resp.StatusCode != http.StatusOK {
		responseBody, _ := io.ReadAll(resp.Body)
		taskErr = service.TaskErrorWrapper(fmt.Errorf("%s", string(responseBody)), "fail_to_fetch_task", resp.StatusCode)
		return
	}

	defer func() {
		// release quota
		if info.ConsumeQuota && taskErr == nil {

			err := service.PostConsumeQuota(info, quota, 0, true)
			if err != nil {
				common.SysLog("error consuming token remain quota: " + err.Error())
			}
			if quota != 0 {
				tokenName := c.GetString("token_name")
				//gRatio := groupRatio
				//if hasUserGroupRatio {
				//	gRatio = userGroupRatio
				//}
				logContent := fmt.Sprintf("操作 %s", info.Action)
				// FIXME: 临时修补，支持任务仅按次计费
				if common.StringsContains(constant.TaskPricePatches, modelName) {
					logContent = fmt.Sprintf("%s，按次计费", logContent)
				} else {
					if len(info.PriceData.OtherRatios) > 0 {
						var contents []string
						for key, ra := range info.PriceData.OtherRatios {
							if 1.0 != ra {
								contents = append(contents, fmt.Sprintf("%s: %.2f", key, ra))
							}
						}
						if len(contents) > 0 {
							logContent = fmt.Sprintf("%s, 计算参数：%s", logContent, strings.Join(contents, ", "))
						}
					}
				}
				other := make(map[string]interface{})
				if c != nil && c.Request != nil && c.Request.URL != nil {
					other["request_path"] = c.Request.URL.Path
				}
				other["model_price"] = modelPrice
				other["group_ratio"] = groupRatio
				if hasUserGroupRatio {
					other["user_group_ratio"] = userGroupRatio
				}
				model.RecordConsumeLog(c, info.UserId, model.RecordConsumeLogParams{
					ChannelId: info.ChannelId,
					ModelName: modelName,
					TokenName: tokenName,
					Quota:     quota,
					Content:   logContent,
					TokenId:   info.TokenId,
					Group:     info.UsingGroup,
					Other:     other,
				})
				model.UpdateUserUsedQuotaAndRequestCount(info.UserId, quota)
				model.UpdateChannelUsedQuota(info.ChannelId, quota)
			}
		}
	}()

	taskID, taskData, taskErr := adaptor.DoResponse(c, resp, info)
	if taskErr != nil {
		return
	}
	info.ConsumeQuota = true
	// insert task
	task := model.InitTask(platform, info)
	task.TaskID = taskID
	task.Quota = quota
	task.Data = taskData
	task.Action = info.Action
	err = task.Insert()
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "insert_task_failed", http.StatusInternalServerError)
		return
	}
	return nil
}

var fetchRespBuilders = map[int]func(c *gin.Context) (respBody []byte, taskResp *dto.TaskError){
	relayconstant.RelayModeSunoFetchByID:  sunoFetchByIDRespBodyBuilder,
	relayconstant.RelayModeSunoFetch:      sunoFetchRespBodyBuilder,
	relayconstant.RelayModeVideoFetchByID: videoFetchByIDRespBodyBuilder,
}

func RelayTaskFetch(c *gin.Context, relayMode int) (taskResp *dto.TaskError) {
	respBuilder, ok := fetchRespBuilders[relayMode]
	if !ok {
		taskResp = service.TaskErrorWrapperLocal(errors.New("invalid_relay_mode"), "invalid_relay_mode", http.StatusBadRequest)
	}

	respBody, taskErr := respBuilder(c)
	if taskErr != nil {
		return taskErr
	}
	if len(respBody) == 0 {
		respBody = []byte("{\"code\":\"success\",\"data\":null}")
	}

	c.Writer.Header().Set("Content-Type", "application/json")
	_, err := io.Copy(c.Writer, bytes.NewBuffer(respBody))
	if err != nil {
		taskResp = service.TaskErrorWrapper(err, "copy_response_body_failed", http.StatusInternalServerError)
		return
	}
	return
}

func sunoFetchRespBodyBuilder(c *gin.Context) (respBody []byte, taskResp *dto.TaskError) {
	userId := c.GetInt("id")
	var condition = struct {
		IDs    []any  `json:"ids"`
		Action string `json:"action"`
	}{}
	err := c.BindJSON(&condition)
	if err != nil {
		taskResp = service.TaskErrorWrapper(err, "invalid_request", http.StatusBadRequest)
		return
	}
	var tasks []any
	if len(condition.IDs) > 0 {
		taskModels, err := model.GetByTaskIds(userId, condition.IDs)
		if err != nil {
			taskResp = service.TaskErrorWrapper(err, "get_tasks_failed", http.StatusInternalServerError)
			return
		}
		for _, task := range taskModels {
			tasks = append(tasks, TaskModel2Dto(task))
		}
	} else {
		tasks = make([]any, 0)
	}
	respBody, err = json.Marshal(dto.TaskResponse[[]any]{
		Code: "success",
		Data: tasks,
	})
	return
}

func sunoFetchByIDRespBodyBuilder(c *gin.Context) (respBody []byte, taskResp *dto.TaskError) {
	taskId := c.Param("id")
	userId := c.GetInt("id")

	originTask, exist, err := model.GetByTaskId(userId, taskId)
	if err != nil {
		taskResp = service.TaskErrorWrapper(err, "get_task_failed", http.StatusInternalServerError)
		return
	}
	if !exist {
		taskResp = service.TaskErrorWrapperLocal(errors.New("task_not_exist"), "task_not_exist", http.StatusBadRequest)
		return
	}

	respBody, err = json.Marshal(dto.TaskResponse[any]{
		Code: "success",
		Data: TaskModel2Dto(originTask),
	})
	return
}

func videoFetchByIDRespBodyBuilder(c *gin.Context) (respBody []byte, taskResp *dto.TaskError) {
	taskId := c.Param("task_id")
	if taskId == "" {
		taskId = c.GetString("task_id")
	}
	userId := c.GetInt("id")

	originTask, exist, err := model.GetByTaskId(userId, taskId)
	if err != nil {
		taskResp = service.TaskErrorWrapper(err, "get_task_failed", http.StatusInternalServerError)
		return
	}
	if !exist {
		taskResp = service.TaskErrorWrapperLocal(errors.New("task_not_exist"), "task_not_exist", http.StatusBadRequest)
		return
	}

	func() {
		channelModel, err2 := model.GetChannelById(originTask.ChannelId, true)
		if err2 != nil {
			return
		}
		baseURL := constant.ChannelBaseURLs[channelModel.Type]
		if channelModel.GetBaseURL() != "" {
			baseURL = channelModel.GetBaseURL()
		}
		proxy := channelModel.GetSetting().Proxy
		adaptor := GetTaskAdaptor(constant.TaskPlatform(strconv.Itoa(channelModel.Type)))
		if adaptor == nil {
			return
		}
		requestKey := channelModel.Key
		if strings.TrimSpace(originTask.PrivateData.Key) != "" {
			requestKey = originTask.PrivateData.Key
		} else if channelModel.ChannelInfo.IsMultiKey {
			nextKey, _, keyErr := channelModel.GetNextEnabledKey()
			if keyErr == nil && strings.TrimSpace(nextKey) != "" {
				requestKey = nextKey
			}
		}
		queryModel := strings.TrimSpace(originTask.Properties.UpstreamModelName)
		if queryModel == "" {
			queryModel = strings.TrimSpace(originTask.Properties.OriginModelName)
		}
		if queryModel == "" && len(originTask.Data) > 0 {
			var taskData map[string]any
			if err := common.Unmarshal(originTask.Data, &taskData); err == nil {
				if m, ok := taskData["model"].(string); ok {
					queryModel = strings.TrimSpace(m)
				}
			}
		}
		resp, err2 := adaptor.FetchTask(baseURL, requestKey, map[string]any{
			"task_id": originTask.TaskID,
			"action":  originTask.Action,
			"model":   queryModel,
		}, proxy)
		if err2 != nil || resp == nil {
			return
		}
		defer resp.Body.Close()
		body, err2 := io.ReadAll(resp.Body)
		if err2 != nil {
			return
		}
		ti, err2 := adaptor.ParseTaskResult(body)
		if err2 == nil && ti != nil {
			if ti.Status != "" {
				originTask.Status = model.TaskStatus(ti.Status)
			}
			if ti.Progress != "" {
				originTask.Progress = ti.Progress
			}
			if ti.Url != "" {
				if strings.HasPrefix(ti.Url, "data:") {
				} else {
					originTask.FailReason = ti.Url
				}
			}
			if ti.Reason != "" && (originTask.Status == model.TaskStatusFailure || originTask.FailReason == "") {
				originTask.FailReason = ti.Reason
			}
			_ = originTask.Update()
			var raw map[string]any
			_ = json.Unmarshal(body, &raw)
			format := "mp4"
			if respObj, ok := raw["response"].(map[string]any); ok {
				if vids, ok := respObj["videos"].([]any); ok && len(vids) > 0 {
					if v0, ok := vids[0].(map[string]any); ok {
						if mt, ok := v0["mimeType"].(string); ok && mt != "" {
							if strings.Contains(mt, "mp4") {
								format = "mp4"
							} else {
								format = mt
							}
						}
					}
				}
			}
			status := "processing"
			switch originTask.Status {
			case model.TaskStatusSuccess:
				status = "succeeded"
			case model.TaskStatusFailure:
				status = "failed"
			case model.TaskStatusQueued, model.TaskStatusSubmitted:
				status = "queued"
			}
			if !strings.HasPrefix(c.Request.RequestURI, "/v1/videos/") {
				out := map[string]any{
					"error":    nil,
					"format":   format,
					"metadata": nil,
					"status":   status,
					"task_id":  originTask.TaskID,
					"url":      originTask.FailReason,
				}
				respBody, _ = json.Marshal(dto.TaskResponse[any]{
					Code: "success",
					Data: out,
				})
			}
		}
	}()

	legacyVideoQuery := !strings.HasPrefix(c.Request.RequestURI, "/v1/videos/")
	if legacyVideoQuery && relayR2TakeoverEnabledForTask(originTask) {
		waitCtx, cancel := context.WithTimeout(c.Request.Context(), relayR2TakeoverWaitTimeout)
		defer cancel()

		if relayR2TakeoverInProgress(originTask) {
			nextTask, waitErr := relayR2TakeoverWaitTask(waitCtx, originTask.TaskID)
			if waitErr != nil {
				if fallbackBody, ok, fallbackErr := relayR2TakeoverBuildSoraFallbackResponse(originTask); fallbackErr == nil && ok {
					respBody = fallbackBody
					return
				}
				taskResp = service.TaskErrorWrapperLocal(fmt.Errorf("r2 transfer pending: %w", waitErr), "r2_transfer_failed", http.StatusBadGateway)
				return
			}
			originTask = nextTask
		}

		if originTask.Status == model.TaskStatusSuccess && !relayR2TakeoverHasR2Result(originTask) {
			nextTask, transferErr := relayR2TakeoverEnsureTask(waitCtx, originTask.TaskID)
			if transferErr != nil {
				if fallbackBody, ok, fallbackErr := relayR2TakeoverBuildSoraFallbackResponse(originTask); fallbackErr == nil && ok {
					respBody = fallbackBody
					return
				}
				taskResp = service.TaskErrorWrapperLocal(fmt.Errorf("r2 transfer failed: %w", transferErr), "r2_transfer_failed", http.StatusBadGateway)
				return
			}
			originTask = nextTask
			if !relayR2TakeoverHasR2Result(originTask) {
				if fallbackBody, ok, fallbackErr := relayR2TakeoverBuildSoraFallbackResponse(originTask); fallbackErr == nil && ok {
					respBody = fallbackBody
					return
				}
				taskResp = service.TaskErrorWrapperLocal(fmt.Errorf("r2 transfer failed: r2 url not available after transfer"), "r2_transfer_failed", http.StatusBadGateway)
				return
			}
		}

		latestTask, latestExist, latestErr := model.GetByTaskId(userId, taskId)
		if latestErr == nil && latestExist && latestTask != nil {
			originTask = latestTask
		}

		safeTask := originTask
		if relayR2TakeoverHasR2Result(originTask) {
			safeTask = relayR2TakeoverSanitizeTask(originTask)
		}
		if safeTask != nil && safeTask.Status == model.TaskStatusFailure {
			respBody, err = buildLegacyFailedVideoTaskResponse(safeTask)
			if err != nil {
				taskResp = service.TaskErrorWrapper(err, "marshal_response_failed", http.StatusInternalServerError)
			}
			return
		}
		respBody, err = common.Marshal(dto.TaskResponse[any]{
			Code: "success",
			Data: TaskModel2Dto(safeTask),
		})
		if err != nil {
			taskResp = service.TaskErrorWrapper(err, "marshal_response_failed", http.StatusInternalServerError)
		}
		return
	}

	if len(respBody) != 0 {
		return
	}

	if strings.HasPrefix(c.Request.RequestURI, "/v1/videos/") {
		adaptor := GetTaskAdaptor(originTask.Platform)
		if adaptor == nil {
			taskResp = service.TaskErrorWrapperLocal(fmt.Errorf("invalid channel id: %d", originTask.ChannelId), "invalid_channel_id", http.StatusBadRequest)
			return
		}
		if converter, ok := adaptor.(channel.OpenAIVideoConverter); ok {
			openAIVideoData, err := converter.ConvertToOpenAIVideo(originTask)
			if err != nil {
				taskResp = service.TaskErrorWrapper(err, "convert_to_openai_video_failed", http.StatusInternalServerError)
				return
			}
			respBody = openAIVideoData
			return
		}
		taskResp = service.TaskErrorWrapperLocal(errors.New(fmt.Sprintf("not_implemented:%s", originTask.Platform)), "not_implemented", http.StatusNotImplemented)
		return
	}
	respBody, err = json.Marshal(dto.TaskResponse[any]{
		Code: "success",
		Data: TaskModel2Dto(originTask),
	})
	if err != nil {
		taskResp = service.TaskErrorWrapper(err, "marshal_response_failed", http.StatusInternalServerError)
	}
	return
}

const (
	relayR2TakeoverWaitTimeout = 120 * time.Second
	relayR2TakeoverPollDelay   = 500 * time.Millisecond
)

var relayR2TakeoverGroup singleflight.Group

func relayR2TakeoverEnsureTask(ctx context.Context, taskID string) (*model.Task, error) {
	workerCtx, cancel := context.WithTimeout(context.Background(), relayR2TakeoverWaitTimeout)
	defer cancel()

	ch := relayR2TakeoverGroup.DoChan(taskID, func() (interface{}, error) {
		task, exist, err := model.GetByOnlyTaskId(taskID)
		if err != nil {
			return nil, err
		}
		if !exist || task == nil {
			return nil, fmt.Errorf("task %s not found", taskID)
		}

		if relayR2TakeoverInProgress(task) {
			task, err = relayR2TakeoverWaitTask(workerCtx, taskID)
			if err != nil {
				return nil, err
			}
		}
		if task.Status != model.TaskStatusSuccess {
			return task, nil
		}
		if relayR2TakeoverHasR2Result(task) {
			return task, nil
		}
		return relayR2TakeoverTransferTask(workerCtx, task)
	})

	select {
	case result := <-ch:
		if result.Err != nil {
			return nil, result.Err
		}
		task, ok := result.Val.(*model.Task)
		if !ok || task == nil {
			return nil, fmt.Errorf("invalid transfer result for task %s", taskID)
		}
		return task, nil
	case <-ctx.Done():
		return nil, fmt.Errorf("wait r2 transfer timeout: %w", ctx.Err())
	}
}

func relayR2TakeoverTransferTask(ctx context.Context, task *model.Task) (*model.Task, error) {
	if task == nil {
		return nil, errors.New("task is nil")
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

	type fieldRule struct {
		name      string
		objectKey string
		asMainURL bool
	}
	rules := []fieldRule{
		{name: "url", objectKey: fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID), asMainURL: true},
		{name: "video_url", objectKey: fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID), asMainURL: true},
		{name: "output_url", objectKey: fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID), asMainURL: true},
		{name: "image_url", objectKey: fmt.Sprintf("%s/%s_image.jpg", prefix, task.TaskID), asMainURL: false},
		{name: "thumbnail_url", objectKey: fmt.Sprintf("%s/%s_thumb.jpg", prefix, task.TaskID), asMainURL: false},
	}

	for _, rule := range rules {
		rawURL, ok := taskData[rule.name].(string)
		if !ok || strings.TrimSpace(rawURL) == "" {
			continue
		}
		sourceURL := rawURL
		if relayR2TakeoverIsSoraTask(task) && rule.asMainURL {
			sourceURL = relayNormalizeSoraUpstreamURL(rawURL)
		}
		if service.IsR2URL(rawURL) {
			if mainR2URL == "" && rule.asMainURL {
				mainR2URL = rawURL
			}
			continue
		}
		if strings.Contains(sourceURL, "/v1/videos/") {
			continue
		}
		res := service.TransferFileToR2(ctx, rule.objectKey, sourceURL)
		if !res.Success {
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
					mainKey := fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID)
					authKey := strings.TrimSpace(task.PrivateData.Key)
					if authKey == "" {
						authKey = strings.TrimSpace(transferChannel.Key)
					}
					if authKey == "" {
						return nil, fmt.Errorf("missing sora api key for protected transfer")
					}
					res := service.TransferAuthenticatedFileToR2(ctx, mainKey, task.FailReason, "Bearer "+authKey, transferChannel.GetSetting().Proxy)
					if !res.Success {
						return nil, fmt.Errorf("transfer protected main video failed: %w", res.Error)
					}
					task.FailReason = res.R2URL
					if mainR2URL == "" {
						mainR2URL = res.R2URL
					}
				}
			} else {
				mainKey := fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID)
				res := service.TransferFileToR2(ctx, mainKey, task.FailReason)
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
	return task, nil
}

func relayR2TakeoverWaitTask(ctx context.Context, taskID string) (*model.Task, error) {
	ticker := time.NewTicker(relayR2TakeoverPollDelay)
	defer ticker.Stop()

	for {
		task, exist, err := model.GetByOnlyTaskId(taskID)
		if err != nil {
			return nil, err
		}
		if !exist || task == nil {
			return nil, fmt.Errorf("task %s not found", taskID)
		}
		if !relayR2TakeoverInProgress(task) {
			return task, nil
		}

		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("wait transfer state timeout: %w", ctx.Err())
		case <-ticker.C:
		}
	}
}

func relayR2TakeoverInProgress(task *model.Task) bool {
	return task != nil && task.Status == model.TaskStatusInProgress && task.Progress == "95%"
}

func relayR2TakeoverHasR2Result(task *model.Task) bool {
	return relayR2TakeoverPrimaryR2URL(task) != ""
}

func relayR2TakeoverPrimaryR2URL(task *model.Task) string {
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
	for _, key := range []string{"url", "video_url", "output_url", "image_url", "thumbnail_url"} {
		v, ok := taskData[key].(string)
		if ok && v != "" && service.IsR2URL(v) {
			return v
		}
	}
	return ""
}

func relayR2TakeoverEnabledForTask(task *model.Task) bool {
	_ = task
	return storage_setting.IsVideoR2Enabled()
}

func relayR2TakeoverSanitizeTask(task *model.Task) *model.Task {
	if task == nil {
		return nil
	}
	safe := *task
	if !service.IsR2URL(safe.FailReason) {
		safe.FailReason = ""
	}
	if len(safe.Data) == 0 {
		return &safe
	}

	var taskData map[string]interface{}
	if err := common.Unmarshal(safe.Data, &taskData); err != nil {
		return &safe
	}

	changed := false
	for _, key := range []string{"url", "video_url", "output_url", "image_url", "thumbnail_url"} {
		v, ok := taskData[key].(string)
		if !ok || strings.TrimSpace(v) == "" {
			continue
		}
		if !service.IsR2URL(v) {
			delete(taskData, key)
			changed = true
		}
	}
	if changed {
		if b, err := common.Marshal(taskData); err == nil {
			safe.Data = b
		}
	}
	return &safe
}

func relayR2TakeoverIsSoraTask(task *model.Task) bool {
	if task == nil {
		return false
	}
	if task.Platform == constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeSora)) {
		return true
	}
	if strings.Contains(strings.ToLower(strings.TrimSpace(task.Properties.OriginModelName)), "sora") ||
		strings.Contains(strings.ToLower(strings.TrimSpace(task.Properties.UpstreamModelName)), "sora") {
		return true
	}
	if len(task.Data) == 0 {
		return false
	}
	var taskData map[string]interface{}
	if err := common.Unmarshal(task.Data, &taskData); err != nil {
		return false
	}
	if modelName, ok := taskData["model"].(string); ok && strings.Contains(strings.ToLower(strings.TrimSpace(modelName)), "sora") {
		return true
	}
	if metadata, ok := taskData["metadata"].(map[string]interface{}); ok {
		if permalink, ok := metadata["permalink"].(string); ok && strings.Contains(strings.ToLower(permalink), "sora") {
			return true
		}
	}
	return false
}

func relayR2TakeoverSoraFallbackURL(task *model.Task) string {
	if task == nil || len(task.Data) == 0 {
		return ""
	}

	var taskData map[string]interface{}
	if err := common.Unmarshal(task.Data, &taskData); err != nil {
		return ""
	}

	for _, key := range []string{"url", "video_url", "output_url"} {
		if v, ok := taskData[key].(string); ok && strings.TrimSpace(v) != "" && !service.IsR2URL(v) {
			return relayNormalizeSoraUpstreamURL(v)
		}
	}
	if metadata, ok := taskData["metadata"].(map[string]interface{}); ok {
		for _, key := range []string{"url", "video_url", "output_url"} {
			if v, ok := metadata[key].(string); ok && strings.TrimSpace(v) != "" && !service.IsR2URL(v) {
				return relayNormalizeSoraUpstreamURL(v)
			}
		}
	}
	if response, ok := taskData["response"].(map[string]interface{}); ok {
		for _, key := range []string{"url", "video_url", "output_url"} {
			if v, ok := response[key].(string); ok && strings.TrimSpace(v) != "" && !service.IsR2URL(v) {
				return relayNormalizeSoraUpstreamURL(v)
			}
		}
	}
	return ""
}

func relayNormalizeSoraUpstreamURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	rawURL = strings.Replace(rawURL, "https://videos.fluxai.us.ci/videos.openai.com/", "https://videos.openai.com/", 1)
	rawURL = strings.Replace(rawURL, "http://videos.fluxai.us.ci/videos.openai.com/", "https://videos.openai.com/", 1)
	return rawURL
}

func relayR2TakeoverBuildSoraFallbackResponse(task *model.Task) ([]byte, bool, error) {
	if !relayR2TakeoverIsSoraTask(task) {
		return nil, false, nil
	}
	fallbackURL := relayR2TakeoverSoraFallbackURL(task)
	if fallbackURL == "" {
		return nil, false, nil
	}

	body, err := common.Marshal(dto.TaskResponse[any]{
		Code: "success",
		Data: map[string]any{
			"error":    nil,
			"format":   "mp4",
			"metadata": nil,
			"status":   "succeeded",
			"task_id":  task.TaskID,
			"url":      fallbackURL,
		},
	})
	if err != nil {
		return nil, false, err
	}
	return body, true, nil
}

func buildLegacyFailedVideoTaskResponse(task *model.Task) ([]byte, error) {
	if task == nil {
		return common.Marshal(dto.TaskResponse[any]{
			Code: "success",
			Data: map[string]any{
				"error":    nil,
				"format":   "mp4",
				"metadata": nil,
				"status":   "failed",
				"task_id":  "",
				"url":      "",
			},
		})
	}
	failReason := service.ExtractTaskFailureReason(task.FailReason, task.Data)
	if failReason == "" {
		failReason = "task failed"
	}

	return common.Marshal(dto.TaskResponse[any]{
		Code: "success",
		Data: map[string]any{
			"error":    nil,
			"format":   "mp4",
			"metadata": nil,
			"status":   "failed",
			"task_id":  task.TaskID,
			"url":      failReason,
		},
	})
}

func TaskModel2Dto(task *model.Task) *dto.TaskDto {
	return &dto.TaskDto{
		TaskID:     task.TaskID,
		Action:     task.Action,
		Status:     string(task.Status),
		FailReason: task.FailReason,
		SubmitTime: task.SubmitTime,
		StartTime:  task.StartTime,
		FinishTime: task.FinishTime,
		Progress:   task.Progress,
		Data:       task.Data,
	}
}
