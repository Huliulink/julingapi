package service

import (
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
