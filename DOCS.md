# Woow HA Pi Agent

## What it is

A single Home Assistant Supervisor add-on that installs [`@agegr/pi-web`](https://github.com/agegr/pi-web) — a browser workspace for the [`pi`](https://github.com/earendil-works/pi) coding agent — pre-configured with two reasoning providers so a team can compare them side-by-side:

- **GLM-4.6** ([智譜清言](https://open.bigmodel.cn)) via `openai-completions` + `thinkingFormat: "zai"`
- **MiniMax M3** (`https://api.minimax.io`) via `openai-completions` + `thinkingFormat: "deepseek"` — enabled only when the `minimax_api_key` option is set

pi-web imports `@earendil-works/pi-coding-agent` as an in-process SDK, so there is no separate agent daemon — one process handles both UI and inference.

## Configuration

| Option | Required | Notes |
|---|---|---|
| `api_key` | Yes | Your GLM API key from `open.bigmodel.cn`. Stored by HA as a secret — never logged in normal operation. |
| `minimax_api_key` | No | Your MiniMax API key from `api.minimax.io`. When set, adds the `minimax` provider + `MiniMax-M3` model to `models.json` on next start (idempotent — only added if absent). |
| `extra_allowed_hosts` | No | Comma-separated extra `Host:` values pi-web will accept. Only needed if you front the add-on with a reverse proxy using a non-IP hostname. IP literals and loopback names are auto-accepted. |

## First-run bootstrap

On first start, the add-on writes `/data/pi-agent/models.json` seeded with the GLM provider (referencing `$GLM_API_KEY`). If `minimax_api_key` is set, a `minimax` provider entry (referencing `$MINIMAX_API_KEY`) is merged in via `jq`. Both keys are resolved from the environment at request time — rotating a key in the Configuration tab takes effect on restart without editing files.

On subsequent starts, the bootstrap **only adds missing providers** and never overwrites existing entries. If you delete the `minimax` provider via pi-web's Models panel, it stays deleted; only clearing the entire file re-triggers the full seed. Same for any custom models you add.

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
- **Assets 404 under ingress prefix (blank page, network tab shows `/_next/...` 404s)** — should be handled by the nginx sub_filter wrapper (`nginx` s6 service). Check `ha addons logs b9cf5676_woow_ha_pi_agent` for nginx errors; look for a request path that does not start with `X-Ingress-Path`, which means Supervisor didn't inject the header.
- **"Host not allowed" from pi-web** — you're reaching pi-web through a reverse proxy in front of HA that changes the `Host:` header. Add that host to `extra_allowed_hosts` (comma-separated).
