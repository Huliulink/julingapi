package controller

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/storage_setting"

	"github.com/gin-gonic/gin"
)

// GetVideoTaskStatus handles GET /v1/videos/:task_id
//
// Logic:
//  1. If global VideoR2Enable is OFF → pure passthrough (RelayTask)
//  2. If ON → serve from local DB:
//     - Task not in DB → passthrough (RelayTask)
//     - Task SUCCESS + FailReason is R2 URL → return R2 result immediately
//     - Task SUCCESS + FailReason is upstream URL → start async R2 transfer, return "in_progress 95%"
//     - Task in IN_PROGRESS with progress=95% (our transfer) → return "transferring"
//     - Other statuses → return local task status as-is
func GetVideoTaskStatus(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "task_id is required", "type": "invalid_request_error"},
		})
		return
	}

	// If global video R2 switch is OFF, passthrough entirely
	if !storage_setting.IsVideoR2Enabled() {
		RelayTask(c)
		return
	}

	// Global switch ON — intercept and serve from local DB
	task, exists, err := model.GetByOnlyTaskId(taskID)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("GetVideoTaskStatus query error for %s: %s", taskID, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "Failed to query task", "type": "server_error"},
		})
		return
	}
	if !exists || task == nil {
		// Task not in our DB — relay to upstream unchanged
		RelayTask(c)
		return
	}

	video := task.ToOpenAIVideo()

	switch task.Status {
	case model.TaskStatusSuccess:
		if service.IsR2URL(task.FailReason) {
			// Already in R2 — return R2 result with all URL fields
			video.SetMetadata("url", task.FailReason)
			if task.Data != nil {
				var taskData map[string]interface{}
				if err2 := common.Unmarshal(task.Data, &taskData); err2 == nil {
					if v, ok := taskData["thumbnail_url"].(string); ok && v != "" {
						video.SetMetadata("thumbnail_url", v)
					}
					if v, ok := taskData["video_url"].(string); ok && v != "" {
						video.SetMetadata("video_url", v)
					}
				}
			}
		} else {
			// SUCCESS but FailReason is still an upstream URL (or empty) — trigger R2 transfer
			go globalTransferTaskToR2(task)
			video.Status = dto.VideoStatusInProgress
			video.Progress = 95
			video.SetMetadata("message", "视频正在转存中，请稍后重试")
		}

	case model.TaskStatusInProgress:
		if task.Progress == "95%" {
			// Our R2 transfer is in progress
			video.SetMetadata("message", "视频正在转存中，请稍后重试")
		}
		// Otherwise just return the normal in_progress status from task

	case model.TaskStatusFailure:
		// Generation failed — error info is in task data, ToOpenAIVideo already handles it

	default:
		// queued, submitted, etc. — return as-is
	}

	c.JSON(http.StatusOK, video)
}

// globalTransferTaskToR2 performs R2 transfer for any channel type using the global prefix setting.
// Called asynchronously from GetVideoTaskStatus when SUCCESS task has upstream URLs.
func globalTransferTaskToR2(task *model.Task) {
	ctx := context.Background()

	// Mark in-progress (95%) and clear FailReason to hide upstream URL
	savedFailReason := task.FailReason
	task.Status = model.TaskStatusInProgress
	task.Progress = "95%"
	task.FailReason = ""
	if err := task.Update(); err != nil {
		logger.LogWarn(ctx, "globalTransferTaskToR2 pre-save failed: "+err.Error())
		return
	}

	// Restore for transfer logic
	task.Status = model.TaskStatusSuccess
	task.Progress = "100%"
	task.FailReason = savedFailReason

	prefix := storage_setting.GetVideoR2Prefix()

	var taskData map[string]interface{}
	dataChanged := false
	if task.Data != nil {
		if err := common.Unmarshal(task.Data, &taskData); err == nil {
			// Transfer video_url
			if videoURL, ok := taskData["video_url"].(string); ok && videoURL != "" && !service.IsR2URL(videoURL) {
				key := fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID)
				if r := service.TransferFileToR2(ctx, key, videoURL); r.Success {
					taskData["video_url"] = r.R2URL
					task.FailReason = r.R2URL
					dataChanged = true
				}
			}
			// Transfer thumbnail_url
			if thumbURL, ok := taskData["thumbnail_url"].(string); ok && thumbURL != "" && !service.IsR2URL(thumbURL) {
				key := fmt.Sprintf("%s/%s_thumb.jpg", prefix, task.TaskID)
				if r := service.TransferFileToR2(ctx, key, thumbURL); r.Success {
					taskData["thumbnail_url"] = r.R2URL
					dataChanged = true
				}
			}
			// Transfer output_url
			if outputURL, ok := taskData["output_url"].(string); ok && outputURL != "" && !service.IsR2URL(outputURL) {
				key := fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID)
				if r := service.TransferFileToR2(ctx, key, outputURL); r.Success {
					taskData["output_url"] = r.R2URL
					if task.FailReason == "" {
						task.FailReason = r.R2URL
					}
					dataChanged = true
				}
			}
			if dataChanged {
				if newData, err := common.Marshal(taskData); err == nil {
					task.Data = newData
				}
			}
		}
	}

	// Fallback: FailReason itself (the main video URL) if still upstream
	if task.FailReason != "" && !service.IsR2URL(task.FailReason) {
		key := fmt.Sprintf("%s/%s.mp4", prefix, task.TaskID)
		if r := service.TransferFileToR2(ctx, key, task.FailReason); r.Success {
			task.FailReason = r.R2URL
		}
	}

	task.Status = model.TaskStatusSuccess
	task.Progress = "100%"
	if err := task.Update(); err != nil {
		logger.LogWarn(ctx, "globalTransferTaskToR2 post-save failed: "+err.Error())
	} else {
		logger.LogInfo(ctx, fmt.Sprintf("globalTransferTaskToR2 complete for task %s, R2 URL: %s", task.TaskID, task.FailReason))
	}
}

func VideoProxy(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"message": "task_id is required",
				"type":    "invalid_request_error",
			},
		})
		return
	}

	task, exists, err := model.GetByOnlyTaskId(taskID)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to query task %s: %s", taskID, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to query task",
				"type":    "server_error",
			},
		})
		return
	}
	if !exists || task == nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to get task %s: %v", taskID, err))
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "Task not found",
				"type":    "invalid_request_error",
			},
		})
		return
	}

	if task.Status != model.TaskStatusSuccess {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"message": fmt.Sprintf("Task is not completed yet, current status: %s", task.Status),
				"type":    "invalid_request_error",
			},
		})
		return
	}

	// R2 URL → 302 redirect, zero server bandwidth
	if task.FailReason != "" && service.IsR2URL(task.FailReason) {
		c.Redirect(http.StatusFound, task.FailReason)
		return
	}

	// Video expired: FailReason was cleared by R2 cleanup task
	// Only check for R2 platforms - Sora/Gemini have empty FailReason normally
	if task.FailReason == "" {
		ch, chErr := model.CacheGetChannel(task.ChannelId)
		if chErr == nil && storage_setting.GetPlatformPrefix(ch.Type) != "unknown" {
			c.JSON(http.StatusGone, gin.H{
				"error": gin.H{
					"message": "视频已过期删除",
					"type":    "video_expired",
				},
			})
			return
		}
	}

	channel, err := model.CacheGetChannel(task.ChannelId)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to get task %s: not found", taskID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to retrieve channel information",
				"type":    "server_error",
			},
		})
		return
	}
	baseURL := channel.GetBaseURL()
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}

	var videoURL string
	proxy := channel.GetSetting().Proxy
	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to create proxy client for task %s: %s", taskID, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to create proxy client",
				"type":    "server_error",
			},
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "", nil)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to create request: %s", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to create proxy request",
				"type":    "server_error",
			},
		})
		return
	}

	switch channel.Type {
	case constant.ChannelTypeGemini:
		apiKey := task.PrivateData.Key
		if apiKey == "" {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Missing stored API key for Gemini task %s", taskID))
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "API key not stored for task",
					"type":    "server_error",
				},
			})
			return
		}

		videoURL, err = getGeminiVideoURL(channel, task, apiKey)
		if err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to resolve Gemini video URL for task %s: %s", taskID, err.Error()))
			c.JSON(http.StatusBadGateway, gin.H{
				"error": gin.H{
					"message": "Failed to resolve Gemini video URL",
					"type":    "server_error",
				},
			})
			return
		}
		req.Header.Set("x-goog-api-key", apiKey)
	case constant.ChannelTypeOpenAI, constant.ChannelTypeSora:
		videoURL = fmt.Sprintf("%s/v1/videos/%s/content", baseURL, task.TaskID)
		req.Header.Set("Authorization", "Bearer "+channel.Key)
	default:
		// Video URL is directly in task.FailReason
		videoURL = task.FailReason
	}

	req.URL, err = url.Parse(videoURL)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to parse URL %s: %s", videoURL, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to create proxy request",
				"type":    "server_error",
			},
		})
		return
	}

	resp, err := client.Do(req)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to fetch video from %s: %s", videoURL, err.Error()))
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "Failed to fetch video content",
				"type":    "server_error",
			},
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Upstream returned status %d for %s", resp.StatusCode, videoURL))
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": fmt.Sprintf("Upstream service returned status %d", resp.StatusCode),
				"type":    "server_error",
			},
		})
		return
	}

	for key, values := range resp.Header {
		for _, value := range values {
			c.Writer.Header().Add(key, value)
		}
	}

	c.Writer.Header().Set("Cache-Control", "public, max-age=86400") // Cache for 24 hours
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = io.Copy(c.Writer, resp.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Failed to stream video content: %s", err.Error()))
	}
}
