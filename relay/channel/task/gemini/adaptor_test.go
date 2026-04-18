package gemini

import (
	"testing"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/model_setting"
)

func TestResolveGeminiTaskSubmitModelNamePrefersUpstreamModel(t *testing.T) {
	info := &relaycommon.RelayInfo{
		OriginModelName:   "veo3.1_fast",
		UpstreamModelName: "veo-3.1-fast-generate-preview",
	}

	modelName := resolveGeminiTaskSubmitModelName(info)
	if modelName != "veo-3.1-fast-generate-preview" {
		t.Fatalf("expected upstream model name, got %q", modelName)
	}
}

func TestResolveGeminiTaskFetchURLUsesOperationModelVersion(t *testing.T) {
	versionSettings := model_setting.GetGeminiSettings().VersionSettings
	originalVersion := versionSettings["veo-3.1-fast-generate-preview"]
	versionSettings["veo-3.1-fast-generate-preview"] = "v1"
	t.Cleanup(func() {
		if originalVersion == "" {
			delete(versionSettings, "veo-3.1-fast-generate-preview")
			return
		}
		versionSettings["veo-3.1-fast-generate-preview"] = originalVersion
	})

	taskID := encodeLocalTaskID("models/veo-3.1-fast-generate-preview/operations/abc123")
	url, err := resolveGeminiTaskFetchURL("https://generativelanguage.googleapis.com", taskID, map[string]any{
		"model": "veo3.1_fast",
	})
	if err != nil {
		t.Fatalf("resolveGeminiTaskFetchURL returned error: %v", err)
	}

	expected := "https://generativelanguage.googleapis.com/v1/models/veo-3.1-fast-generate-preview/operations/abc123"
	if url != expected {
		t.Fatalf("expected url %q, got %q", expected, url)
	}
}

func TestResolveGeminiTaskFetchURLFallsBackToBodyModel(t *testing.T) {
	versionSettings := model_setting.GetGeminiSettings().VersionSettings
	originalVersion := versionSettings["veo-3.1-fast-generate-preview"]
	versionSettings["veo-3.1-fast-generate-preview"] = "v1"
	t.Cleanup(func() {
		if originalVersion == "" {
			delete(versionSettings, "veo-3.1-fast-generate-preview")
			return
		}
		versionSettings["veo-3.1-fast-generate-preview"] = originalVersion
	})

	taskID := encodeLocalTaskID("operations/abc123")
	url, err := resolveGeminiTaskFetchURL("https://generativelanguage.googleapis.com", taskID, map[string]any{
		"model": "veo-3.1-fast-generate-preview",
	})
	if err != nil {
		t.Fatalf("resolveGeminiTaskFetchURL returned error: %v", err)
	}

	expected := "https://generativelanguage.googleapis.com/v1/operations/abc123"
	if url != expected {
		t.Fatalf("expected url %q, got %q", expected, url)
	}
}

func TestBuildRequestURLUsesUpstreamMappedModelVersion(t *testing.T) {
	versionSettings := model_setting.GetGeminiSettings().VersionSettings
	originalVersion := versionSettings["veo-3.1-fast-generate-preview"]
	versionSettings["veo-3.1-fast-generate-preview"] = "v1"
	t.Cleanup(func() {
		if originalVersion == "" {
			delete(versionSettings, "veo-3.1-fast-generate-preview")
			return
		}
		versionSettings["veo-3.1-fast-generate-preview"] = originalVersion
	})

	adaptor := &TaskAdaptor{baseURL: "https://generativelanguage.googleapis.com"}
	url, err := adaptor.BuildRequestURL(&relaycommon.RelayInfo{
		OriginModelName:   "veo3.1_fast",
		UpstreamModelName: "veo-3.1-fast-generate-preview",
	})
	if err != nil {
		t.Fatalf("BuildRequestURL returned error: %v", err)
	}

	expected := "https://generativelanguage.googleapis.com/v1/models/veo-3.1-fast-generate-preview:predictLongRunning"
	if url != expected {
		t.Fatalf("expected url %q, got %q", expected, url)
	}
}
