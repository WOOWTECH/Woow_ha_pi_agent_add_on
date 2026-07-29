# Changelog

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
