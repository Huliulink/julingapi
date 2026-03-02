package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/storage_setting"
)

const (
	r2MaxRetries    = 3
	r2RetryInterval = 2 * time.Second
)

// R2TransferResult holds the result of an R2 transfer attempt
type R2TransferResult struct {
	Success bool
	R2URL   string
	Error   error
}

// TransferVideoToR2 downloads a video from the original URL and uploads it to R2.
// Returns the R2 public URL on success, or empty string with error on failure.
func TransferVideoToR2(ctx context.Context, channelType int, taskID string, originalURL string) R2TransferResult {
	if !storage_setting.IsPlatformR2Enabled(channelType) {
		return R2TransferResult{Success: false, Error: fmt.Errorf("R2 not enabled for channel type %d", channelType)}
	}

	if !common.IsR2ClientReady() {
		return R2TransferResult{Success: false, Error: fmt.Errorf("R2 client not ready")}
	}

	if originalURL == "" || strings.HasPrefix(originalURL, "data:") {
		return R2TransferResult{Success: false, Error: fmt.Errorf("invalid video URL")}
	}

	platformPrefix := storage_setting.GetPlatformPrefix(channelType)
	objectKey := fmt.Sprintf("%s/%s.mp4", platformPrefix, taskID)

	var lastErr error
	for attempt := 1; attempt <= r2MaxRetries; attempt++ {
		if attempt > 1 {
			logger.LogWarn(ctx, fmt.Sprintf("R2 transfer retry %d/%d for task %s", attempt, r2MaxRetries, taskID))
			time.Sleep(r2RetryInterval)
		}

		err := downloadAndUpload(ctx, objectKey, originalURL)
		if err == nil {
			r2URL := common.GetR2PublicURL(objectKey)
			logger.LogInfo(ctx, fmt.Sprintf("R2 transfer success for task %s: %s", taskID, r2URL))
			return R2TransferResult{Success: true, R2URL: r2URL}
		}
		lastErr = err
		logger.LogError(ctx, fmt.Sprintf("R2 transfer attempt %d failed for task %s: %v", attempt, taskID, err))
	}

	logger.LogError(ctx, fmt.Sprintf("R2 transfer failed after %d retries for task %s, falling back to original URL", r2MaxRetries, taskID))
	return R2TransferResult{Success: false, Error: lastErr}
}

func downloadAndUpload(ctx context.Context, objectKey string, videoURL string) error {
	body, contentLength, contentType, err := common.DownloadFromURL(ctx, videoURL)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer body.Close()

	if err := common.UploadToR2(ctx, objectKey, body, contentLength, contentType); err != nil {
		return fmt.Errorf("upload to R2 failed: %w", err)
	}

	return nil
}

// DeleteVideoFromR2 deletes a video from R2 storage by its public URL.
func DeleteVideoFromR2(ctx context.Context, r2URL string) error {
	if !common.IsR2ClientReady() {
		return fmt.Errorf("R2 client not ready")
	}

	cfg := common.GetR2Config()
	domain := strings.TrimRight(cfg.CustomDomain, "/")
	if !strings.HasPrefix(r2URL, domain) {
		return fmt.Errorf("URL does not match R2 domain")
	}

	// Extract object key from URL: https://domain/platform/taskID.mp4 -> platform/taskID.mp4
	objectKey := strings.TrimPrefix(r2URL, domain+"/")

	return common.DeleteFromR2(ctx, objectKey)
}

// TransferFileToR2 downloads a file from originalURL and uploads to R2 with the given objectKey.
// Unlike TransferVideoToR2, this does not check platform enable status — caller is responsible.
func TransferFileToR2(ctx context.Context, objectKey string, originalURL string) R2TransferResult {
	if !common.IsR2ClientReady() {
		return R2TransferResult{Success: false, Error: fmt.Errorf("R2 client not ready")}
	}
	if originalURL == "" || strings.HasPrefix(originalURL, "data:") {
		return R2TransferResult{Success: false, Error: fmt.Errorf("invalid URL")}
	}

	var lastErr error
	for attempt := 1; attempt <= r2MaxRetries; attempt++ {
		if attempt > 1 {
			logger.LogWarn(ctx, fmt.Sprintf("R2 file transfer retry %d/%d for %s", attempt, r2MaxRetries, objectKey))
			time.Sleep(r2RetryInterval)
		}
		err := downloadAndUpload(ctx, objectKey, originalURL)
		if err == nil {
			r2URL := common.GetR2PublicURL(objectKey)
			logger.LogInfo(ctx, fmt.Sprintf("R2 file transfer success: %s -> %s", objectKey, r2URL))
			return R2TransferResult{Success: true, R2URL: r2URL}
		}
		lastErr = err
		logger.LogError(ctx, fmt.Sprintf("R2 file transfer attempt %d failed for %s: %v", attempt, objectKey, err))
	}
	return R2TransferResult{Success: false, Error: lastErr}
}

// IsR2URL checks if a URL is an R2 URL by matching the custom domain
func IsR2URL(url string) bool {
	cfg := common.GetR2Config()
	if cfg.CustomDomain == "" {
		return false
	}
	domain := strings.TrimRight(cfg.CustomDomain, "/")
	return strings.HasPrefix(url, domain)
}
