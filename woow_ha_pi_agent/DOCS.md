# Woow HA Pi Agent

## What it is

A single Home Assistant Supervisor add-on that installs [`@agegr/pi-web`](https://github.com/agegr/pi-web) — a browser workspace for the [`pi`](https://github.com/earendil-works/pi) coding agent — pre-configured to route inference through WoowTech's [GLM (智譜清言)](https://open.bigmodel.cn) Anthropic-compatible endpoint.

pi-web imports `@earendil-works/pi-coding-agent` as an in-process SDK, so there is no separate agent daemon — one process handles both UI and inference.

## Configuration

| Option | Required | Notes |
|---|---|---|
| `api_key` | Yes | Your GLM API key from `open.bigmodel.cn`. Stored by HA as a secret — never logged in normal operation. |
| `extra_allowed_hosts` | No | Comma-separated extra `Host:` values pi-web will accept. Only needed if you front the add-on with a reverse proxy using a non-IP hostname. IP literals and loopback names are auto-accepted. |

## First-run bootstrap

On first start, the add-on writes `/data/pi-agent/models.json` containing one provider (`glm`) that points at `https://open.bigmodel.cn/api/anthropic` and one model (`glm-4.6`). It references the API key as `$GLM_API_KEY`, which pi resolves at request time from the environment — so rotating the key via the add-on UI takes effect on restart without editing files.

To add or override models, edit them in pi-web's **Models** panel or edit `/data/pi-agent/models.json` directly (via the HA File Editor add-on pointed at `/addon_configs/…` or `docker exec`). Subsequent restarts do not touch the file if it already exists.

## Accessing the UI

The add-on exposes pi-web on TCP `30141`. Reach it at:

```
http://<home-assistant-ip>:30141
```

To pin it in the HA sidebar, add this to `configuration.yaml` and restart HA:

```yaml
panel_iframe:
  pi_agent:
    title: Pi Agent
    url: "http://homeassistant.local:30141"
    icon: mdi:robot
    require_admin: true
```

## Security notes

- pi-web has **no application-level authentication**. Only expose it on trusted networks. The `panel_iframe` above respects `require_admin: true`, which restricts the sidebar link to HA admins — but the underlying `:30141` port is open to anyone on the LAN who knows the URL.
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
- **UI unreachable at `:30141`** — check that `ports: 30141/tcp: 30141` was accepted (Configuration → Network); some HA setups require confirming the port mapping in the UI after first install.
- **"Host not allowed" from pi-web** — you're accessing via a custom hostname. Add it to `extra_allowed_hosts` (comma-separated).
