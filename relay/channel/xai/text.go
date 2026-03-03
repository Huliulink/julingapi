package xai

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/relay/channel/openai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/service"
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

	helper.SetEventStreamHeaders(c)

	helper.StreamScannerHandler(c, resp, info, func(data string) bool {
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
		err = helper.ObjectData(c, openaiResponse)
		if err != nil {
			common.SysLog(err.Error())
		}
		return true
	})

	if !containStreamUsage {
		usage = service.ResponseText2Usage(c, responseTextBuilder.String(), info.UpstreamModelName, info.GetEstimatePromptTokens())
		usage.CompletionTokens += toolCount * 7
	}

	helper.Done(c)
	service.CloseResponseBodyGracefully(resp)
	return usage, nil
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

	modelName := strings.TrimSpace(xaiResponse.Model)
	if modelName == "" && info != nil {
		modelName = strings.TrimSpace(info.UpstreamModelName)
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
