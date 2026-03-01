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

const r2CleanupInterval = 1 * time.Hour

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
	err := model.DB.Where("status = ? AND finish_time > 0 AND finish_time < ? AND fail_reason LIKE ?",
		model.TaskStatusSuccess, cutoffTime, domain+"%").
		Limit(100).
		Find(&tasks).Error
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("R2 cleanup query failed: %v", err))
		return
	}

	if len(tasks) == 0 {
		return
	}

	logger.LogInfo(ctx, fmt.Sprintf("R2 cleanup: found %d expired tasks", len(tasks)))

	deleted := 0
	for _, task := range tasks {
		err := DeleteVideoFromR2(ctx, task.FailReason)
		if err != nil {
			logger.LogError(ctx, fmt.Sprintf("R2 cleanup: failed to delete %s for task %s: %v", task.FailReason, task.TaskID, err))
			continue
		}

		// Clear FailReason to mark as expired
		err = model.DB.Model(&model.Task{}).Where("id = ?", task.ID).
			Update("fail_reason", "").Error
		if err != nil {
			logger.LogError(ctx, fmt.Sprintf("R2 cleanup: failed to update task %s: %v", task.TaskID, err))
			continue
		}
		deleted++
	}

	logger.LogInfo(ctx, fmt.Sprintf("R2 cleanup: deleted %d/%d expired videos", deleted, len(tasks)))
}
