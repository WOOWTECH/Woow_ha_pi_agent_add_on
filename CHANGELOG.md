# Changelog

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
