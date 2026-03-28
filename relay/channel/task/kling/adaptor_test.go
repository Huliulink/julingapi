package kling

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestParseTaskResultAcceptsExtendedStatuses(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name       string
		status     string
		wantStatus string
		wantProg   string
	}{
		{name: "queued", status: "queued", wantStatus: "SUBMITTED", wantProg: "10%"},
		{name: "running", status: "running", wantStatus: "IN_PROGRESS", wantProg: "50%"},
		{name: "unknown", status: "mystery", wantStatus: "IN_PROGRESS", wantProg: "30%"},
	}

	adaptor := &TaskAdaptor{}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			body, err := common.Marshal(map[string]any{
				"code": 0,
				"data": map[string]any{
					"task_id":     "task_1",
					"task_status": tc.status,
				},
			})
			if err != nil {
				t.Fatalf("marshal body: %v", err)
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
