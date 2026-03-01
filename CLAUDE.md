# CLAUDE.md — Project Conventions for new-api

## IMPORTANT: Task Progress Tracking

Every session MUST:
1. Read `R2_VIDEO_STORAGE_PROGRESS.md` at the start
2. Update task status in that file as work progresses
3. Mark completed items with `[x]` and add completion notes

---

## Overview

This is an AI API gateway/proxy built with Go. It aggregates 40+ upstream AI providers (OpenAI, Claude, Gemini, Azure, AWS Bedrock, etc.) behind a unified API, with user management, billing, rate limiting, and an admin dashboard.

## Tech Stack

- **Backend**: Go 1.22+, Gin web framework, GORM v2 ORM
- **Frontend**: React 18, Vite, Semi Design UI (@douyinfe/semi-ui)
- **Databases**: SQLite, MySQL, PostgreSQL (all three must be supported)
- **Cache**: Redis (go-redis) + in-memory cache
- **Auth**: JWT, WebAuthn/Passkeys, OAuth (GitHub, Discord, OIDC, etc.)
- **Frontend package manager**: Bun (preferred over npm/yarn/pnpm)

## Architecture

Layered architecture: Router -> Controller -> Service -> Model

```
router/        — HTTP routing (API, relay, dashboard, web)
controller/    — Request handlers
service/       — Business logic
model/         — Data models and DB access (GORM)
relay/         — AI API relay/proxy with provider adapters
  relay/channel/ — Provider-specific adapters (openai/, claude/, gemini/, aws/, etc.)
middleware/    — Auth, rate limiting, CORS, logging, distribution
setting/       — Configuration management (ratio, model, operation, system, performance)
common/        — Shared utilities (JSON, crypto, Redis, env, rate-limit, etc.)
dto/           — Data transfer objects (request/response structs)
constant/      — Constants (API types, channel types, context keys)
types/         — Type definitions (relay formats, file sources, errors)
i18n/          — Backend internationalization (go-i18n, en/zh)
oauth/         — OAuth provider implementations
pkg/           — Internal packages (cachex, ionet)
web/           — React frontend
  web/src/i18n/  — Frontend internationalization (i18next, zh/en/fr/ru/ja/vi)
```

## Internationalization (i18n)

### Backend (`i18n/`)
- Library: `nicksnyder/go-i18n/v2`
- Languages: en, zh

### Frontend (`web/src/i18n/`)
- Library: `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- Languages: zh (fallback), en, fr, ru, ja, vi
- Translation files: `web/src/i18n/locales/{lang}.json` — flat JSON, keys are Chinese source strings
- Usage: `useTranslation()` hook, call `t('中文key')` in components
- Semi UI locale synced via `SemiLocaleWrapper`
- CLI tools: `bun run i18n:extract`, `bun run i18n:sync`, `bun run i18n:lint`

---

## Rules

### Rule 1: JSON Package — Use `common/json.go`

All JSON marshal/unmarshal operations MUST use the wrapper functions in `common/json.go`:

- `common.Marshal(v any) ([]byte, error)`
- `common.Unmarshal(data []byte, v any) error`
- `common.UnmarshalJsonStr(data string, v any) error`
- `common.DecodeJson(reader io.Reader, v any) error`
- `common.GetJsonType(data json.RawMessage) string`

Do NOT directly import or call `encoding/json` in business code. `json.RawMessage`, `json.Number` etc. may still be referenced as types.

### Rule 2: Database Compatibility — SQLite, MySQL >= 5.7.8, PostgreSQL >= 9.6

All database code MUST be fully compatible with all three databases simultaneously.

- Prefer GORM methods over raw SQL
- Column quoting: PostgreSQL `"column"`, MySQL/SQLite `` `column` ``; use `commonGroupCol`/`commonKeyCol` from `model/main.go`
- Boolean: use `commonTrueVal`/`commonFalseVal`
- Use `common.UsingPostgreSQL`, `common.UsingSQLite`, `common.UsingMySQL` flags
- No DB-specific functions/operators without cross-DB fallback
- Migrations must work on all three databases

### Rule 3: Frontend — Prefer Bun

Use `bun` as the preferred package manager: `bun install`, `bun run dev`, `bun run build`, `bun run i18n:*`

### Rule 4: New Channel StreamOptions Support

When implementing a new channel, confirm StreamOptions support and add to `streamSupportedChannels` if applicable.

### Rule 5: Protected Project Information — DO NOT Modify or Delete

The following are **strictly protected** and MUST NOT be modified, deleted, replaced, or removed:

- Any references related to **nеw-аρi** (project name/identity)
- Any references related to **QuаntumΝоuѕ** (organization/author identity)

Includes: README, license headers, copyright, HTML titles, meta tags, Go module paths, Docker configs, etc. No exceptions.

---

## Current Development Task: Cloudflare R2 Video Storage

### Goal

All video generation platforms返回的视频 URL 通过 Cloudflare R2 云存储中转，替换为自定义域名 URL，实现 CDN 加速和域名统一。

### Supported Platforms (Direct Download Type Only)

| # | Platform | ChannelType | GetChannelName() | R2 Path Prefix | ParseTaskResult URL Source |
|---|----------|-------------|------------------|----------------|---------------------------|
| 1 | Ali 通义 | 17 | `ali` | `/ali/` | `aliResp.Output.VideoURL` — 直接 CDN URL |
| 2 | Kling 可灵 | 50 | `kling` | `/kling/` | `Videos[0].Url` — 直接 CDN URL |
| 3 | Jimeng 即梦 | 51 | `jimeng` | `/jimeng/` | `resTask.Data.VideoUrl` — 直接 CDN URL |
| 4 | Vidu | 52 | `vidu` | `/vidu/` | `Creations[0].URL` — 直接 CDN URL |
| 5 | Doubao 豆包 | 54 | `doubao-video` | `/doubao/` | `Content.VideoURL` — 直接 CDN URL |
| 6 | Hailuo 海螺 | 35 | `hailuo-video` | `/hailuo/` | `buildVideoURL()` 实时解析 — 直接 CDN URL |
| 7 | **Grok/xAI** | **48** | `xai` | `/grok/` | **待开发** — 直接 CDN URL |

**NOT included**: Sora(55, 需鉴权代理), Gemini(24, 需鉴权代理), Vertex AI(41, base64内嵌)

### Key Architecture Points

- **上游域名不固定**: 同一平台可能有多个 channel，每个 baseURL 不同。必须靠 `channel.Type` 判断，不能靠域名
- **R2 转存时机**: `controller/task_video.go` 的 `updateVideoSingleTask()` 中，`case model.TaskStatusSuccess:` 分支
- **转存期间状态**: 任务保持 `IN_PROGRESS`(progress=95%)，R2 完成后才设为 `SUCCESS`
- **转存失败回退**: 重试 2-3 次后回退到原始 URL，标记 `SUCCESS`，日志记录失败
- **视频过期**: 用户查询已过期任务时返回 "视频已过期删除"

### R2 Storage Path Convention

```
{R2CustomDomain}/{platform_prefix}/{taskID}.mp4

Examples:
https://video.example.com/grok/task_Qt4LkgT2NsnX.mp4
https://video.example.com/sora/video_abc123.mp4
https://video.example.com/kling/task_xyz789.mp4
```

### Admin Settings UI Requirements

Location: `/console/setting?tab=storage`

**Global R2 Config:**
- Account ID (text)
- Access Key ID (text)
- Secret Access Key (password)
- Bucket Name (text)
- Custom Domain (text, e.g. `https://video.example.com`)
- Storage Path Prefix (text, optional)
- Auto Delete Days (number, 0=permanent)

**Per-Platform Switches:**
- Ali R2 Enable (toggle)
- Kling R2 Enable (toggle)
- Jimeng R2 Enable (toggle)
- Vidu R2 Enable (toggle)
- Doubao R2 Enable (toggle)
- Hailuo R2 Enable (toggle)
- Grok R2 Enable (toggle)

Only when global config is complete AND platform switch is ON, that platform's videos go through R2.

**UI Requirements:**
- Must match current admin theme (Semi Design UI)
- Responsive layout, consistent with existing setting tabs
- Use `useTranslation()` for all text, add i18n keys to all locale files
- Password field for Secret Access Key (masked input)
- Save button with loading state and success/error toast
- Connection test button (optional but recommended)

### VideoProxy Adaptation

When `task.FailReason` starts with R2 custom domain → 302 redirect instead of streaming proxy. Zero server bandwidth.

### Auto Cleanup Task

- Background goroutine with `time.Ticker` (hourly), pattern matches existing tasks in `main.go`
- Query: `status=SUCCESS AND finish_time < now - retention_days AND FailReason LIKE '{R2Domain}%'`
- Delete R2 object → clear `task.FailReason` or mark expired
- Use `gopool.Go()` + `sync.Once` + `atomic.Bool` pattern

### Files to Create

| File | Purpose |
|------|---------|
| `setting/storage_setting/config.go` | R2 config struct, register to ConfigManager |
| `common/r2_storage.go` | R2 S3 client (aws-sdk-go-v2/service/s3) |
| `service/r2_transfer.go` | Video download + R2 upload + retry logic |
| `relay/channel/task/xai/adaptor.go` | Grok video TaskAdaptor |
| `relay/channel/task/xai/constants.go` | Grok video model list |
| `web/src/pages/Setting/Operation/StorageSetting.jsx` | Admin storage settings component |

### Files to Modify

| File | Change |
|------|--------|
| `relay/relay_adaptor.go:135` | Add `case constant.ChannelTypeXai` to `GetTaskAdaptor()` |
| `controller/task_video.go:143` | Insert R2 transfer logic in SUCCESS branch |
| `controller/video_proxy.go:107` | Add R2 URL 302 redirect |
| `main.go` | Start R2 cleanup background task |
| `go.mod` | Add `aws-sdk-go-v2/service/s3` |
| `web/src/pages/Setting/` | Register storage tab |
| `web/src/i18n/locales/*.json` | Add storage setting i18n keys |

### Grok Video API Reference

**Submit**: `POST /v1/videos`
```json
{
    "images": [],
    "model": "grok-3-video-15s",
    "orientation": "portrait",
    "prompt": "小猫在飞行",
    "duration": 10,
    "watermark": false,
    "private": true
}
```

**Query**: `GET /v1/videos/{task_id}`

**Unified Format Submit**: `POST /v1/video/create`
```json
{
    "model": "grok-video-3",
    "prompt": "提示词",
    "aspect_ratio": "2:3",
    "size": "720P",
    "images": []
}
```

**Unified Format Query**: `GET /v1/video/query?id={task_id}`
