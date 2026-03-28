package service

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/model"
)

func TestParseCompatibleVideoTaskResultCompleted(t *testing.T) {
	body := []byte(`{
		"completed_at": 1774706709,
		"created_at": 1774706682,
		"id": "task_Q76KQN5plk6G7uV696G02j9C1Owxo8yw",
		"model": "jimeng-video-3.0-10s",
		"object": "video",
		"progress": 100,
		"status": "completed",
		"task_id": "task_Q76KQN5plk6G7uV696G02j9C1Owxo8yw",
		"video_url": "https://oss.99267.net/video/task_Q76KQN5plk6G7uV696G02j9C1Owxo8yw.mp4"
	}`)

	taskInfo, normalized, compatible, err := ParseCompatibleVideoTaskResult(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !compatible {
		t.Fatalf("expected compatible payload")
	}
	if taskInfo == nil {
		t.Fatalf("expected task info")
	}
	if taskInfo.Status != string(model.TaskStatusSuccess) {
		t.Fatalf("unexpected status: %s", taskInfo.Status)
	}
	if taskInfo.Url == "" {
		t.Fatalf("expected video url")
	}
	if len(normalized) == 0 {
		t.Fatalf("expected normalized payload")
	}
}

func TestParseCompatibleVideoTaskResultUnknownWithoutURL(t *testing.T) {
	body := []byte(`{
		"id": "task_Q76KQN5plk6G7uV696G02j9C1Owxo8yw",
		"model": "jimeng-video-3.0-10s",
		"object": "video",
		"progress": 0,
		"status": "unknown"
	}`)

	taskInfo, _, compatible, err := ParseCompatibleVideoTaskResult(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !compatible {
		t.Fatalf("expected compatible payload")
	}
	if taskInfo == nil {
		t.Fatalf("expected task info")
	}
	if taskInfo.Status != string(model.TaskStatusInProgress) {
		t.Fatalf("unexpected status: %s", taskInfo.Status)
	}
}

func TestNormalizeCompatibleVideoTaskBodyUsesLocalTaskIDAndR2URL(t *testing.T) {
	body := []byte(`{
		"id": "task_upstream_123",
		"task_id": "task_upstream_123",
		"object": "video",
		"model": "jimeng-video-3.0-10s",
		"status": "unknown",
		"progress": 0,
		"metadata": {
			"url": "https://v16-cc.capcut.com/upstream.mp4",
			"id": "task_upstream_123",
			"status": "done"
		},
		"response": {
			"task_id": "task_upstream_123",
			"status": "in_queue"
		}
	}`)

	task := &model.Task{
		TaskID:     "task_local_456",
		Status:     model.TaskStatusSuccess,
		Progress:   "100%",
		FailReason: "https://oss.99267.net/video/task_local_456.mp4",
	}

	normalized, ok, err := NormalizeCompatibleVideoTaskBody(body, nil, task)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok {
		t.Fatalf("expected compatible payload")
	}

	output := string(normalized)
	for _, expected := range []string{
		`"id":"task_local_456"`,
		`"task_id":"task_local_456"`,
		`"status":"completed"`,
		`"video_url":"https://oss.99267.net/video/task_local_456.mp4"`,
		`"url":"https://oss.99267.net/video/task_local_456.mp4"`,
	} {
		if !strings.Contains(output, expected) {
			t.Fatalf("normalized payload missing %s: %s", expected, output)
		}
	}
	if strings.Contains(output, "task_upstream_123") {
		t.Fatalf("normalized payload leaked upstream task id: %s", output)
	}
	if strings.Contains(output, "https://v16-cc.capcut.com/") {
		t.Fatalf("normalized payload leaked upstream url: %s", output)
	}
	if strings.Contains(output, `"status":"unknown"`) || strings.Contains(output, `"status":"done"`) || strings.Contains(output, `"status":"in_queue"`) {
		t.Fatalf("normalized payload leaked non-standard status: %s", output)
	}
}
