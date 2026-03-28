package xai

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
)

// ============================
// Request / Response structures
// ============================

type responseTask struct {
	ID          string `json:"id"`
	Model       string `json:"model"`
	Status      string `json:"status"`
	Progress    int    `json:"progress"`
	CreatedAt   int64  `json:"created_at"`
	CompletedAt int64  `json:"completed_at,omitempty"`
	OutputURL   string `json:"output_url,omitempty"`
	VideoURL    string `json:"video_url,omitempty"`
	ImageURL    string `json:"image_url,omitempty"`
	Error       *struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

// ============================
// Adaptor implementation
// ============================

type TaskAdaptor struct {
	ChannelType int
	apiKey      string
	baseURL     string
}

func (a *TaskAdaptor) Init(info *relaycommon.RelayInfo) {
	a.ChannelType = info.ChannelType
	a.baseURL = info.ChannelBaseUrl
	a.apiKey = info.ApiKey
}

func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	return relaycommon.ValidateMultipartDirect(c, info)
}

func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	return fmt.Sprintf("%s/v1/videos", a.baseURL), nil
}

func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Authorization", "Bearer "+a.apiKey)
	contentType := c.Request.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}
	req.Header.Set("Content-Type", contentType)
	return nil
}

func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	cachedBody, err := common.GetRequestBody(c)
	if err != nil {
		return nil, errors.Wrap(err, "get_request_body_failed")
	}
	return bytes.NewReader(cachedBody), nil
}

func (a *TaskAdaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, requestBody)
}

func (a *TaskAdaptor) DoResponse(c *gin.Context, resp *http.Response, _ *relaycommon.RelayInfo) (taskID string, taskData []byte, taskErr *dto.TaskError) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
		return
	}
	_ = resp.Body.Close()

	var dResp responseTask
	if err := common.Unmarshal(responseBody, &dResp); err != nil {
		taskErr = service.TaskErrorWrapper(errors.Wrapf(err, "body: %s", responseBody), "unmarshal_response_body_failed", http.StatusInternalServerError)
		return
	}

	if dResp.ID == "" {
		taskErr = service.TaskErrorWrapper(fmt.Errorf("task_id is empty"), "invalid_response", http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, dResp)
	return dResp.ID, responseBody, nil
}

func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, ok := body["task_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid task_id")
	}

	uri := fmt.Sprintf("%s/v1/videos/%s", baseUrl, taskID)

	req, err := http.NewRequest(http.MethodGet, uri, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+key)

	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, fmt.Errorf("new proxy http client failed: %w", err)
	}
	return client.Do(req)
}

func (a *TaskAdaptor) GetModelList() []string {
	return ModelList
}

func (a *TaskAdaptor) GetChannelName() string {
	return ChannelName
}

func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	resTask := responseTask{}
	if err := common.Unmarshal(respBody, &resTask); err != nil {
		return nil, errors.Wrap(err, "unmarshal task result failed")
	}

	taskResult := relaycommon.TaskInfo{
		Code: 0,
	}

	switch strings.ToLower(strings.TrimSpace(resTask.Status)) {
	case "queued", "pending", "submitted", "created":
		taskResult.Status = model.TaskStatusQueued
	case "processing", "in_progress", "running", "progressing":
		taskResult.Status = model.TaskStatusInProgress
	case "completed", "succeeded", "success", "finished":
		videoURL := pickXAIVideoURL(&resTask)
		if videoURL == "" {
			// xAI may report completed before the final video URL is materialized.
			taskResult.Status = model.TaskStatusInProgress
			taskResult.Progress = "95%"
		} else {
			taskResult.Status = model.TaskStatusSuccess
			taskResult.Url = videoURL
		}
	case "failed", "cancelled", "canceled", "aborted", "error":
		taskResult.Status = model.TaskStatusFailure
		if resTask.Error != nil {
			taskResult.Reason = resTask.Error.Message
		} else {
			taskResult.Reason = "task failed"
		}
	default:
		taskResult.Status = model.TaskStatusInProgress
		taskResult.Progress = "30%"
	}
	if resTask.Progress > 0 && resTask.Progress < 100 {
		taskResult.Progress = fmt.Sprintf("%d%%", resTask.Progress)
	}

	return &taskResult, nil
}

func (a *TaskAdaptor) ConvertToOpenAIVideo(task *model.Task) ([]byte, error) {
	video := dto.NewOpenAIVideo()
	video.ID = task.TaskID
	video.TaskID = task.TaskID
	video.Status = task.Status.ToVideoStatus()
	video.SetProgressStr(task.Progress)
	video.CreatedAt = task.CreatedAt
	video.CompletedAt = task.VideoCompletedAt()
	video.Model = task.Properties.OriginModelName

	var xaiResp responseTask
	if err := common.Unmarshal(task.Data, &xaiResp); err == nil {
		if video.Model == "" && xaiResp.Model != "" {
			video.Model = xaiResp.Model
		}
		if videoURL := pickXAIVideoURL(&xaiResp); videoURL != "" {
			video.SetMetadata("url", videoURL)
			if xaiResp.OutputURL != "" {
				video.SetMetadata("output_url", xaiResp.OutputURL)
			}
			if xaiResp.VideoURL != "" {
				video.SetMetadata("video_url", xaiResp.VideoURL)
			}
		}
		if xaiResp.ImageURL != "" {
			video.SetMetadata("image_url", xaiResp.ImageURL)
		}
		if xaiResp.Error != nil && xaiResp.Error.Message != "" {
			video.Error = &dto.OpenAIVideoError{
				Message: xaiResp.Error.Message,
				Code:    xaiResp.Error.Code,
			}
		}
	}

	if video.Metadata == nil && (strings.HasPrefix(task.FailReason, "http://") ||
		strings.HasPrefix(task.FailReason, "https://") ||
		strings.HasPrefix(task.FailReason, "data:")) {
		video.SetMetadata("url", task.FailReason)
	}
	if video.Error == nil && task.Status == model.TaskStatusFailure {
		video.Error = &dto.OpenAIVideoError{
			Message: task.FailReason,
			Code:    "task_failed",
		}
	}
	return common.Marshal(video)
}

func pickXAIVideoURL(resTask *responseTask) string {
	if resTask == nil {
		return ""
	}
	if resTask.OutputURL != "" {
		return resTask.OutputURL
	}
	if resTask.VideoURL != "" {
		return resTask.VideoURL
	}
	return ""
}
