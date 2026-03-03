package storage_setting

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/setting/config"
)

// StorageSetting R2 云存储配置
type StorageSetting struct {
	// Global R2 config
	R2AccountID       string `json:"r2_account_id"`
	R2AccessKeyID     string `json:"r2_access_key_id"`
	R2SecretAccessKey string `json:"r2_secret_access_key"`
	R2BucketName      string `json:"r2_bucket_name"`
	R2CustomDomain    string `json:"r2_custom_domain"`
	// Auto-delete days for video-class transferred objects under video prefix.
	// 0 means keep permanently.
	R2AutoDeleteDays int `json:"r2_auto_delete_days"`

	// Image R2 settings
	ImageR2Enable         bool   `json:"image_r2_enable"`
	ImageR2Prefix         string `json:"image_r2_prefix"`            // default "images"
	ImageR2AutoDeleteDays int    `json:"image_r2_auto_delete_days"`  // 0 = permanent

	// Global video R2 switch: intercepts GET /v1/videos/:id at query time,
	// works for ALL channel types (OpenAI compatible, xAI, etc.)
	VideoR2Enable bool   `json:"video_r2_enable"`
	VideoR2Prefix string `json:"video_r2_prefix"` // e.g. "grok", "video" – default "video"
	// Playground forward switch: when enabled, /pg requests are rewritten to /v1 paths.
	PlaygroundForwardEnable bool `json:"playground_forward_enable"`

	// Per-platform R2 enable switches (poller-based, for known channel types)
	AliR2Enable    bool `json:"ali_r2_enable"`
	KlingR2Enable  bool `json:"kling_r2_enable"`
	JimengR2Enable bool `json:"jimeng_r2_enable"`
	ViduR2Enable   bool `json:"vidu_r2_enable"`
	DoubaoR2Enable bool `json:"doubao_r2_enable"`
	HailuoR2Enable bool `json:"hailuo_r2_enable"`
	GrokR2Enable   bool `json:"grok_r2_enable"`
}

var storageSetting = StorageSetting{
	R2AutoDeleteDays:        0, // 0 = permanent
	ImageR2Prefix:           "images",
	ImageR2AutoDeleteDays:   0,
	VideoR2Prefix:           "video",
	PlaygroundForwardEnable: true,
}

func init() {
	config.GlobalConfig.Register("storage_setting", &storageSetting)
	syncToCommon()
}

// syncToCommon 将 R2 配置同步到 common 包，初始化 R2 客户端
func syncToCommon() {
	if !IsConfigured() {
		return
	}
	_ = common.InitR2Client(common.R2Config{
		AccountID:       storageSetting.R2AccountID,
		AccessKeyID:     storageSetting.R2AccessKeyID,
		SecretAccessKey: storageSetting.R2SecretAccessKey,
		BucketName:      storageSetting.R2BucketName,
		CustomDomain:    storageSetting.R2CustomDomain,
	})
}

// UpdateAndSync 更新配置并重新初始化 R2 客户端
func UpdateAndSync() {
	syncToCommon()
}

// GetStorageSetting 获取存储设置
func GetStorageSetting() *StorageSetting {
	return &storageSetting
}

// IsConfigured 检查 R2 全局配置是否完整
func IsConfigured() bool {
	return storageSetting.R2AccountID != "" &&
		storageSetting.R2AccessKeyID != "" &&
		storageSetting.R2SecretAccessKey != "" &&
		storageSetting.R2BucketName != "" &&
		storageSetting.R2CustomDomain != ""
}

// IsVideoR2Enabled 检查通用视频转存（查询时接管）是否启用
// 与 channel type 无关，适用于所有渠道
func IsVideoR2Enabled() bool {
	return IsConfigured() && storageSetting.VideoR2Enable
}

func IsImageR2Enabled() bool {
	return IsConfigured() && storageSetting.ImageR2Enable
}

// IsVideoR2EnabledForChannelType checks whether query-time takeover is active for
// a specific channel type.
// Current policy: global switch only.
// channelType is kept for backward-compatible call sites.
func IsVideoR2EnabledForChannelType(channelType int) bool {
	_ = channelType
	return IsVideoR2Enabled()
}

// GetVideoR2Prefix 获取通用视频转存的 R2 路径前缀
func GetVideoR2Prefix() string {
	if storageSetting.VideoR2Prefix != "" {
		return storageSetting.VideoR2Prefix
	}
	return "video"
}

func GetImageR2Prefix() string {
	if storageSetting.ImageR2Prefix != "" {
		return storageSetting.ImageR2Prefix
	}
	return "images"
}

func GetImageR2AutoDeleteDays() int {
	if storageSetting.ImageR2AutoDeleteDays < 0 {
		return 0
	}
	return storageSetting.ImageR2AutoDeleteDays
}

// IsPlatformR2Enabled 检查指定平台是否启用 R2 转存（poller 方式，已知渠道类型）
func IsPlatformR2Enabled(channelType int) bool {
	_ = channelType
	return IsVideoR2Enabled()
}

// IsPlaygroundForwardEnabled checks whether /pg requests should be rewritten to /v1 paths.
func IsPlaygroundForwardEnabled() bool {
	return storageSetting.PlaygroundForwardEnable
}

// GetPlatformPrefix 获取平台对应的 R2 路径前缀
func GetPlatformPrefix(channelType int) string {
	switch channelType {
	case constant.ChannelTypeAli:
		return "ali"
	case constant.ChannelTypeKling:
		return "kling"
	case constant.ChannelTypeJimeng:
		return "jimeng"
	case constant.ChannelTypeVidu:
		return "vidu"
	case constant.ChannelTypeDoubaoVideo:
		return "doubao"
	case constant.ChannelTypeMiniMax:
		return "hailuo"
	case constant.ChannelTypeXai:
		return "grok"
	default:
		return "unknown"
	}
}
