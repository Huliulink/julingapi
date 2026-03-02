package common

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Config holds the Cloudflare R2 storage configuration
type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	CustomDomain    string // e.g. https://video.example.com
}

var (
	r2Client *s3.Client
	r2Config R2Config
	r2Mu     sync.RWMutex
)

// InitR2Client initializes or reinitializes the R2 S3 client
func InitR2Client(cfg R2Config) error {
	r2Mu.Lock()
	defer r2Mu.Unlock()

	if cfg.AccountID == "" || cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" || cfg.BucketName == "" {
		r2Client = nil
		r2Config = cfg
		return fmt.Errorf("R2 config incomplete, client not initialized")
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)

	r2Client = s3.New(s3.Options{
		Region:      "auto",
		Credentials: credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		BaseEndpoint: aws.String(endpoint),
	})

	r2Config = cfg
	SysLog("R2 storage client initialized successfully")
	return nil
}

// IsR2ClientReady checks if the R2 client is initialized and ready
func IsR2ClientReady() bool {
	r2Mu.RLock()
	defer r2Mu.RUnlock()
	return r2Client != nil
}

// GetR2Config returns a copy of the current R2 config
func GetR2Config() R2Config {
	r2Mu.RLock()
	defer r2Mu.RUnlock()
	return r2Config
}

// UploadToR2 uploads data to R2 storage
func UploadToR2(ctx context.Context, objectKey string, body io.Reader, contentLength int64, contentType string) error {
	r2Mu.RLock()
	client := r2Client
	bucket := r2Config.BucketName
	r2Mu.RUnlock()

	if client == nil {
		return fmt.Errorf("R2 client not initialized")
	}

	input := &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(objectKey),
		Body:   body,
	}
	if contentLength > 0 {
		input.ContentLength = aws.Int64(contentLength)
	}
	if contentType != "" {
		input.ContentType = aws.String(contentType)
	}

	_, err := client.PutObject(ctx, input)
	return err
}

// DeleteFromR2 deletes an object from R2 storage
func DeleteFromR2(ctx context.Context, objectKey string) error {
	r2Mu.RLock()
	client := r2Client
	bucket := r2Config.BucketName
	r2Mu.RUnlock()

	if client == nil {
		return fmt.Errorf("R2 client not initialized")
	}

	_, err := client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(objectKey),
	})
	return err
}

// GetR2PublicURL returns the public URL for an R2 object
func GetR2PublicURL(objectKey string) string {
	r2Mu.RLock()
	domain := r2Config.CustomDomain
	r2Mu.RUnlock()

	domain = strings.TrimRight(domain, "/")
	return domain + "/" + strings.TrimLeft(objectKey, "/")
}

// DownloadFromURL downloads content from a URL and returns the body, content length, and content type
func DownloadFromURL(ctx context.Context, url string) (io.ReadCloser, int64, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, 0, "", fmt.Errorf("create request failed: %w", err)
	}

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, "", fmt.Errorf("download failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, 0, "", fmt.Errorf("download returned status %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "video/mp4"
	}

	return resp.Body, resp.ContentLength, contentType, nil
}
