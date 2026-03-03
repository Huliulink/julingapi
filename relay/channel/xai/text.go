package xai

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/relay/channel/openai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/storage_setting"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

func streamResponseXAI2OpenAI(xAIResp *dto.ChatCompletionsStreamResponse, usage *dto.Usage) *dto.ChatCompletionsStreamResponse {
	if xAIResp == nil {
		return nil
	}
	if xAIResp.Usage != nil {
		xAIResp.Usage.CompletionTokens = usage.CompletionTokens
	}
	openAIResp := &dto.ChatCompletionsStreamResponse{
		Id:      xAIResp.Id,
		Object:  xAIResp.Object,
		Created: xAIResp.Created,
		Model:   xAIResp.Model,
		Choices: xAIResp.Choices,
		Usage:   xAIResp.Usage,
	}

	return openAIResp
}

func xAIStreamHandler(c *gin.Context, info *relaycommon.RelayInfo, resp *http.Response) (*dto.Usage, *types.NewAPIError) {
	usage := &dto.Usage{}
	var responseTextBuilder strings.Builder
	var toolCount int
	var containStreamUsage bool
	var streamItems []string
	rewriteModel := service.ResolveVideoRewriteModelName(info.UpstreamModelName, info.OriginModelName)
	delayVideoModelResponse := storage_setting.IsVideoR2Enabled() &&
		service.IsAnyVideoModelName(rewriteModel)

	helper.SetEventStreamHeaders(c)

	helper.StreamScannerHandler(c, resp, info, func(data string) bool {
		if strings.TrimSpace(data) == "" {
			return true
		}
		streamItems = append(streamItems, data)

		var xAIResp *dto.ChatCompletionsStreamResponse
		err := json.Unmarshal([]byte(data), &xAIResp)
		if err != nil {
			common.SysLog("error unmarshalling stream response: " + err.Error())
			return true
		}

		// 把 xAI 的usage转换为 OpenAI 的usage
		if xAIResp.Usage != nil {
			containStreamUsage = true
			usage.PromptTokens = xAIResp.Usage.PromptTokens
			usage.TotalTokens = xAIResp.Usage.TotalTokens
			usage.CompletionTokens = usage.TotalTokens - usage.PromptTokens
		}

		openaiResponse := streamResponseXAI2OpenAI(xAIResp, usage)
		_ = openai.ProcessStreamResponse(*openaiResponse, &responseTextBuilder, &toolCount)
		if !delayVideoModelResponse {
			err = helper.ObjectData(c, openaiResponse)
			if err != nil {
				common.SysLog(err.Error())
			}
		}
		return true
	})

	if !containStreamUsage {
		usage = service.ResponseText2Usage(c, responseTextBuilder.String(), info.UpstreamModelName, info.GetEstimatePromptTokens())
		usage.CompletionTokens += toolCount * 7
	}

	if delayVideoModelResponse {
		if err := emitDelayedXAIStreamResponse(c, info, streamItems, usage, containStreamUsage); err != nil {
			common.SysLog("emit delayed xAI stream response failed: " + err.Error())
			helper.Done(c)
		}
		service.CloseResponseBodyGracefully(resp)
		return usage, nil
	}

	helper.Done(c)
	service.CloseResponseBodyGracefully(resp)
	return usage, nil
}

func emitDelayedXAIStreamResponse(c *gin.Context, info *relaycommon.RelayInfo, streamItems []string, usage *dto.Usage, containStreamUsage bool) error {
	type aggChoice struct {
		index      int
		content    strings.Builder
		reasoning  strings.Builder
		finishCode string
	}

	responseID := helper.GetResponseID(c)
	createAt := int64(0)
	model := ""
	aggByIndex := make(map[int]*aggChoice)

	for _, item := range streamItems {
		if strings.TrimSpace(item) == "" {
			continue
		}
		var streamResp dto.ChatCompletionsStreamResponse
		if err := common.UnmarshalJsonStr(item, &streamResp); err != nil {
			continue
		}
		if streamResp.Id != "" {
			responseID = streamResp.Id
		}
		if streamResp.Created != 0 {
			createAt = streamResp.Created
		}
		if streamResp.Model != "" {
			model = streamResp.Model
		}

		for _, choice := range streamResp.Choices {
			ac, ok := aggByIndex[choice.Index]
			if !ok {
				ac = &aggChoice{index: choice.Index}
				aggByIndex[choice.Index] = ac
			}
			if reasoningDelta := choice.Delta.GetReasoningContent(); reasoningDelta != "" {
				ac.reasoning.WriteString(reasoningDelta)
			}
			if contentDelta := choice.Delta.GetContentString(); contentDelta != "" {
				ac.content.WriteString(contentDelta)
			}
			if choice.FinishReason != nil && *choice.FinishReason != "" {
				ac.finishCode = *choice.FinishReason
			}
		}
	}

	if model == "" {
		model = strings.TrimSpace(info.UpstreamModelName)
	}
	if createAt == 0 {
		createAt = common.GetTimestamp()
	}
	if len(aggByIndex) == 0 {
		helper.Done(c)
		return nil
	}

	indexes := make([]int, 0, len(aggByIndex))
	for idx := range aggByIndex {
		indexes = append(indexes, idx)
	}
	sort.Ints(indexes)

	choices := make([]dto.OpenAITextResponseChoice, 0, len(indexes))
	for _, idx := range indexes {
		ac := aggByIndex[idx]
		msg := dto.Message{Role: "assistant"}
		msg.SetStringContent(ac.content.String())
		msg.ReasoningContent = ac.reasoning.String()

		finish := ac.finishCode
		if finish == "" {
			finish = "stop"
		}
		choices = append(choices, dto.OpenAITextResponseChoice{
			Index:        idx,
			Message:      msg,
			FinishReason: finish,
		})
	}

	rewriteModel := service.ResolveVideoRewriteModelName(model, info.UpstreamModelName, info.OriginModelName)
	rewriteResult := service.RewriteVideoModelAssistantMediaToR2(c.Request.Context(), rewriteModel, c.GetString(common.RequestIdKey), choices)
	if !rewriteResult.Applied {
		if service.IsVideoModelName(rewriteModel) {
			logger.LogInfo(c.Request.Context(), fmt.Sprintf("xAI delayed stream video-model media rewrite skipped: model=%s reason=%s", rewriteModel, rewriteResult.SkipReason))
		}
	} else if rewriteResult.Attempted > 0 {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("xAI delayed stream video-model media rewrite result: model=%s attempted=%d succeeded=%d changed=%t",
			rewriteModel, rewriteResult.Attempted, rewriteResult.Succeeded, rewriteResult.Changed))
	}

	if err := helper.ObjectData(c, helper.GenerateStartEmptyResponse(responseID, createAt, model, nil)); err != nil {
		return err
	}

	for _, ch := range choices {
		if ch.Message.ReasoningContent != "" {
			delta := ch.Message.ReasoningContent
			chunk := &dto.ChatCompletionsStreamResponse{
				Id:      responseID,
				Object:  "chat.completion.chunk",
				Created: createAt,
				Model:   model,
				Choices: []dto.ChatCompletionsStreamResponseChoice{
					{
						Index: ch.Index,
						Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
							ReasoningContent: &delta,
						},
					},
				},
			}
			if err := helper.ObjectData(c, chunk); err != nil {
				return err
			}
		}

		content := ch.Message.StringContent()
		if content != "" {
			delta := content
			chunk := &dto.ChatCompletionsStreamResponse{
				Id:      responseID,
				Object:  "chat.completion.chunk",
				Created: createAt,
				Model:   model,
				Choices: []dto.ChatCompletionsStreamResponseChoice{
					{
						Index: ch.Index,
						Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
							Content: &delta,
						},
					},
				},
			}
			if err := helper.ObjectData(c, chunk); err != nil {
				return err
			}
		}
	}

	finishReason := choices[0].FinishReason
	if finishReason == "" {
		finishReason = "stop"
	}
	if err := helper.ObjectData(c, helper.GenerateStopResponse(responseID, createAt, model, finishReason)); err != nil {
		return err
	}
	if info != nil && info.ShouldIncludeUsage && !containStreamUsage && usage != nil {
		if err := helper.ObjectData(c, helper.GenerateFinalUsageResponse(responseID, createAt, model, *usage)); err != nil {
			return err
		}
	}
	helper.Done(c)
	return nil
}

func xAIHandler(c *gin.Context, info *relaycommon.RelayInfo, resp *http.Response) (*dto.Usage, *types.NewAPIError) {
	defer service.CloseResponseBodyGracefully(resp)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeBadResponseBody)
	}
	var xaiResponse ChatCompletionResponse
	err = common.Unmarshal(responseBody, &xaiResponse)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeBadResponseBody)
	}
	if xaiResponse.Usage != nil {
		xaiResponse.Usage.CompletionTokens = xaiResponse.Usage.TotalTokens - xaiResponse.Usage.PromptTokens
		xaiResponse.Usage.CompletionTokenDetails.TextTokens = xaiResponse.Usage.CompletionTokens - xaiResponse.Usage.CompletionTokenDetails.ReasoningTokens
	}
	rewriteVideoModelImageURLsToR2(c, info, &xaiResponse)

	// new body
	encodeJson, err := common.Marshal(xaiResponse)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeBadResponseBody)
	}

	service.IOCopyBytesGracefully(c, resp, encodeJson)

	return xaiResponse.Usage, nil
}

func rewriteVideoModelImageURLsToR2(c *gin.Context, info *relaycommon.RelayInfo, xaiResponse *ChatCompletionResponse) {
	if c == nil || xaiResponse == nil {
		return
	}

	modelName := xaiResponse.Model
	if info != nil {
		modelName = service.ResolveVideoRewriteModelName(modelName, info.UpstreamModelName, info.OriginModelName)
	}
	requestID := c.GetString(common.RequestIdKey)
	rewriteResult := service.RewriteVideoModelAssistantMediaToR2(c.Request.Context(), modelName, requestID, xaiResponse.Choices)
	if !rewriteResult.Applied {
		if service.IsVideoModelName(modelName) {
			logger.LogInfo(c.Request.Context(), fmt.Sprintf("xAI video-model media rewrite skipped: model=%s reason=%s", modelName, rewriteResult.SkipReason))
		} else {
			logger.LogDebug(c.Request.Context(), "xAI video-model media rewrite skipped: model=%s reason=%s", modelName, rewriteResult.SkipReason)
		}
		return
	}
	if rewriteResult.Attempted == 0 {
		logger.LogDebug(c.Request.Context(), "xAI video-model media rewrite applied but no transferable image found: model=%s", modelName)
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("xAI video-model media rewrite result: model=%s attempted=%d succeeded=%d changed=%t",
		modelName, rewriteResult.Attempted, rewriteResult.Succeeded, rewriteResult.Changed))
}
