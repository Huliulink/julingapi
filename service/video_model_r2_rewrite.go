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

var markdownLinkPattern = regexp.MustCompile(`(!?)\[([^\]]*)\]\((https?://[^\s)]+)\)`)
var singleURLPattern = regexp.MustCompile(`^\s*(https?://\S+)\s*$`)
var inlineURLPattern = regexp.MustCompile(`https?://[^\s\])>]+`)

// RewriteVideoModelAssistantMediaToR2 rewrites assistant media URLs to R2 for video models.
// It covers structured image_url content, markdown links, inline URLs and reasoning fields.
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
		choiceChanged := false
		rewrittenBySourceURL := make(map[string]string)

		if message.IsStringContent() {
			rawText := message.StringContent()
			newText, attempted, succeeded := rewriteTextURLsToR2(
				ctx, rawText, modelName, prefix, requestID, choiceIdx, &mediaIdx, rewrittenBySourceURL,
			)
			result.Attempted += attempted
			result.Succeeded += succeeded
			if newText != rawText {
				message.SetStringContent(newText)
				choiceChanged = true
			}
		} else {
			parts := message.ParseContent()
			for partIdx := range parts {
				part := &parts[partIdx]
				switch part.Type {
				case dto.ContentTypeImageURL:
					image := part.GetImageMedia()
					if image == nil {
						continue
					}
					newURL, transferred := transferVideoModelURLToR2(
						ctx, strings.TrimSpace(image.Url), modelName, prefix, requestID, choiceIdx, partIdx, &mediaIdx, rewrittenBySourceURL,
					)
					if !transferred {
						continue
					}
					image.Url = newURL
					part.ImageUrl = image
					result.Attempted++
					result.Succeeded++
					choiceChanged = true
				case dto.ContentTypeText:
					if part.Text == "" {
						continue
					}
					newText, attempted, succeeded := rewriteTextURLsToR2(
						ctx, part.Text, modelName, prefix, requestID, choiceIdx, &mediaIdx, rewrittenBySourceURL,
					)
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
			}
		}

		// Some xAI video models place preview links in reasoning fields.
		if message.ReasoningContent != "" {
			newReasoningContent, attempted, succeeded := rewriteTextURLsToR2(
				ctx, message.ReasoningContent, modelName, prefix, requestID, choiceIdx, &mediaIdx, rewrittenBySourceURL,
			)
			result.Attempted += attempted
			result.Succeeded += succeeded
			if newReasoningContent != message.ReasoningContent {
				message.ReasoningContent = newReasoningContent
				choiceChanged = true
			}
		}
		if message.Reasoning != "" {
			newReasoning, attempted, succeeded := rewriteTextURLsToR2(
				ctx, message.Reasoning, modelName, prefix, requestID, choiceIdx, &mediaIdx, rewrittenBySourceURL,
			)
			result.Attempted += attempted
			result.Succeeded += succeeded
			if newReasoning != message.Reasoning {
				message.Reasoning = newReasoning
				choiceChanged = true
			}
		}

		if choiceChanged {
			result.Changed = true
		}
	}

	return result
}

func IsVideoModelName(modelName string) bool {
	return strings.Contains(strings.ToLower(strings.TrimSpace(modelName)), "video")
}

func rewriteTextURLsToR2(
	ctx context.Context,
	text string,
	modelName string,
	prefix string,
	requestID string,
	choiceIdx int,
	mediaIdx *int,
	rewrittenBySourceURL map[string]string,
) (string, int, int) {
	if text == "" {
		return text, 0, 0
	}

	attempted := 0
	succeeded := 0
	rewritten := text
	if markdownLinkPattern.MatchString(rewritten) {
		rewritten = markdownLinkPattern.ReplaceAllStringFunc(rewritten, func(match string) string {
			submatches := markdownLinkPattern.FindStringSubmatch(match)
			if len(submatches) != 4 {
				return match
			}

			prefixMark := submatches[1]
			linkText := submatches[2]
			rawURL := strings.TrimSpace(submatches[3])
			newURL, transferred := transferVideoModelURLToR2(
				ctx, rawURL, modelName, prefix, requestID, choiceIdx, -1, mediaIdx, rewrittenBySourceURL,
			)
			if !transferred {
				return match
			}
			attempted++
			succeeded++
			return fmt.Sprintf("%s[%s](%s)", prefixMark, linkText, newURL)
		})
	}

	if inlineURLPattern.MatchString(rewritten) {
		rewritten = inlineURLPattern.ReplaceAllStringFunc(rewritten, func(rawURLToken string) string {
			rawURL, trailing := splitTrailingURLPunct(rawURLToken)
			newURL, transferred := transferVideoModelURLToR2(
				ctx, strings.TrimSpace(rawURL), modelName, prefix, requestID, choiceIdx, -1, mediaIdx, rewrittenBySourceURL,
			)
			if !transferred {
				return rawURLToken
			}
			attempted++
			succeeded++
			return newURL + trailing
		})
	}

	if attempted == 0 {
		single := singleURLPattern.FindStringSubmatch(strings.TrimSpace(rewritten))
		if len(single) == 2 {
			rawURL := strings.TrimSpace(single[1])
			newURL, transferred := transferVideoModelURLToR2(
				ctx, rawURL, modelName, prefix, requestID, choiceIdx, -1, mediaIdx, rewrittenBySourceURL,
			)
			if transferred {
				attempted++
				succeeded++
				rewritten = strings.Replace(rewritten, rawURL, newURL, 1)
			}
		}
	}

	return rewritten, attempted, succeeded
}

func transferVideoModelURLToR2(
	ctx context.Context,
	rawURL string,
	modelName string,
	prefix string,
	requestID string,
	choiceIdx int,
	partIdx int,
	mediaIdx *int,
	rewrittenBySourceURL map[string]string,
) (string, bool) {
	if rawURL == "" || strings.HasPrefix(rawURL, "data:") || IsR2URL(rawURL) {
		return rawURL, false
	}
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		return rawURL, false
	}

	if cached, ok := rewrittenBySourceURL[rawURL]; ok {
		return cached, cached != rawURL
	}

	*mediaIdx = *mediaIdx + 1
	objectKey := fmt.Sprintf("%s/chat/%s_%d_%d%s", prefix, requestID, choiceIdx, *mediaIdx, inferMediaExt(rawURL, ".jpg"))
	r2Result := TransferFileToR2(ctx, objectKey, rawURL)
	if !r2Result.Success {
		if partIdx >= 0 {
			logger.LogWarn(ctx, fmt.Sprintf("video-model media rewrite failed: model=%s choice=%d part=%d err=%v", modelName, choiceIdx, partIdx, r2Result.Error))
		} else {
			logger.LogWarn(ctx, fmt.Sprintf("video-model url rewrite failed: model=%s choice=%d err=%v", modelName, choiceIdx, r2Result.Error))
		}
		rewrittenBySourceURL[rawURL] = rawURL
		return rawURL, false
	}

	rewrittenBySourceURL[rawURL] = r2Result.R2URL
	return r2Result.R2URL, true
}

func splitTrailingURLPunct(raw string) (string, string) {
	if raw == "" {
		return raw, ""
	}
	runes := []rune(raw)
	cut := len(runes)
	for cut > 0 {
		r := runes[cut-1]
		if r == '.' || r == ',' || r == ';' || r == ':' || r == '!' || r == '?' || r == ')' || r == ']' || r == '}' ||
			r == '\u3002' || r == '\uff0c' || r == '\uff1b' || r == '\uff1a' || r == '\uff01' || r == '\uff1f' {
			cut--
			continue
		}
		break
	}
	return string(runes[:cut]), string(runes[cut:])
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
