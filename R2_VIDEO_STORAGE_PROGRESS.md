# R2 Video Storage — Development Progress

> This file tracks the implementation progress of Cloudflare R2 video storage feature.
> Updated by AI assistant each session. Check CLAUDE.md for full requirements.

---

## Phase 1: R2 Infrastructure 

- [x] `setting/storage_setting/config.go` — R2 config struct + register to ConfigManager ✓
- [x] `common/r2_storage.go` — R2 S3 client (init, upload, delete, getPublicURL) ✓
- [x] `go.mod` — add `aws-sdk-go-v2/service/s3` ✓
- [x] `model/option.go` — add storage_setting import + handleConfigUpdate hook ✓

## Phase 2: Grok/xAI Video TaskAdaptor

- [x] `relay/channel/task/xai/constants.go` — video model list ✓
- [x] `relay/channel/task/xai/adaptor.go` — full TaskAdaptor + OpenAIVideoConverter implementation ✓
- [x] `relay/relay_adaptor.go` — register `case constant.ChannelTypeXai` in `GetTaskAdaptor()` ✓

## Phase 3: R2 Transfer Service

- [x] `service/r2_transfer.go` — download video from upstream URL + upload to R2 + retry logic ✓
- [x] `controller/task_video.go` — integrate R2 transfer in `updateVideoSingleTask()` SUCCESS branch ✓
- [x] Per-platform R2 enable check logic (only transfer if platform switch is ON) ✓

## Phase 4: VideoProxy Adaptation

- [x] `controller/video_proxy.go` — R2 URL detection → 302 redirect instead of stream proxy ✓
- [x] Expired task handling — return "视频已过期删除" when FailReason is empty/expired ✓

## Phase 5: Auto Cleanup Task

- [x] `service/r2_cleanup_task.go` — background goroutine, hourly ticker, delete expired R2 objects ✓
- [x] `main.go` — start cleanup task with `gopool.Go()` ✓
- [x] Clear `task.FailReason` after R2 object deleted ✓

## Phase 6: Admin Settings UI (Frontend)

- [x] `web/src/pages/Setting/Operation/StorageSetting.jsx` — storage settings component ✓
  - [x] Global R2 config form (Account ID, Access Key, Secret Key, Bucket, Domain, Retention Days) ✓
  - [x] Per-platform toggle switches (Ali, Kling, Jimeng, Vidu, Doubao, Hailuo, Grok) ✓
  - [x] Save button with loading/toast feedback ✓
  - [x] Responsive layout, match Semi Design theme ✓
- [x] Register storage tab in settings page router/tabs ✓
- [x] Backend API: storage settings read/write endpoints (uses existing /api/option/ via ConfigManager) ✓

## Phase 7: i18n

- [x] `web/src/i18n/locales/zh.json` — add Chinese keys ✓
- [x] `web/src/i18n/locales/en.json` — add English translations ✓
- [x] `web/src/i18n/locales/ja.json` — add Japanese translations ✓
- [x] Other locale files (fr, ru, vi) ✓

---

## Notes

- Priority: Phase 1 → 2 → 3 → 4 → 6 (Phase 2 and 1 can be parallel)
- Phase 5 can be done after core flow works
- Phase 7 can be done incrementally with Phase 6
- Grok is the primary focus platform

## Session Update (2026-04-18)

- [x] Fix OpenAI-compatible async video submit path to preserve mapped upstream model for `/v1/videos` task creation.
- [x] `relay/relay_task.go` now reuses `relay/helper/model_mapped.go:ModelMappedHelper` for async task submits and rewrites cached JSON request body so Sora/OpenAI task adaptors send the mapped model upstream.
- [x] Harden async task persistence at insert time:
  - persist `private_data.key` from submit-time API key for multi-key channels
  - persist `properties.upstream_model_name` / `properties.origin_model_name`
  - persist `private_data.upstream_task_id` when upstream task ID differs from local task ID
- [x] Fix compatible video polling classification so `task_not_exist` / not-found style upstream responses are treated as terminal failure instead of silently falling back to `IN_PROGRESS` 30%.
- [x] `/v1/videos/{task_id}/content` protected fetch now prefers `task.PrivateData.Key` before channel default key, so submit/poll/content use the same task-scoped credential on multi-key OpenAI-compatible channels.
- [ ] Verification is still pending in this environment because the `go` executable is unavailable, so compile/test confirmation must be run where Go is installed.


- [x] Refactor `controller/video_proxy.go` query takeover flow from async-return-95% to sync-wait transfer flow.
- [x] Add singleflight deduplication for query-triggered R2 transfer, keyed by `task_id`.
- [x] Query-side behavior now:
  - If R2 URLs already exist, return immediately.
  - If not, block query and perform transfer in-request.
  - If transfer fails, return transfer error (do not return upstream URL).
- [x] `/v1/videos/:task_id/content` now follows global query takeover switch:
  - With `VideoR2Enable=ON`, do not proxy upstream URL directly; transfer first, then redirect to R2.
- [x] Extend query takeover to legacy endpoint `/v1/video/generations/:task_id` via `relay/relay_task.go`:
  - With `VideoR2Enable=ON`, query waits for transfer and returns task data with R2 result.
  - If transfer fails, returns `r2_transfer_failed` instead of upstream URL.
- [x] Query takeover now respects "corresponding switch":
  - Known video platforms require both global switch and per-platform switch.
  - Unknown/OpenAI-compatible channel types use global switch only.
  - Legacy query response sanitizes common upstream media URL fields when takeover is enabled.
- [x] Policy changed to **global-only video transfer switch**:
  - Query takeover no longer depends on per-platform toggles.
  - Poller/path transfer now uses global switch + global prefix (`video` default).
  - Settings UI simplified: removed per-platform transfer toggles.
  - Non-transferable/protected upstream URLs now fall back to original behavior instead of hard failure.
- [x] Added dedicated storage settings APIs to avoid direct dependency on `/api/option/`:
  - `GET /api/storage/options`
  - `PUT /api/storage/options`
- [x] Fixed active frontend storage settings wrapper (`web/src/components/settings/StorageSetting.jsx`):
  - Use `/api/storage/options` for load.
  - Keep only global fields (`video_r2_enable`, `video_r2_prefix`) and correct boolean parsing.
- [x] Fixed settings submit endpoint (`SettingsStorage.jsx`) to use `/api/storage/options`, ensuring toggle save is effective.
- [x] Unified runtime platform checks fully to global switch (`IsPlatformR2Enabled` now follows global policy).
- [x] Improved R2 takeover persistence:
  - When media fields are transferred to R2, `FailReason` is now updated to main R2 URL even if original `FailReason` was non-R2.
  - This keeps query redirect and auto-delete cleanup behavior consistent.
- [x] `/v1/videos/:task_id` now prefers returning sanitized original task JSON payload with R2 links (when available), keeping response shape closer to upstream while hiding upstream URLs.
- [x] Sora R2 main-video transfer now prefers authenticated `/v1/videos/{id}/content` before falling back to upstream media URLs, reducing raw playback-link download failures without affecting other R2 platforms.
