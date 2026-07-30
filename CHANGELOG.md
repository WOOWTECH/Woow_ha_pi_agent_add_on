# Changelog

## 0.10.0

- **Add three new BYOK providers**: Anthropic direct, DeepSeek direct, and Groq. The catalog is now 7 providers (GLM / MiniMax / OpenAI / OpenRouter / Anthropic / DeepSeek / Groq). Rationale per provider:
  - **Anthropic direct** uses the `anthropic` API mode instead of the `openai-completions` bridge, so pi-web sees first-class thinking blocks and `cache_control` markers — the OpenRouter → Anthropic route loses both. Seeds Opus 4.7 / Sonnet 4.6 / Haiku 4.5.
  - **DeepSeek direct** is cheaper than DeepSeek-via-OpenRouter and exposes the native `deepseek-reasoner` (R1) with thinking tokens; the OpenRouter route currently strips them.
  - **Groq** LPU-hosted (~500 tok/s) covers the "cheap fast draft" tier — Llama 3.3 70B + Kimi K2. Useful as a scratch model while the flagship reasoner is thinking.
- Extend the boot self-check to cover the three new providers. Anthropic needs a special code path (`x-api-key` + `anthropic-version` headers instead of `Authorization: Bearer`, and Haiku for the probe because Sonnet/Opus reject `max_tokens=1`); the other two reuse the standard OpenAI-compatible probe.
- **Add HA Supervisor watchdog** via `watchdog: http://[HOST]:[PORT:30142]/api/home` in `config.yaml`. Supervisor probes the nginx front once per interval; a hung pi-web (crashloop, deadlocked event loop, wedged DB write) now triggers auto-restart instead of leaving the UI stuck. `/api/home` was chosen because it's the only pi-web route that a fresh install answers `200` on without a session context.
- **Persist pi coding-agent worktrees** by redirecting `HOME=/data/pi-agent/home`. Before this, `pi-cwd-<date>/` directories landed on the ephemeral container rootfs and vanished on every image update — users on v0.7.x → v0.9.1 lost their in-flight work whenever a new tag shipped. `/data/pi-agent/` is the persistent per-addon mount already backed up by HA snapshots. `backup_exclude` now also skips `node_modules` and `.cache` under the worktree tree to keep snapshots small.
- **Pin pi-web to `0.8.4`** in the Dockerfile (was `@latest`). The ingress shim rewrites 40+ hardcoded `/api/*` routes and the `T()` predicate assumes today's `_next` chunk shape / RSC prefetch behavior — an upstream refactor to any of those would silently regress the shim without any local code change. New pi-web releases now require a manual bump-and-verify in this repo, gated by the QA loop that produced v0.9.1.
- **Drop the `extra_allowed_hosts` config option**. Since v0.6.0 the nginx front rewrites `Host: localhost` before proxying to pi-web, so pi-web's `isApiRequestAllowed()` guard is unconditionally satisfied and the option had zero effect. Keeping a no-op option in the schema misled users into thinking it was a knob they should configure. Removed from `config.yaml` options + schema, the run script, and DOCS.md.

## 0.9.1

- Close the last set of console 404s uncovered in v0.9.0 QA: `.woff2` fonts (4×), a CSS asset served as `text/plain 404`, and `favicon.ico?<hash>` all failing to load. Root cause: after hydration, `ReactDOM.preinit()` and `next/font`'s runtime inject fresh `<link href="/_next/…">` and `<link href="/favicon.ico?…">` elements straight into the DOM — the browser fetches those assets by walking the element tree, so none of the v0.7.x fetch / EventSource / XMLHttpRequest wrappers ever see the URL. Cached CSS was masking the visual impact, but the network tab was loud and it would have bitten anyone on a cold cache or an offline reload.
  - Extend the `</head>` shim with a fourth interception layer: `Element.prototype.setAttribute` is wrapped so `href=` / `src=` writes go through the same `S() → T() → P+` normalizer used by fetch, and `HTMLLinkElement.prototype.href` / `HTMLScriptElement.prototype.src` / `HTMLImageElement.prototype.src` property setters are re-defined to do the same. React's DOM writes go through either path depending on the injection strategy, so we cover both.
  - No changes to `T()` — favicon and `/_next/` prefixes already matched, the URLs just weren't reaching it. Keeping the predicate untouched means script-tag hardcoded paths, RSC prefetches, and history rewrites still behave identically to v0.9.0.

## 0.9.0

- Broaden the built-in provider set from GLM+MiniMax to **GLM + MiniMax + OpenAI + OpenRouter**, so the addon isn't stuck on providers that require topping up a Chinese-side account. Real-world driver: the shipped GLM key hit `code 1113 余额不足` (out of credits) and MiniMax `1008 insufficient_balance` on the QA account; OpenAI + OpenRouter both returned 200 with the same self-check curl, so having them as first-class options removes the "install → chat 500s → open .jsonl → discover it's a credit issue" trap for new users.
  - New add-on options `openai_api_key` (`password?`) and `openrouter_api_key` (`password?`), both optional.
  - `api_key` (GLM) is now **optional** too — a hard runtime check enforces "at least one of the four must be set", failing fast on boot with a fatal log line so misconfiguration is obvious rather than showing an empty model dropdown.
  - `models.json` first-boot seed picks whichever provider the user configured first from the priority list `GLM → OpenAI → OpenRouter → MiniMax`; any additional providers whose keys are set get merged in via `jq` on subsequent boots, mirroring the idempotent additive pattern used for MiniMax since v0.4.0. Deleting a provider from `models.json` will not resurrect it — user edits win.
  - OpenRouter seed ships a curated 4-model set: `anthropic/claude-sonnet-4`, `openai/gpt-4o`, `deepseek/deepseek-chat`, `meta-llama/llama-3.3-70b-instruct` (covers the four common quality/speed tiers). OpenAI seed ships `gpt-4o` + `gpt-4o-mini`.
- Extend the v0.8.0 startup self-check to run **once per configured provider** and log the outcome per line, so a mixed-provider install (e.g., GLM out of credits + OpenAI healthy) shows both states in the Logs tab. Also add a new `HTTP 402|429` branch that reads "auth OK but limited — out of credits / rate-limited" — GLM's `1113` returns HTTP 429, MiniMax's `1008` returns HTTP 402; both used to fall through to a generic "unexpected HTTP N" warning that misdiagnosed the failure as a code bug when it's actually a billing issue.

## 0.8.0

- Fix the three latent operational gaps found by the browser + backend QA round on v0.7.3 (chat plumbing was correct but three papercuts made the failure modes look opaque to a new user):
  - **Sidebar auto-enable.** `panel_title` / `panel_icon` / `panel_admin` in `config.yaml` only supply *defaults* for the Supervisor's `ingress_panel` state — the actual sidebar entry only sticks after "Show in sidebar" is toggled on, which flips `ingress_panel=true`. Users were installing the addon, expecting the "Pi Agent" sidebar item, not seeing it, and giving up. Fix: on every boot the `pi-web` service posts `{"ingress_panel": true}` to `http://supervisor/addons/self/options` using `$SUPERVISOR_TOKEN`, so a fresh install just shows up in the sidebar without hunting for the toggle. Requires `hassio_api: true` (already set since v0.7.0).
  - **Provider startup self-check.** A bad `api_key` produced a silent failure — pi-web booted fine, UI came up, but every Send returned `401 "身份验证失败。"` from GLM and the user had to open the session `.jsonl` to diagnose. Fix: the run script now curls GLM's `/chat/completions` with `max_tokens=1` before `exec pi-web`, and logs a bashio warning on 401/403/timeout so the failure is visible in the addon Logs tab immediately. Kept non-fatal on purpose — the UI must still boot so the user can open Configuration and fix the key.
  - **stderr → s6 log.** pi-web writes some diagnostics to stderr; the s6 log service only captured stdout, so anything that crashed the node process left no trace in the addon Logs tab. Fix: `exec 2>&1` at the top of the run script merges both streams.
- Also add `ingress_stream: true` to `config.yaml` — HA Supervisor otherwise applies default 60s buffering to the ingress connection, which times out the chat SSE stream mid-generation on long responses. With the flag the Supervisor holds the connection open for the full response and pi-web's EventSource stays connected past the first minute.

## 0.7.3

- Third and final piece of the Next.js RSC-prefetch escape saga. Even with v0.7.2's `S()` normalization, `router.push('/')` was still landing on HA Core (`GET https://<HA-host>/?_rsc=<token>` → 200 dashboard HTML → Next.js router did a hard `location.href` fallback into HA's `/dashboard-home/overview`, blanking the iframe). Root cause: Next.js's `fetchServerResponse()` constructs the RSC URL via `new URL(pathname, location.origin)` and calls `fetch(urlObject, ...)` — passing a **URL object**, not a string and not a `Request`. The shim's fetch wrapper only had branches for `typeof i === "string"` and `i.url` (Request), so URL objects fell through untouched.
- Fix adds an explicit `i instanceof URL` branch that reads `.href` through `S()` (same normalizer as before) and rewrites to the ingress-prefixed string form (`fetch` accepts either string or URL as its first arg, so a string here is fine). All three input shapes — string / URL / Request — are now normalized through the same `S() → T()` pipeline.

## 0.7.2

- Fix the follow-on regression uncovered while validating v0.7.1 in the browser: Next.js's App Router prefetch was still landing on HA Core (`GET https://<HA-host>/?_rsc=<token>` → 200 dashboard HTML) even though the shim's `T()` predicate contained an `_rsc=` branch. Root cause: Next.js constructs the RSC probe URL with `new URL(href, location.href)` and passes the resulting **absolute-URL string** to `fetch(...)`. The shim's guard was `u.charAt(0) === "/"` — an absolute URL starts with `h` (as in `https://...`), so `T()` returned `false` and the fetch skipped the prefix.
- Fix wraps every URL input (fetch string arg, `Request.url`, `EventSource` URL, `XMLHttpRequest.open` URL, `history.pushState/replaceState` URL) through a new `S(u)` helper that strips a leading `location.origin` before `T()` inspects it. Same-origin absolute URLs are now normalized to their path form and routed through the prefix; cross-origin absolute URLs (analytics, CDNs, external APIs — none of which pi-web actually calls today, but keeping this clean matters if upstream adds any) pass through untouched because after strip they still fail the `charAt(0) === "/"` check.
- Also tightens the `history.pushState/replaceState` wrapper to run the same normalization so `router.push('https://<HA-host>/foo')` (unlikely from upstream, but not impossible) still lands inside the ingress prefix.

## 0.7.1

- Emergency hotfix for v0.7.0's regression: every `/_next/static/**` asset returned `404` with `text/plain` MIME (browser then refuses to execute the JS chunks, the whole Pi Agent UI shows a blank iframe). Root cause was a typo in the `map` block that was supposed to whitelist-validate `X-Ingress-Path` — the source variable had been rewritten from `$http_x_ingress_path` to `$safe_ingress_path` by a stray `replace_all`, so the map became `map $safe_ingress_path $safe_ingress_path { ... }` (self-referential, never defined, always coerced to `""`). Every `sub_filter '…$safe_ingress_path/_next/…'` template then substituted with an empty prefix, leaving `href="/_next/…"` in the HTML — the browser resolved that against HA Core, got 404, and everything downstream cascaded. The XSS-hardening intent of v0.7.0 is preserved; the fix is just restoring `$http_x_ingress_path` as the map's source variable.

## 0.7.0

- Fix the follow-on "iframe goes blank after picking a project" bug uncovered by Playwright browser QA. Root cause: pi-web's Next.js Router calls `router.push('/')` after the project picker resolves, which under the hood does two things v0.6.0's shim did not handle — (1) fetches an RSC payload on the current pathname with `?_rsc=<token>` appended (for the root that's `/?_rsc=…`, which starts with `/?` not `/api/`, so the shim's `isTargetPath()` filter passed it through unchanged and the browser resolved it against HA Core at `https://<HA-host>/?_rsc=…`, getting the HA dashboard HTML back and crashing the Next.js client with `TypeError: Failed to fetch`), and (2) updates the URL bar via `history.pushState('/')` which then makes every subsequent `location.pathname`-relative fetch escape the ingress prefix.
- Fix extends the shim in two places: `isTargetPath()` now also matches any path containing `_rsc=` (Next.js RSC probe), and `history.pushState` / `history.replaceState` are wrapped so any push to a path not already under the ingress prefix gets the prefix prepended. Net effect: the iframe stays inside `/api/hassio_ingress/<token>/…` for the entire life of the session — project picker → chat → skills → plugins → models all just work.
- Harden the sub_filter injection against the `X-Ingress-Path` XSS vector flagged by the security audit (F-01). Introduce an nginx `map $http_x_ingress_path $safe_ingress_path` guard that only accepts values matching `^/api/hassio_ingress/[A-Za-z0-9_-]{16,128}$` — anything else is coerced to `""` before it can reach any `sub_filter` template or the shim's `window.__INGRESS_PATH__` literal. HA Supervisor's Ingress layer already emits well-formed tokens, so this is defense-in-depth against a hypothetical misconfigured upstream proxy letting the client shape the header (`X-Ingress-Path: "; alert(1); //`).

## 0.6.0

- Fix the follow-on `403 "Untrusted API request"` bug where the project picker, Skills, Plugins, Models, and File-index panels all failed to load even though `/api/models-config` + `/api/sessions` returned 200. Root cause: pi-web's `isApiRequestAllowed()` (upstream `lib/request-security.ts`) checks two things on **every** `/api/*` request — (1) the `Host` header must be a loopback name / IP literal / entry in `PI_WEB_ALLOWED_HOSTS`, and (2) if an `Origin` header is present it must exactly equal `${protocol}://${host}` of the request. Under HA Ingress the browser hits `https://<HA-host>:8123/api/hassio_ingress/<token>/...`, so the forwarded `Host` was `homeassistant.local` (or the user's LAN IP / duckdns hostname) and forwarded `Origin` was `https://homeassistant.local` — neither matched pi-web's rules, so every auth-gated route returned 403.
- Fix is **two `proxy_set_header` lines in nginx**: rewrite `Host` to `localhost` (which pi-web treats as trusted unconditionally via `isLoopbackHostname`) and set `Origin` to `""` (which nginx interprets as "drop the header", satisfying the "no Origin = pass" branch of the check). No user configuration required — `extra_allowed_hosts` remains available but is no longer needed for the common case.
- Why not just document `extra_allowed_hosts` instead? Users don't always know their HA hostname (`homeassistant.local`, LAN IP, `<duckdns>.duckdns.org`, Nabu Casa remote URL — all different) and would have to add each one. Host rewriting works transparently regardless of how the user reaches HA.

## 0.5.0

- Fix the "everything 404" bug users hit as soon as they tried to chat or open the Skills panel. pi-web's client-side JS calls **over 40 distinct `/api/*` routes** on absolute paths (`/api/sessions`, `/api/skills`, `/api/agent/*`, `/api/auth/*`, `/api/files/*`, `/api/git/*`, `/api/plugins`, `/api/models*`, `/api/worktrees`, `/api/cwd/*`, `/api/file-index`, `/api/project-trust`, ...) plus 9 `EventSource` streams for chat/agent-events. Under HA Ingress the browser resolved those against `<HA-host>/api/...` — hit HA Core — 404. v0.3.0's sub_filter only handled `/_next/*` and `/favicon*`, not `/api/*`.
- Fix is a **fetch / EventSource / XMLHttpRequest shim injected at `</head>`** by nginx sub_filter. Shim reads the ingress prefix from `window.__INGRESS_PATH__` (nginx substitutes `$http_x_ingress_path` at request time) and prepends it to any absolute path starting with `/api/`, `/_next/`, or `/favicon` — but explicitly skips paths already under `/api/hassio_ingress/` so we don't double-prefix the one existing ingress URL that leaks into the JS bundle.
- Chose the shim over rewriting the bundle because a naive `"/api/` → `"$prefix/api/` sub_filter would clobber that embedded `/api/hassio_ingress/AeZVR…/_next/…` string. Shim is future-proof: any new pi-web `/api/*` route added upstream Just Works, no nginx changes needed.

## 0.4.0

- Add **MiniMax M3** as a second built-in provider alongside GLM-4.6 — team members can pick either model from pi-web's Models dropdown. Uses `openai-completions` at `https://api.minimax.io/v1` with `thinkingFormat: "deepseek"` so the `<think>...</think>` inline reasoning blocks surface as pi thinking tokens.
- New add-on option `minimax_api_key` (`password?`, optional). When set, the bootstrap adds a `minimax` provider entry to `models.json` on next start. Absent key means the addon behaves identically to v0.3.0 (GLM only).
- Bootstrap is now **idempotent + additive**: existing `models.json` from v0.3.0 keeps user edits; the MiniMax provider is merged in via `jq` only if the `minimax` key is missing. User can delete it and it will not be re-added unless they clear the whole file.
- The MiniMax API key is resolved from `$MINIMAX_API_KEY` at request time, mirroring the GLM key handling — rotating the key via the Configuration tab takes effect on restart.

## 0.3.0

- Fix the v0.2.0 caveat: pi-web's pre-built Next.js bundle emits absolute paths (`/_next/…`, `/favicon.ico`) that a browser resolves against the HA Core origin rather than the dynamic Ingress prefix. Add an **nginx sub_filter wrapper** as a second s6-overlay longrun service that reads the per-request `X-Ingress-Path` header from Supervisor and rewrites HTML / CSS / JS / RSC-flight bodies so lazy-loaded chunks, fonts, and favicon all round-trip through Ingress.
- nginx listens on `:30142` and is the new `ingress_port`; pi-web keeps `:30141` internally as the sub_filter upstream (no external binding).
- Upstream `Accept-Encoding` is stripped so sub_filter can inspect uncompressed bodies; HA Supervisor's ingress layer re-compresses for the browser.

## 0.2.0

- Switch UI exposure from published TCP port to **HA Supervisor Ingress** so the add-on works on standard HAOS without any firewall carve-out — LAN reachable via the Home Assistant UI at `/hassio/ingress/woow_ha_pi_agent`
- Add sidebar panel (`panel_title: Pi Agent`, `panel_icon: mdi:robot`, `panel_admin: true`) — admins see it directly in the HA sidebar
- Remove `ports:` / `webui:` — pi-web now only binds inside the container; Ingress proxies to `:30141`
- Known caveat: pi-web's pre-built Next.js assets are served from absolute `/_next/...` paths. If assets 404 under the Ingress prefix a future patch will add a rewriting reverse proxy in front of pi-web.

## 0.1.0

Initial release.

- Single `pi-web` s6-overlay longrun service on port 30141
- Pre-wired GLM (`glm-4.6`) via `openai-completions` at `https://open.bigmodel.cn/api/paas/v4` with `thinkingFormat: "zai"`
- API key injected via `$GLM_API_KEY` env-interp in `models.json` — rotate without file edits
- `models.json` seeded once on first start; UI edits are preserved across restarts
- amd64 + aarch64 build from `ghcr.io/hassio-addons/debian-base:9.1.0`, published to GHCR by GitHub Actions
