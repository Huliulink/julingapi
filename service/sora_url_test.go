package service

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestNormalizeSoraTaskPayloadBytes(t *testing.T) {
	t.Parallel()

	body, err := common.Marshal(map[string]any{
		"url": "https://videos.fluxai.us.ci/videos.openai.com/v/test.mp4",
		"metadata": map[string]any{
			"video_url": "http://videos.fluxai.us.ci/videos.openai.com/v/meta.mp4",
		},
		"data": map[string]any{
			"task_result": map[string]any{
				"videos": []any{
					map[string]any{
						"url": "https://videos.fluxai.us.ci/videos.openai.com/v/nested.mp4",
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}

	normalized := string(NormalizeSoraTaskPayloadBytes(body))
	if strings.Contains(normalized, "videos.fluxai.us.ci") {
		t.Fatalf("normalized payload still contains proxy host: %s", normalized)
	}
	if !strings.Contains(normalized, "https://videos.openai.com/") {
		t.Fatalf("normalized payload missing videos.openai.com: %s", normalized)
	}
}
