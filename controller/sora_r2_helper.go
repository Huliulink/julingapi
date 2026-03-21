package controller

import (
	"context"
	"strings"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
)

func soraProtectedTransferDetails(task *model.Task, channel *model.Channel) (string, string) {
	protectedURL := ""
	if task != nil && strings.Contains(task.FailReason, "/v1/videos/") {
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

func transferSoraMainURLToR2(ctx context.Context, task *model.Task, channel *model.Channel, objectKey string, rawURL string) service.R2TransferResult {
	protectedURL, authKey := soraProtectedTransferDetails(task, channel)
	proxy := ""
	if channel != nil {
		proxy = channel.GetSetting().Proxy
	}
	return service.TransferSoraMainFileToR2(ctx, objectKey, normalizeSoraUpstreamURL(rawURL), protectedURL, authKey, proxy)
}
