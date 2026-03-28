package service

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
)

func NormalizeSoraURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	rawURL = strings.Replace(rawURL, "https://videos.fluxai.us.ci/videos.openai.com/", "https://videos.openai.com/", 1)
	rawURL = strings.Replace(rawURL, "http://videos.fluxai.us.ci/videos.openai.com/", "https://videos.openai.com/", 1)
	return rawURL
}

func NormalizeSoraTaskPayloadBytes(body []byte) []byte {
	if len(body) == 0 {
		return body
	}

	var payload map[string]any
	if err := common.Unmarshal(body, &payload); err != nil || payload == nil {
		return body
	}

	changed := normalizeSoraTaskPayloadMap(payload)
	if !changed {
		return body
	}

	newBody, err := common.Marshal(payload)
	if err != nil {
		return body
	}
	return newBody
}

func normalizeSoraTaskPayloadMap(payload map[string]any) bool {
	if payload == nil {
		return false
	}

	changed := false
	normalizeMap := func(m map[string]any) {
		for _, key := range []string{"url", "video_url", "output_url"} {
			if rawURL, ok := m[key].(string); ok {
				normalized := NormalizeSoraURL(rawURL)
				if normalized != rawURL {
					m[key] = normalized
					changed = true
				}
			}
		}
	}

	normalizeMap(payload)
	for _, key := range []string{"metadata", "response", "data"} {
		if nested, ok := payload[key].(map[string]any); ok {
			normalizeMap(nested)
			if key == "data" {
				if taskResult, ok := nested["task_result"].(map[string]any); ok {
					if videos, ok := taskResult["videos"].([]any); ok {
						for _, item := range videos {
							if video, ok := item.(map[string]any); ok {
								normalizeMap(video)
							}
						}
					}
				}
			}
		}
	}

	return changed
}
