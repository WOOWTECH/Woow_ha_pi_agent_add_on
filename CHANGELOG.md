# Changelog

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
