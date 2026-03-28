package jimeng

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
)

func TestParseTaskResultRecognizesCommonStatuses(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name       string
		payload    map[string]any
		wantStatus string
		wantProg   string
	}{
		{
			name: "queued",
			payload: map[string]any{
				"code": 10000,
				"data": map[string]any{"status": "queued"},
			},
			wantStatus: "QUEUED",
			wantProg:   "10%",
		},
		{
			name: "processing",
			payload: map[string]any{
				"code": 10000,
				"data": map[string]any{"status": "processing"},
			},
			wantStatus: "IN_PROGRESS",
			wantProg:   "50%",
		},
		{
			name: "done without url",
			payload: map[string]any{
				"code": 10000,
				"data": map[string]any{"status": "done"},
			},
			wantStatus: "IN_PROGRESS",
			wantProg:   "95%",
		},
		{
			name: "done with url",
			payload: map[string]any{
				"code": 10000,
				"data": map[string]any{"status": "done", "video_url": "https://example.com/video.mp4"},
			},
			wantStatus: "SUCCESS",
			wantProg:   "100%",
		},
		{
			name: "status from resp_data",
			payload: map[string]any{
				"code": 10000,
				"data": map[string]any{
					"resp_data": `{"status":"processing"}`,
				},
			},
			wantStatus: "IN_PROGRESS",
			wantProg:   "50%",
		},
	}

	adaptor := &TaskAdaptor{}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			body, err := common.Marshal(tc.payload)
			if err != nil {
				t.Fatalf("marshal payload: %v", err)
			}
			taskInfo, err := adaptor.ParseTaskResult(body)
			if err != nil {
				t.Fatalf("ParseTaskResult error: %v", err)
			}
			if string(taskInfo.Status) != tc.wantStatus {
				t.Fatalf("status=%q want %q", taskInfo.Status, tc.wantStatus)
			}
			if taskInfo.Progress != tc.wantProg {
				t.Fatalf("progress=%q want %q", taskInfo.Progress, tc.wantProg)
			}
		})
	}
}

func TestParseTaskResultAcceptsStringCode(t *testing.T) {
	t.Parallel()

	body, err := common.Marshal(map[string]any{
		"code": "10000",
		"data": map[string]any{
			"status": "processing",
		},
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	taskInfo, err := (&TaskAdaptor{}).ParseTaskResult(body)
	if err != nil {
		t.Fatalf("ParseTaskResult error: %v", err)
	}
	if string(taskInfo.Status) != "IN_PROGRESS" {
		t.Fatalf("status=%q want IN_PROGRESS", taskInfo.Status)
	}
}

func TestBuildRequestBodyPersistsResolvedReqKey(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Set("task_request", relaycommon.TaskSubmitReq{
		Model:  "jimeng_v30_pro",
		Prompt: "test",
	})

	info := &relaycommon.RelayInfo{
		UpstreamModelName: "jimeng_v30_pro",
	}
	adaptor := &TaskAdaptor{}
	if _, err := adaptor.BuildRequestBody(ctx, info); err != nil {
		t.Fatalf("BuildRequestBody error: %v", err)
	}
	if info.UpstreamModelName != "jimeng_ti2v_v30_pro" {
		t.Fatalf("upstream model=%q want jimeng_ti2v_v30_pro", info.UpstreamModelName)
	}
}
