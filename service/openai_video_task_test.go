package service

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func TestBuildSyntheticOpenAIVideoPendingPayloadPromotesStaleQueuedTask(t *testing.T) {
	task := &model.Task{
		TaskID:     "task_demo_123",
		CreatedAt:  time.Now().Unix() - 600,
		SubmitTime: time.Now().Unix() - 600,
		Status:     model.TaskStatusQueued,
		Progress:   "20%",
		Properties: model.Properties{
			OriginModelName: "veo3.1_fast",
		},
	}

	body, taskStatus, progress, err := BuildSyntheticOpenAIVideoPendingPayload(task)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if taskStatus != string(model.TaskStatusInProgress) {
		t.Fatalf("unexpected task status: %s", taskStatus)
	}
	if progress != "30%" {
		t.Fatalf("unexpected progress: %s", progress)
	}

	var payload map[string]any
	if err := common.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal payload failed: %v", err)
	}
	if payload["status"] != "processing" {
		t.Fatalf("unexpected payload status: %v", payload["status"])
	}
	if payload["progress"] != float64(30) {
		t.Fatalf("unexpected payload progress: %v", payload["progress"])
	}
}
