package service

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/storage_setting"

	"github.com/bytedance/gopkg/util/gopool"
)

var (
	r2CleanupOnce    sync.Once
	r2CleanupRunning atomic.Bool
)

const (
	r2CleanupInterval  = 1 * time.Hour
	r2CleanupBatchSize = 100
)

var r2CleanupURLKeys = []string{"url", "video_url", "output_url", "image_url", "thumbnail_url"}

// StartR2CleanupTask starts the background R2 video cleanup task
func StartR2CleanupTask() {
	r2CleanupOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			logger.LogInfo(context.Background(), "R2 cleanup task started: tick=1h")
			ticker := time.NewTicker(r2CleanupInterval)
			defer ticker.Stop()

			for range ticker.C {
				runR2CleanupOnce()
			}
		})
	})
}

func runR2CleanupOnce() {
	if !r2CleanupRunning.CompareAndSwap(false, true) {
		return
	}
	defer r2CleanupRunning.Store(false)

	ctx := context.Background()

	cfg := storage_setting.GetStorageSetting()
	if cfg.R2AutoDeleteDays <= 0 {
		return
	}

	if !storage_setting.IsConfigured() || !common.IsR2ClientReady() {
		return
	}

	domain := strings.TrimRight(cfg.R2CustomDomain, "/")
	if domain == "" {
		return
	}

	cutoffTime := time.Now().Unix() - int64(cfg.R2AutoDeleteDays)*86400

	var tasks []model.Task
	err := model.DB.Where("status = ? AND finish_time > 0 AND finish_time < ?",
		model.TaskStatusSuccess, cutoffTime).
		Order("finish_time asc").
		Limit(r2CleanupBatchSize).
		Find(&tasks).Error
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("R2 cleanup query failed: %v", err))
		return
	}

	if len(tasks) == 0 {
		return
	}

	logger.LogInfo(ctx, fmt.Sprintf("R2 cleanup: found %d expired task candidates", len(tasks)))

	expiredTasks := 0
	deletedTasks := 0
	deletedObjects := 0
	for _, task := range tasks {
		urls, taskData := collectTaskR2URLs(ctx, &task, domain)
		if len(urls) == 0 {
			continue
		}
		expiredTasks++

		allDeleted := true
		for _, mediaURL := range urls {
			if err := DeleteVideoFromR2(ctx, mediaURL); err != nil {
				logger.LogError(ctx, fmt.Sprintf("R2 cleanup: failed to delete %s for task %s: %v", mediaURL, task.TaskID, err))
				allDeleted = false
				break
			}
			deletedObjects++
		}
		if !allDeleted {
			continue
		}

		updates := buildTaskCleanupUpdates(ctx, &task, taskData, domain)
		if len(updates) > 0 {
			if err := model.DB.Model(&model.Task{}).Where("id = ?", task.ID).Updates(updates).Error; err != nil {
				logger.LogError(ctx, fmt.Sprintf("R2 cleanup: failed to update task %s: %v", task.TaskID, err))
				continue
			}
		}
		deletedTasks++
	}

	logger.LogInfo(ctx, fmt.Sprintf("R2 cleanup: deleted %d/%d expired tasks, removed %d objects", deletedTasks, expiredTasks, deletedObjects))
}

func collectTaskR2URLs(ctx context.Context, task *model.Task, domain string) ([]string, map[string]interface{}) {
	if task == nil {
		return nil, nil
	}

	urlSet := make(map[string]struct{})
	addURL := func(raw string) {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			return
		}
		if strings.HasPrefix(raw, domain) {
			urlSet[raw] = struct{}{}
		}
	}

	addURL(task.FailReason)

	var taskData map[string]interface{}
	if len(task.Data) > 0 {
		if err := common.Unmarshal(task.Data, &taskData); err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("R2 cleanup: failed to parse task data for task %s: %v", task.TaskID, err))
		} else {
			for _, key := range r2CleanupURLKeys {
				if raw, ok := taskData[key].(string); ok {
					addURL(raw)
				}
			}
		}
	}

	urls := make([]string, 0, len(urlSet))
	for raw := range urlSet {
		urls = append(urls, raw)
	}
	return urls, taskData
}

func buildTaskCleanupUpdates(ctx context.Context, task *model.Task, taskData map[string]interface{}, domain string) map[string]interface{} {
	updates := make(map[string]interface{})
	if task == nil {
		return updates
	}

	if strings.HasPrefix(strings.TrimSpace(task.FailReason), domain) {
		updates["fail_reason"] = ""
	}

	if taskData == nil {
		return updates
	}

	dataChanged := false
	for _, key := range r2CleanupURLKeys {
		raw, ok := taskData[key].(string)
		if !ok {
			continue
		}
		if strings.HasPrefix(strings.TrimSpace(raw), domain) {
			delete(taskData, key)
			dataChanged = true
		}
	}
	if dataChanged {
		newData, err := common.Marshal(taskData)
		if err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("R2 cleanup: failed to marshal cleaned task data for task %s: %v", task.TaskID, err))
		} else {
			updates["data"] = newData
		}
	}

	return updates
}
