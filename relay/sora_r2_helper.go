package relay

import (
	"context"
	"strings"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
)

func relayBuildSoraProtectedContentURL(task *model.Task, channel *model.Channel) string {
	if task == nil || channel == nil {
		return ""
	}
	taskID := service.PreferredUpstreamVideoTaskID(task)
	if taskID == "" {
		return ""
	}
	baseURL := strings.TrimRight(strings.TrimSpace(channel.GetBaseURL()), "/")
	if baseURL == "" {
		if channel.Type >= 0 && channel.Type < len(constant.ChannelBaseURLs) {
			baseURL = strings.TrimRight(strings.TrimSpace(constant.ChannelBaseURLs[channel.Type]), "/")
		}
	}
	if baseURL == "" {
		return ""
	}
	return baseURL + "/v1/videos/" + taskID + "/content"
}

func relaySoraProtectedTransferDetails(task *model.Task, channel *model.Channel) (string, string) {
	protectedURL := ""
	if upstreamProtectedURL := relayBuildSoraProtectedContentURL(task, channel); upstreamProtectedURL != "" {
		protectedURL = upstreamProtectedURL
	} else if task != nil && strings.Contains(task.FailReason, "/v1/videos/") {
		protectedURL = strings.TrimSpace(task.FailReason)
	}

	authKey := ""
	if task != nil {
		authKey = strings.TrimSpace(task.PrivateData.Key)
	}
	if authKey == "" && channel != nil {
		authKey = strings.TrimSpace(channel.Key)
	}
	return protectedURL, authKey
}

func relayTransferSoraMainURLToR2(ctx context.Context, task *model.Task, channel *model.Channel, objectKey string, rawURL string) service.R2TransferResult {
	protectedURL, authKey := relaySoraProtectedTransferDetails(task, channel)
	proxy := ""
	if channel != nil {
		proxy = channel.GetSetting().Proxy
	}
	return service.TransferSoraMainFileToR2(ctx, objectKey, relayNormalizeSoraUpstreamURL(rawURL), protectedURL, authKey, proxy)
}
