package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/storage_setting"
)

type ImageR2RewriteResult struct {
	Applied    bool
	SkipReason string
	Changed    bool
	Attempted  int
	Succeeded  int
}

func RewriteImageResponseURLsToR2(ctx context.Context, requestID string, responseBody []byte) ([]byte, ImageR2RewriteResult, error) {
	result := ImageR2RewriteResult{}
	if !storage_setting.IsImageR2Enabled() {
		result.SkipReason = "image_r2_disabled"
		return responseBody, result, nil
	}

	result.Applied = true
	if len(responseBody) == 0 {
		result.SkipReason = "empty_response"
		return responseBody, result, nil
	}
	if requestID == "" {
		requestID = common.GetTimeString()
	}

	prefix := strings.Trim(storage_setting.GetImageR2Prefix(), "/")
	if prefix == "" {
		prefix = "images"
	}

	var imageResp dto.ImageResponse
	if err := common.Unmarshal(responseBody, &imageResp); err == nil && len(imageResp.Data) > 0 {
		for i := range imageResp.Data {
			rawURL := strings.TrimSpace(imageResp.Data[i].Url)
			if !isTransferableImageURL(rawURL) {
				continue
			}
			result.Attempted++
			objectKey := fmt.Sprintf("%s/%s_%d%s", prefix, requestID, i+1, inferMediaExt(rawURL, ".jpg"))
			transferResult := TransferFileToR2(ctx, objectKey, rawURL)
			if !transferResult.Success {
				logger.LogWarn(ctx, fmt.Sprintf("image response rewrite failed: idx=%d err=%v", i, transferResult.Error))
				continue
			}
			imageResp.Data[i].Url = transferResult.R2URL
			result.Succeeded++
			result.Changed = true
		}
		if result.Changed {
			newBody, marshalErr := common.Marshal(imageResp)
			if marshalErr != nil {
				return responseBody, result, marshalErr
			}
			return newBody, result, nil
		}
		return responseBody, result, nil
	}

	var bodyMap map[string]any
	if err := common.Unmarshal(responseBody, &bodyMap); err != nil {
		result.SkipReason = "unmarshal_failed"
		return responseBody, result, nil
	}
	dataItems, ok := bodyMap["data"].([]any)
	if !ok || len(dataItems) == 0 {
		result.SkipReason = "no_data_url"
		return responseBody, result, nil
	}

	for i := range dataItems {
		itemMap, ok := dataItems[i].(map[string]any)
		if !ok {
			continue
		}
		rawURL := strings.TrimSpace(common.Interface2String(itemMap["url"]))
		if !isTransferableImageURL(rawURL) {
			continue
		}
		result.Attempted++
		objectKey := fmt.Sprintf("%s/%s_%d%s", prefix, requestID, i+1, inferMediaExt(rawURL, ".jpg"))
		transferResult := TransferFileToR2(ctx, objectKey, rawURL)
		if !transferResult.Success {
			logger.LogWarn(ctx, fmt.Sprintf("image response map rewrite failed: idx=%d err=%v", i, transferResult.Error))
			continue
		}
		itemMap["url"] = transferResult.R2URL
		result.Succeeded++
		result.Changed = true
	}
	bodyMap["data"] = dataItems

	if result.Changed {
		newBody, marshalErr := common.Marshal(bodyMap)
		if marshalErr != nil {
			return responseBody, result, marshalErr
		}
		return newBody, result, nil
	}
	return responseBody, result, nil
}

func isTransferableImageURL(rawURL string) bool {
	if rawURL == "" {
		return false
	}
	if strings.HasPrefix(rawURL, "data:") || IsR2URL(rawURL) {
		return false
	}
	return strings.HasPrefix(rawURL, "http://") || strings.HasPrefix(rawURL, "https://")
}
