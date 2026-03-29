package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
)

func TestSoraProtectedTransferDetailsUsesUpstreamContentURL(t *testing.T) {
	baseURL := "https://upstream.example.com"
	channel := &model.Channel{
		BaseURL: &baseURL,
		Key:     "upstream-key",
	}
	task := &model.Task{
		TaskID:     "task_demo_123",
		FailReason: "https://main.example.com/v1/videos/task_demo_123/content",
	}

	protectedURL, authKey := soraProtectedTransferDetails(task, channel)
	if protectedURL != "https://upstream.example.com/v1/videos/task_demo_123/content" {
		t.Fatalf("unexpected protected url: %s", protectedURL)
	}
	if authKey != "upstream-key" {
		t.Fatalf("unexpected auth key: %s", authKey)
	}
}
