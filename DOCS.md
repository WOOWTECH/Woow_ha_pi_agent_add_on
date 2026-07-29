# Woow HA Pi Agent

## What it is

A single Home Assistant Supervisor add-on that installs [`@agegr/pi-web`](https://github.com/agegr/pi-web) — a browser workspace for the [`pi`](https://github.com/earendil-works/pi) coding agent — pre-configured to route inference through WoowTech's [GLM (智譜清言)](https://open.bigmodel.cn) OpenAI-compatible endpoint with `thinkingFormat: "zai"` so GLM-4.6 reasoning chunks surface as pi's thinking tokens.

pi-web imports `@earendil-works/pi-coding-agent` as an in-process SDK, so there is no separate agent daemon — one process handles both UI and inference.

## Configuration

| Option | Required | Notes |
|---|---|---|
| `api_key` | Yes | Your GLM API key from `open.bigmodel.cn`. Stored by HA as a secret — never logged in normal operation. |
| `extra_allowed_hosts` | No | Comma-separated extra `Host:` values pi-web will accept. Only needed if you front the add-on with a reverse proxy using a non-IP hostname. IP literals and loopback names are auto-accepted. |

## First-run bootstrap

On first start, the add-on writes `/data/pi-agent/models.json` containing one provider (`glm`) that points at `https://open.bigmodel.cn/api/paas/v4` via `api: openai-completions` with `thinkingFormat: "zai"`, and one model (`glm-4.6`). It references the API key as `$GLM_API_KEY`, which pi resolves at request time from the environment — so rotating the key via the add-on UI takes effect on restart without editing files.

To add or override models, edit them in pi-web's **Models** panel or edit `/data/pi-agent/models.json` directly (via the HA File Editor add-on pointed at `/addon_configs/…` or `docker exec`). Subsequent restarts **do not touch** the file if it already exists — your edits persist.

## Accessing the UI

pi-web is served through **HA Supervisor Ingress** at `/hassio/ingress/woow_ha_pi_agent` — no ports are published on the LAN. Two easy entry points:

- **Open Web UI** button on the add-on's Info tab
- **Pi Agent** entry in the HA sidebar (visible to admins only; controlled by `panel_admin: true` in `config.yaml`)

Because the URL rides on your existing Home Assistant hostname/port, it works transparently over HA's local network, Nabu Casa remote UI, or any reverse proxy already fronting HA.

## Security notes

- pi-web has **no application-level authentication**. Access control is delegated to Home Assistant: only HA users can hit the ingress endpoint, and the sidebar tile is gated to admins via `panel_admin: true`.
- The GLM API key is stored in `/data/options.json` inside the add-on container (managed by HA Supervisor) and passed to pi as `$GLM_API_KEY`. Neither the add-on nor pi log the value.
- Sessions and models config live under `/data/pi-agent/` — backed up by HA's snapshot system automatically.

## Data locations

| Path | Contents |
|---|---|
| `/data/pi-agent/sessions/` | pi session `.jsonl` files (one per conversation) |
| `/data/pi-agent/models.json` | Provider + model registry (editable via pi-web UI) |
| `/data/pi-agent/auth.json` | OAuth tokens for providers configured via `/login` |

## Troubleshooting

- **Add-on won't start with "api_key is required"** — open Configuration tab, paste key, save, then start.
- **UI loads but chat returns 401** — API key wrong or GLM quota exhausted. Rotate the key in Configuration; add-on restarts automatically.
- **"Open Web UI" button does nothing / 404 from ingress** — reload HA (`ha core restart`); the ingress token is minted at add-on start and occasionally needs the Supervisor to re-register the panel.
- **Assets 404 under ingress prefix (blank page, network tab shows `/_next/...` 404s)** — this is the Next.js absolute-path issue noted in `CHANGELOG.md`. Track / report at the add-on repo; the workaround is a rewriting proxy in front of pi-web, planned for a future release.
- **"Host not allowed" from pi-web** — you're reaching pi-web through a reverse proxy in front of HA that changes the `Host:` header. Add that host to `extra_allowed_hosts` (comma-separated).
