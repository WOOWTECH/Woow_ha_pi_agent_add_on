# Changelog

## 0.1.0

Initial release.

- Single `pi-web` s6-overlay longrun service on port 30141
- Pre-wired GLM provider via anthropic-messages compatible endpoint
- API key injected via `$GLM_API_KEY` env-interp in `models.json` — rotate without file edits
- amd64 + aarch64 build from `ghcr.io/hassio-addons/debian-base:9.1.0`
