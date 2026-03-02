package controller

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/storage_setting"
	"github.com/gin-gonic/gin"
)

// TestR2Connection tests the R2 storage configuration connectivity
func TestR2Connection(c *gin.Context) {
	cfg := storage_setting.GetStorageSetting()

	// Step 1: check required fields
	missing := []string{}
	if cfg.R2AccountID == "" {
		missing = append(missing, "Account ID")
	}
	if cfg.R2AccessKeyID == "" {
		missing = append(missing, "Access Key ID")
	}
	if cfg.R2SecretAccessKey == "" {
		missing = append(missing, "Secret Access Key")
	}
	if cfg.R2BucketName == "" {
		missing = append(missing, "Bucket 名称")
	}
	if cfg.R2CustomDomain == "" {
		missing = append(missing, "自定义域名")
	}
	if len(missing) > 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("配置不完整，缺少以下字段：%s", strings.Join(missing, "、")),
			"code":    "config_incomplete",
		})
		return
	}

	// Step 2: validate custom domain format
	domain := cfg.R2CustomDomain
	if !strings.HasPrefix(domain, "http://") && !strings.HasPrefix(domain, "https://") {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "自定义域名格式错误：必须以 https:// 或 http:// 开头，例如 https://video.example.com",
			"code":    "domain_format_error",
		})
		return
	}

	// Step 3: check if R2 client is ready (it's initialized by config on save)
	if !common.IsR2ClientReady() {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "R2 客户端未初始化。可能原因：①配置已保存但服务尚未重载，请重新保存一次；②Account ID 格式错误（应为32位十六进制字符串）",
			"code":    "client_not_initialized",
		})
		return
	}

	// Step 4: upload a tiny probe file to verify R2 read/write access
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	testContent := strings.NewReader("ok")
	err := common.UploadToR2(ctx, "r2-connection-test-probe.txt", testContent, 2, "text/plain")
	if err != nil {
		errMsg := err.Error()
		humanMsg := diagnoseR2Error(errMsg)
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": humanMsg,
			"code":    "upload_failed",
			"detail":  errMsg,
		})
		return
	}

	// Clean up test file
	_ = common.DeleteFromR2(ctx, "r2-connection-test-probe.txt")

	// Step 5: test custom domain reachability (optional, non-blocking)
	domainOK, domainMsg := testCustomDomain(cfg.R2CustomDomain)

	if !domainOK {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": fmt.Sprintf("R2 存储桶连接正常，但自定义域名访问异常：%s\n请检查 Cloudflare R2 存储桶的自定义域名是否已正确绑定。", domainMsg),
			"code":    "domain_unreachable",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "连接测试成功！R2 存储桶可读写，自定义域名访问正常。",
		"code":    "ok",
	})
}

// diagnoseR2Error translates AWS SDK errors to human-readable Chinese messages
func diagnoseR2Error(errMsg string) string {
	lower := strings.ToLower(errMsg)
	switch {
	case strings.Contains(lower, "nosuchbucket") || strings.Contains(lower, "no such bucket"):
		return "Bucket 不存在：请检查 Bucket 名称是否正确，并确认已在 Cloudflare R2 控制台创建。"
	case strings.Contains(lower, "invalidaccesskeyid") || strings.Contains(lower, "invalid access key"):
		return "Access Key ID 无效：请到 Cloudflare R2 → 管理 R2 API 令牌 中检查并重新生成密钥。"
	case strings.Contains(lower, "signaturedoesnotmatch") || strings.Contains(lower, "signature"):
		return "Secret Access Key 错误：签名验证失败，请确认 Secret Access Key 是否完整复制，没有多余空格。"
	case strings.Contains(lower, "accessdenied") || strings.Contains(lower, "access denied") || strings.Contains(lower, "forbidden"):
		return "访问被拒绝：API 令牌权限不足，请确认令牌权限包含「对象读写」权限，并且令牌未被限制到特定存储桶。"
	case strings.Contains(lower, "no such host") || strings.Contains(lower, "dial tcp") || strings.Contains(lower, "connection refused"):
		return "网络连接失败：无法连接到 Cloudflare R2 端点。可能原因：①服务器网络无法访问 Cloudflare；②Account ID 格式错误（应为32位十六进制，如 a1b2c3...）。"
	case strings.Contains(lower, "timeout") || strings.Contains(lower, "deadline exceeded"):
		return "连接超时：请检查服务器是否能访问外网，或 Cloudflare Account ID 是否正确。"
	case strings.Contains(lower, "invalidbucketname") || strings.Contains(lower, "invalid bucket"):
		return "Bucket 名称格式无效：Bucket 名称只能包含小写字母、数字和连字符，且长度为 3-63 个字符。"
	default:
		return fmt.Sprintf("R2 连接失败，请检查以下配置：①Account ID（32位十六进制）②Access Key ID 和 Secret Access Key 是否为 R2 专用 API 令牌③Bucket 名称是否正确。错误详情：%s", errMsg)
	}
}

// testCustomDomain checks if the custom domain is accessible
func testCustomDomain(domain string) (bool, string) {
	domain = strings.TrimRight(domain, "/")
	// We just test that the domain resolves and returns any HTTP response
	// A 403/404 is fine — it means the domain is reachable
	client := &http.Client{
		Timeout: 8 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return nil // follow redirects
		},
	}
	resp, err := client.Get(domain + "/r2-connection-test-probe.txt")
	if err != nil {
		errMsg := err.Error()
		lower := strings.ToLower(errMsg)
		if strings.Contains(lower, "no such host") || strings.Contains(lower, "dial") {
			return false, "域名无法解析，请确认自定义域名已在 Cloudflare DNS 中正确配置，并绑定到该 R2 存储桶。"
		}
		if strings.Contains(lower, "timeout") {
			return false, "域名访问超时，请检查 Cloudflare 是否已开启该域名的代理。"
		}
		return false, err.Error()
	}
	resp.Body.Close()
	// 200/403/404 all mean the domain is reachable
	if resp.StatusCode == 200 || resp.StatusCode == 403 || resp.StatusCode == 404 {
		return true, ""
	}
	return false, fmt.Sprintf("域名返回异常状态码 %d，请检查 Cloudflare R2 自定义域名绑定配置。", resp.StatusCode)
}
