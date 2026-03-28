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

func TestResolveTaskFetchBaseURL(t *testing.T) {
	t.Parallel()

	jimengPlatform := constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeJimeng))
	if got := ResolveTaskFetchBaseURL(constant.ChannelTypeOpenAI, "", jimengPlatform); got != constant.ChannelBaseURLs[constant.ChannelTypeJimeng] {
		t.Fatalf("resolved jimeng fetch base url=%q", got)
	}

	customBaseURL := "https://api.177911.com"
	if got := ResolveTaskFetchBaseURL(constant.ChannelTypeOpenAI, customBaseURL, jimengPlatform); got != customBaseURL {
		t.Fatalf("resolved custom fetch base url=%q", got)
	}
}
