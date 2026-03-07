package service

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

const taskFailureReasonMaxLen = 1024

// ExtractTaskFailureReason returns the best available failure reason from failReason/taskData.
func ExtractTaskFailureReason(failReason string, taskData []byte) string {
	if s := limitTaskFailureReason(failReason); s != "" {
		return s
	}
	if len(taskData) == 0 {
		return ""
	}

	var payload map[string]any
	if err := common.Unmarshal(taskData, &payload); err == nil {
		if s := limitTaskFailureReason(extractFailureReasonFromMap(payload)); s != "" {
			return s
		}
	}

	raw := strings.TrimSpace(string(taskData))
	if raw == "" {
		return ""
	}
	if s := limitTaskFailureReason(extractFailureReasonFromJSONString(raw)); s != "" {
		return s
	}
	return ""
}

func extractFailureReasonFromMap(payload map[string]any) string {
	if payload == nil {
		return ""
	}

	for _, key := range []string{"reason", "message", "fail_reason", "error_message", "error_msg", "msg", "detail", "status_message"} {
		if s := normalizeFailureText(payload[key]); s != "" {
			return s
		}
	}

	if s := extractFailureReasonFromError(payload["error"]); s != "" {
		return s
	}

	if s := normalizeFailureText(payload["resp_data"]); s != "" {
		if parsed := extractFailureReasonFromJSONString(s); parsed != "" {
			return parsed
		}
		return s
	}

	for _, key := range []string{"data", "response"} {
		if nested, ok := payload[key].(map[string]any); ok {
			if s := extractFailureReasonFromMap(nested); s != "" {
				return s
			}
		}
	}
	return ""
}

func extractFailureReasonFromError(errVal any) string {
	switch v := errVal.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(v)
	case map[string]any:
		msg := ""
		for _, key := range []string{"message", "reason", "detail", "msg"} {
			if s := normalizeFailureText(v[key]); s != "" {
				msg = s
				break
			}
		}
		code := normalizeFailureText(v["code"])
		typ := normalizeFailureText(v["type"])

		parts := make([]string, 0, 3)
		if msg != "" {
			parts = append(parts, msg)
		}
		if code != "" {
			parts = append(parts, "code="+code)
		}
		if typ != "" {
			parts = append(parts, "type="+typ)
		}
		if len(parts) > 0 {
			return strings.Join(parts, ", ")
		}
		return extractFailureReasonFromMap(v)
	case []any:
		for _, item := range v {
			if s := extractFailureReasonFromError(item); s != "" {
				return s
			}
		}
		return ""
	default:
		return normalizeFailureText(v)
	}
}

func extractFailureReasonFromJSONString(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	var payload map[string]any
	if err := common.UnmarshalJsonStr(raw, &payload); err != nil {
		return ""
	}
	return extractFailureReasonFromMap(payload)
}

func normalizeFailureText(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(t)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", t))
	}
}

func limitTaskFailureReason(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if len(s) <= taskFailureReasonMaxLen {
		return s
	}
	return s[:taskFailureReasonMaxLen] + "..."
}

