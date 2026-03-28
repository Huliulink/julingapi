package relay

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func setTestR2Domain() {
	_ = common.InitR2Client(common.R2Config{
		CustomDomain: "https://cdn.example.com/r2",
	})
}

func TestDetectVideoFetchRequestKind(t *testing.T) {
	cases := map[string]string{
		"/v1/videos/task_123":                 videoFetchRequestKindOpenAI,
		"/v1/video/generations/task_123":      videoFetchRequestKindLegacy,
		"/jimeng/?Action=CVSync2AsyncGetResult": videoFetchRequestKindJimeng,
		"/kling/v1/videos/text2video/task_123":  videoFetchRequestKindKling,
	}

	for requestURI, expected := range cases {
		if actual := detectVideoFetchRequestKind(requestURI); actual != expected {
			t.Fatalf("detectVideoFetchRequestKind(%q) = %q, want %q", requestURI, actual, expected)
		}
	}
}

func TestBuildJimengCompatibleVideoTaskResponseRewritesToR2(t *testing.T) {
	setTestR2Domain()

	task := &model.Task{
		TaskID:     "task_jimeng_1",
		Status:     model.TaskStatusSuccess,
		FailReason: "https://cdn.example.com/r2/task_jimeng_1.mp4",
	}
	task.SetData(map[string]any{
		"code":    10000,
		"message": "success",
		"data": map[string]any{
			"status":    "done",
			"video_url": "https://origin.example.com/task_jimeng_1.mp4",
		},
	})

	body, err := buildJimengCompatibleVideoTaskResponse(task, nil)
	if err != nil {
		t.Fatalf("buildJimengCompatibleVideoTaskResponse error: %v", err)
	}

	var payload map[string]any
	if err := common.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal jimeng payload error: %v", err)
	}
	data := payload["data"].(map[string]any)
	if got := data["video_url"]; got != task.FailReason {
		t.Fatalf("jimeng video_url = %v, want %v", got, task.FailReason)
	}
	if got := data["status"]; got != "done" {
		t.Fatalf("jimeng status = %v, want done", got)
	}
}

func TestBuildKlingCompatibleVideoTaskResponseRewritesToR2(t *testing.T) {
	setTestR2Domain()

	task := &model.Task{
		TaskID:     "task_kling_1",
		Status:     model.TaskStatusSuccess,
		FailReason: "https://cdn.example.com/r2/task_kling_1.mp4",
	}
	task.SetData(map[string]any{
		"code":    0,
		"message": "success",
		"data": map[string]any{
			"task_id":     "task_kling_1",
			"task_status": "succeed",
			"task_result": map[string]any{
				"videos": []any{
					map[string]any{
						"url": "https://origin.example.com/task_kling_1.mp4",
					},
				},
			},
		},
	})

	body, err := buildKlingCompatibleVideoTaskResponse(task, nil)
	if err != nil {
		t.Fatalf("buildKlingCompatibleVideoTaskResponse error: %v", err)
	}

	var payload map[string]any
	if err := common.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal kling payload error: %v", err)
	}
	data := payload["data"].(map[string]any)
	taskResult := data["task_result"].(map[string]any)
	videos := taskResult["videos"].([]any)
	video := videos[0].(map[string]any)
	if got := video["url"]; got != task.FailReason {
		t.Fatalf("kling video url = %v, want %v", got, task.FailReason)
	}
	if got := data["task_status"]; got != "succeed" {
		t.Fatalf("kling task_status = %v, want succeed", got)
	}
}

func TestBuildLegacyCompatibleVideoTaskResponseUsesSuccessURL(t *testing.T) {
	task := &model.Task{
		TaskID:     "task_legacy_1",
		Status:     model.TaskStatusSuccess,
		FailReason: "https://origin.example.com/task_legacy_1.mp4",
	}

	body, err := buildLegacyCompatibleVideoTaskResponse(task, nil)
	if err != nil {
		t.Fatalf("buildLegacyCompatibleVideoTaskResponse error: %v", err)
	}

	var payload struct {
		Code string         `json:"code"`
		Data map[string]any `json:"data"`
	}
	if err := common.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal legacy payload error: %v", err)
	}
	if got := payload.Data["url"]; got != task.FailReason {
		t.Fatalf("legacy url = %v, want %v", got, task.FailReason)
	}
	if got := payload.Data["status"]; got != "succeeded" {
		t.Fatalf("legacy status = %v, want succeeded", got)
	}
}

func TestBuildLegacyCompatibleVideoTaskResponseUsesFailureReason(t *testing.T) {
	task := &model.Task{
		TaskID:     "task_legacy_failed",
		Status:     model.TaskStatusFailure,
		FailReason: "upstream failed",
	}

	body, err := buildLegacyCompatibleVideoTaskResponse(task, nil)
	if err != nil {
		t.Fatalf("buildLegacyCompatibleVideoTaskResponse error: %v", err)
	}

	var payload struct {
		Code string         `json:"code"`
		Data map[string]any `json:"data"`
	}
	if err := common.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal legacy failed payload error: %v", err)
	}
	if got := payload.Data["url"]; got != task.FailReason {
		t.Fatalf("legacy failed url = %v, want %v", got, task.FailReason)
	}
	if got := payload.Data["status"]; got != "failed" {
		t.Fatalf("legacy failed status = %v, want failed", got)
	}
}
