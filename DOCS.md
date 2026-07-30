# Woow HA Pi Agent

## What it is

A single Home Assistant Supervisor add-on that installs [`@agegr/pi-web`](https://github.com/agegr/pi-web) — a browser workspace for the [`pi`](https://github.com/earendil-works/pi) coding agent — pre-configured with **seven reasoning providers** so a team can compare them side-by-side:

| Provider | Endpoint | Notes |
|---|---|---|
| **GLM-4.6** (智譜清言) | `https://open.bigmodel.cn/api/paas/v4` | `openai-completions` + `thinkingFormat: "zai"` |
| **MiniMax M3** | `https://api.minimax.io/v1` | `openai-completions` + `thinkingFormat: "deepseek"` |
| **OpenAI** | `https://api.openai.com/v1` | GPT-4o + GPT-4o mini |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Claude Sonnet 4 / GPT-4o / DeepSeek / Llama 3.3 70B curated set |
| **Anthropic direct** | `https://api.anthropic.com/v1` | `anthropic` API mode — first-class thinking blocks + cache_control markers, Opus 4.7 / Sonnet 4.6 / Haiku 4.5 |
| **DeepSeek direct** | `https://api.deepseek.com/v1` | Cheaper than via OpenRouter; exposes `deepseek-reasoner` (R1) with thinking tokens |
| **Groq** | `https://api.groq.com/openai/v1` | LPU-hosted, ~500 tok/s draft tier — Llama 3.3 70B + Kimi K2 |

Each provider is enabled only when its key is set; unset providers are skipped silently.

pi-web imports `@earendil-works/pi-coding-agent` as an in-process SDK, so there is no separate agent daemon — one process handles both UI and inference.

## Configuration

| Option | Required | Notes |
|---|---|---|
| `api_key` | No† | GLM API key from `open.bigmodel.cn`. |
| `minimax_api_key` | No† | MiniMax API key from `api.minimax.io`. |
| `openai_api_key` | No† | OpenAI API key from `platform.openai.com`. |
| `openrouter_api_key` | No† | OpenRouter API key from `openrouter.ai`. |
| `anthropic_api_key` | No† | Anthropic API key from `console.anthropic.com`. |
| `deepseek_api_key` | No† | DeepSeek API key from `platform.deepseek.com`. |
| `groq_api_key` | No† | Groq API key from `console.groq.com`. |

† **At least one** provider key must be set — the add-on refuses to boot otherwise (a fatal log line in the Logs tab makes this obvious rather than showing an empty model dropdown).

All key options are declared as `password?` in the schema so HA stores them as secrets and never renders them in the UI in plaintext.

## First-run bootstrap

On first start, the add-on writes `/data/pi-agent/models.json` seeded with the first provider it finds a key for, checked in the priority order:

`GLM → Anthropic → OpenAI → OpenRouter → DeepSeek → Groq → MiniMax`

Any additional providers whose keys are set get merged in on subsequent boots via an idempotent `jq` operation — user edits (renames, removed providers, added custom models) survive across restarts. Only clearing the whole file re-triggers the seed.

All keys are referenced from the JSON as `$GLM_API_KEY` / `$OPENAI_API_KEY` / etc. and resolved from the environment at request time. Rotating a key in the Configuration tab takes effect on restart without editing files.

## Per-provider startup self-check

Every configured provider is probed once with a `max_tokens=1` request during boot. The result is logged to the addon Logs tab per line:

- `HTTP 200` → provider OK
- `HTTP 401/403` → key wrong — fix in Configuration
- `HTTP 402/429` → auth OK but out of credits or rate-limited
- `HTTP 000` → network / DNS unreachable
- Anything else → chat may fail, unusual response

The self-check is non-fatal — the UI always boots so the user can open Configuration and fix a bad key.

## Accessing the UI

pi-web is served through **HA Supervisor Ingress** at `/hassio/ingress/woow_ha_pi_agent` — no ports are published on the LAN. Two easy entry points:

- **Open Web UI** button on the add-on's Info tab
- **Pi Agent** entry in the HA sidebar (visible to admins only; controlled by `panel_admin: true` in `config.yaml`)

Because the URL rides on your existing Home Assistant hostname/port, it works transparently over HA's local network, Nabu Casa remote UI, or any reverse proxy already fronting HA. No `extra_allowed_hosts` / whitelist config is required — nginx rewrites the upstream `Host` header to `localhost` so pi-web's `isApiRequestAllowed()` always passes.

The sidebar entry is enabled automatically on every boot via a Supervisor API POST — fresh installs get the sidebar tile without hunting for the "Show in sidebar" toggle.

## Watchdog

`config.yaml` declares `watchdog: http://[HOST]:[PORT:30142]/api/home`. HA Supervisor probes that URL periodically, and restarts the add-on if pi-web stops responding. The nginx front proxies `/api/home` to pi-web without auth so the Supervisor probe hits a live handler.

## Data locations

| Path | Contents | Persistent? |
|---|---|---|
| `/data/pi-agent/sessions/` | pi session `.jsonl` files (one per conversation) | Yes — per-addon, backed up by HA snapshots |
| `/data/pi-agent/models.json` | Provider + model registry (editable via pi-web UI) | Yes — user edits survive restarts |
| `/data/pi-agent/auth.json` | OAuth tokens for providers configured via `/login` | Yes |
| `/data/pi-agent/home/pi-cwd-*/` | Ephemeral worktrees created by the pi coding agent (via `HOME=$DATA_DIR/home`) | Yes — survives addon updates |

Before v0.10.0, `pi-cwd-*` worktrees landed on the container root filesystem and vanished on every image update. `HOME` is now redirected into `/data/pi-agent/home` so the pi coding agent's default workspaces persist alongside sessions.

## Security notes

- pi-web has **no application-level authentication**. Access control is delegated to Home Assistant: only HA users can hit the ingress endpoint, and the sidebar tile is gated to admins via `panel_admin: true`.
- Provider API keys are stored in `/data/options.json` inside the add-on container (managed by HA Supervisor) and passed to pi as `$GLM_API_KEY` / `$OPENAI_API_KEY` / etc. Neither the add-on nor pi log the values.
- The nginx `X-Ingress-Path` header is whitelist-validated against `^/api/hassio_ingress/[A-Za-z0-9_-]{16,128}$` before it can reach any `sub_filter` body-rewrite or the shim's `window.__INGRESS_PATH__` literal — defense-in-depth against a misconfigured upstream proxy letting the client shape the header.

## Troubleshooting

- **Add-on won't start with "No provider key configured"** — open Configuration tab, paste at least one key, save, then start.
- **UI loads but chat returns 401** — API key wrong or provider quota exhausted. Rotate the key in Configuration; add-on restarts automatically. Check the Logs tab for the per-provider self-check line to identify which provider is failing.
- **Chat returns 402 / 429** — auth OK but out of credits / rate-limited. Refill the provider account or switch to another provider from the Models dropdown.
- **"Open Web UI" button does nothing / 404 from ingress** — reload HA (`ha core restart`); the ingress token is minted at add-on start and occasionally needs the Supervisor to re-register the panel.
- **Assets 404 under ingress prefix (blank page, network tab shows `/_next/...` 404s)** — should be handled by the nginx sub_filter wrapper + injected `</head>` shim (fetch / EventSource / XHR / history / setAttribute / property-setter interception). Check `ha addons logs b9cf5676_woow_ha_pi_agent` for nginx errors; look for a request path that does not start with `X-Ingress-Path`, which means Supervisor didn't inject the header.
- **Sidebar tile missing** — the Supervisor API POST during boot occasionally fails on slow supervisors. Toggle "Show in sidebar" manually on the add-on's Info tab.
- **Worktree disappeared after addon update** — should not happen since v0.10.0 (`HOME=/data/pi-agent/home`). If you upgraded from ≤v0.9.1, pre-existing worktrees were on the ephemeral rootfs and did not carry over — recreate them under `HOME` this time.
