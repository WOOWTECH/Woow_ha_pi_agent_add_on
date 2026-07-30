# WoowTech HA Pi Agent Add-on Repository

Home Assistant Supervisor add-on that ships [pi-web](https://github.com/agegr/pi-web) — the browser workspace for the [pi coding agent](https://github.com/earendil-works/pi) — pre-wired to seven reasoning providers so a team can pick a model per session and compare them side-by-side.

## Install

1. In Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add: `https://github.com/WOOWTECH/Woow_ha_pi_agent_add_on`
3. Install **Woow HA Pi Agent**
4. Open the **Configuration** tab, paste **at least one** provider API key, save
5. Start the add-on; open the log to confirm each configured provider passes its self-check
6. Open the UI via the **Open Web UI** button, or from the **Pi Agent** entry in the HA sidebar (admins only)

The UI is served through Home Assistant's Ingress proxy, so no extra ports need to be opened on the LAN or firewall — anyone who can reach Home Assistant can reach Pi Agent.

See [`DOCS.md`](DOCS.md) for full usage notes, per-provider model tables, and troubleshooting.

## What's inside

- **Providers** (BYOK, all optional; at least one required):
  - GLM-4.6 (智譜清言) — `openai-completions` + `thinkingFormat: "zai"`
  - MiniMax M3 — `openai-completions` + `thinkingFormat: "deepseek"`
  - OpenAI — GPT-4o / GPT-4o mini
  - OpenRouter — curated Claude Sonnet 4 / GPT-4o / DeepSeek / Llama 3.3 70B
  - Anthropic direct — Opus 4.7 / Sonnet 4.6 / Haiku 4.5 with native thinking blocks + cache_control
  - DeepSeek direct — V3 chat + R1 reasoner
  - Groq — Llama 3.3 70B + Kimi K2 (LPU-hosted, ~500 tok/s)
- **UI**: pi-web behind HA Ingress (no application-level auth — trust anyone with HA admin access)
- **State**: sessions + `models.json` + pi coding-agent worktrees under `/data/pi-agent/` (persistent across addon updates, backed up by HA snapshots)
- **Watchdog**: Supervisor probes `/api/home` and auto-restarts on hang
- **Rotate any API key**: change it in the add-on Configuration tab and restart. `models.json` is not overwritten — the key is resolved from its `$*_API_KEY` env var at request time.
- **Add / override models**: edit them in pi-web's **Models** panel or `/data/pi-agent/models.json` directly. Restarts do not touch existing config (idempotent additive merge).

## Images

Multi-arch images are published to GHCR by [`.github/workflows/build.yml`](.github/workflows/build.yml):

- `ghcr.io/woowtech/woow-ha-pi-agent-amd64:<version>`
- `ghcr.io/woowtech/woow-ha-pi-agent-aarch64:<version>`
