package common

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestApplyTaskModelMappingUsesMappedModel(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Set("model_mapping", `{"jimeng-video-3.5-pro-12s":"jimeng_v35_pro_12s"}`)

	info := &RelayInfo{
		OriginModelName: "jimeng-video-3.5-pro-12s",
	}
	req := &TaskSubmitReq{
		Model: "jimeng-video-3.5-pro-12s",
	}

	if err := applyTaskModelMapping(ctx, info, req); err != nil {
		t.Fatalf("applyTaskModelMapping error: %v", err)
	}
	if req.Model != "jimeng_v35_pro_12s" {
		t.Fatalf("req.Model=%q want jimeng_v35_pro_12s", req.Model)
	}
	if info.UpstreamModelName != "jimeng_v35_pro_12s" {
		t.Fatalf("info.UpstreamModelName=%q want jimeng_v35_pro_12s", info.UpstreamModelName)
	}
	if info.OriginModelName != "jimeng-video-3.5-pro-12s" {
		t.Fatalf("info.OriginModelName=%q want original model preserved", info.OriginModelName)
	}
}
