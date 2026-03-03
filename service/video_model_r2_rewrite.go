package service

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/storage_setting"
)

type VideoModelR2RewriteResult struct {
	Applied    bool
	SkipReason string
	Changed    bool
	Attempted  int
	Succeeded  int
}

var markdownImagePattern = regexp.MustCompile(`!\[([^\]]*)\]\((https?://[^\s)]+)\)`)
var singleURLPattern = regexp.MustCompile(`^\s*(https?://\S+)\s*$`)

// RewriteVideoModelAssistantMediaToR2 rewrites assistant image URLs to R2 for video models.
// It currently supports:
// 1) structured content item: {"type":"image_url","image_url":{"url":"..."}}
// 2) markdown image in text content: ![alt](https://...)
// 3) plain single URL text content: https://...
func RewriteVideoModelAssistantMediaToR2(ctx context.Context, modelName string, requestID string, choices []dto.OpenAITextResponseChoice) VideoModelR2RewriteResult {
	result := VideoModelR2RewriteResult{}
	if !storage_setting.IsVideoR2Enabled() {
		result.SkipReason = "video_r2_disabled"
		return result
	}

	if !IsVideoModelName(modelName) {
		result.SkipReason = "non_video_model"
		return result
	}

	result.Applied = true
	if requestID == "" {
		requestID = common.GetTimeString()
	}

	prefix := storage_setting.GetVideoR2Prefix()
	for choiceIdx := range choices {
		message := &choices[choiceIdx].Message
		mediaIdx := 0

		if message.IsStringContent() {
			rawText := message.StringContent()
			newText, attempted, succeeded := rewriteMarkdownImagesToR2(ctx, rawText, modelName, prefix, requestID, choiceIdx, &mediaIdx)
			result.Attempted += attempted
			result.Succeeded += succeeded
			if newText != rawText {
				message.SetStringContent(newText)
				result.Changed = true
			}
			continue
		}

		parts := message.ParseContent()
		if len(parts) == 0 {
			continue
		}

		choiceChanged := false
		for partIdx := range parts {
			part := &parts[partIdx]
			switch part.Type {
			case dto.ContentTypeImageURL:
				image := part.GetImageMedia()
				if image == nil {
					continue
				}
				rawURL := strings.TrimSpace(image.Url)
				if rawURL == "" || strings.HasPrefix(rawURL, "data:") || IsR2URL(rawURL) {
					continue
				}

				result.Attempted++
				mediaIdx++
				objectKey := fmt.Sprintf("%s/chat/%s_%d_%d%s", prefix, requestID, choiceIdx, mediaIdx, inferMediaExt(rawURL, ".jpg"))
				r2Result := TransferFileToR2(ctx, objectKey, rawURL)
				if !r2Result.Success {
					logger.LogWarn(ctx, fmt.Sprintf("video-model media rewrite failed: model=%s choice=%d part=%d err=%v", modelName, choiceIdx, partIdx, r2Result.Error))
					continue
				}

				image.Url = r2Result.R2URL
				part.ImageUrl = image
				result.Succeeded++
				choiceChanged = true
			case dto.ContentTypeText:
				if part.Text == "" {
					continue
				}
				newText, attempted, succeeded := rewriteMarkdownImagesToR2(ctx, part.Text, modelName, prefix, requestID, choiceIdx, &mediaIdx)
				result.Attempted += attempted
				result.Succeeded += succeeded
				if newText != part.Text {
					part.Text = newText
					choiceChanged = true
				}
			}
		}

		if choiceChanged {
			message.SetMediaContent(parts)
			result.Changed = true
		}
	}

	return result
}

func IsVideoModelName(modelName string) bool {
	return strings.Contains(strings.ToLower(strings.TrimSpace(modelName)), "video")
}

func rewriteMarkdownImagesToR2(ctx context.Context, text string, modelName string, prefix string, requestID string, choiceIdx int, mediaIdx *int) (string, int, int) {
	if text == "" {
		return text, 0, 0
	}

	attempted := 0
	succeeded := 0
	rewritten := text
	if markdownImagePattern.MatchString(rewritten) {
		rewritten = markdownImagePattern.ReplaceAllStringFunc(rewritten, func(match string) string {
			submatches := markdownImagePattern.FindStringSubmatch(match)
			if len(submatches) != 3 {
				return match
			}

			altText := submatches[1]
			rawURL := strings.TrimSpace(submatches[2])
			if rawURL == "" || strings.HasPrefix(rawURL, "data:") || IsR2URL(rawURL) {
				return match
			}

			attempted++
			*mediaIdx = *mediaIdx + 1
			objectKey := fmt.Sprintf("%s/chat/%s_%d_%d%s", prefix, requestID, choiceIdx, *mediaIdx, inferMediaExt(rawURL, ".jpg"))
			r2Result := TransferFileToR2(ctx, objectKey, rawURL)
			if !r2Result.Success {
				logger.LogWarn(ctx, fmt.Sprintf("video-model markdown image rewrite failed: model=%s choice=%d err=%v", modelName, choiceIdx, r2Result.Error))
				return match
			}

			succeeded++
			return fmt.Sprintf("![%s](%s)", altText, r2Result.R2URL)
		})
	}

	if attempted == 0 {
		single := singleURLPattern.FindStringSubmatch(strings.TrimSpace(rewritten))
		if len(single) == 2 {
			rawURL := strings.TrimSpace(single[1])
			if rawURL != "" && !strings.HasPrefix(rawURL, "data:") && !IsR2URL(rawURL) {
				attempted++
				*mediaIdx = *mediaIdx + 1
				objectKey := fmt.Sprintf("%s/chat/%s_%d_%d%s", prefix, requestID, choiceIdx, *mediaIdx, inferMediaExt(rawURL, ".jpg"))
				r2Result := TransferFileToR2(ctx, objectKey, rawURL)
				if r2Result.Success {
					succeeded++
					rewritten = strings.Replace(rewritten, rawURL, r2Result.R2URL, 1)
				} else {
					logger.LogWarn(ctx, fmt.Sprintf("video-model single-url rewrite failed: model=%s choice=%d err=%v", modelName, choiceIdx, r2Result.Error))
				}
			}
		}
	}

	return rewritten, attempted, succeeded
}

func inferMediaExt(rawURL string, fallback string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fallback
	}

	ext := strings.ToLower(path.Ext(parsed.Path))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".svg":
		return ext
	default:
		return fallback
	}
}
