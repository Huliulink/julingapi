package relay

import (
	"strconv"
	"testing"

	"github.com/QuantumNous/new-api/constant"
)

func TestResolveTaskFetchPlatformFromVideoModel(t *testing.T) {
	t.Parallel()

	if got := ResolveTaskFetchPlatform(constant.ChannelTypeOpenAI, "jimeng-video-3.5-pro-12s"); got != constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeJimeng)) {
		t.Fatalf("jimeng fetch platform=%q", got)
	}
	if got := ResolveTaskFetchPlatform(constant.ChannelTypeOpenAI, "kling-v1"); got != constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeKling)) {
		t.Fatalf("kling fetch platform=%q", got)
	}
	if got := ResolveTaskFetchPlatform(constant.ChannelTypeOpenAI, "sora-2"); got != constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeSora)) {
		t.Fatalf("sora fetch platform=%q", got)
	}
}
