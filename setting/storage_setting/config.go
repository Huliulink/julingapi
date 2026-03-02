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
	R2AutoDeleteDays  int    `json:"r2_auto_delete_days"`

	// Per-platform R2 enable switches
	AliR2Enable    bool `json:"ali_r2_enable"`
	KlingR2Enable  bool `json:"kling_r2_enable"`
	JimengR2Enable bool `json:"jimeng_r2_enable"`
	ViduR2Enable   bool `json:"vidu_r2_enable"`
	DoubaoR2Enable bool `json:"doubao_r2_enable"`
	HailuoR2Enable bool `json:"hailuo_r2_enable"`
	GrokR2Enable   bool `json:"grok_r2_enable"`
}

var storageSetting = StorageSetting{
	R2AutoDeleteDays: 0, // 0 = permanent
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

// IsPlatformR2Enabled 检查指定平台是否启用 R2 转存
func IsPlatformR2Enabled(channelType int) bool {
	if !IsConfigured() {
		return false
	}
	switch channelType {
	case constant.ChannelTypeAli:
		return storageSetting.AliR2Enable
	case constant.ChannelTypeKling:
		return storageSetting.KlingR2Enable
	case constant.ChannelTypeJimeng:
		return storageSetting.JimengR2Enable
	case constant.ChannelTypeVidu:
		return storageSetting.ViduR2Enable
	case constant.ChannelTypeDoubaoVideo:
		return storageSetting.DoubaoR2Enable
	case constant.ChannelTypeMiniMax: // hailuo-video
		return storageSetting.HailuoR2Enable
	case constant.ChannelTypeXai:
		return storageSetting.GrokR2Enable
	default:
		return false
	}
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
