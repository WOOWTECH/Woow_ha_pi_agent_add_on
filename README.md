# WoowTech HA Pi Agent Add-on Repository

Home Assistant Supervisor add-on that ships [pi-web](https://github.com/agegr/pi-web) — the browser workspace for the [pi coding agent](https://github.com/earendil-works/pi) — pre-wired to WoowTech's GLM (智譜清言) inference gateway.

## Install

1. In Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add: `https://github.com/WOOWTECH/Woow_ha_pi_agent_add_on`
3. Install **Woow HA Pi Agent**
4. Open the **Configuration** tab, paste your GLM API key, save
5. Start the add-on; open the log to confirm `pi-web` is listening on `:30141`
6. Open the UI via the **Open Web UI** button, or from the **Pi Agent** entry in the HA sidebar (admins only)

The UI is served through Home Assistant's Ingress proxy, so no extra ports need to be opened on the LAN or firewall — anyone who can reach Home Assistant can reach Pi Agent.

See [`DOCS.md`](DOCS.md) for full usage notes and troubleshooting.

## What's inside

- **Provider**: WoowTech GLM (`glm-4.6`) via OpenAI-compat endpoint with `thinkingFormat: "zai"`, seeded once at first start
- **UI**: pi-web behind HA Ingress (no application-level auth — trust anyone with HA admin access)
- **State**: sessions + `models.json` under `/data/pi-agent/`, backed up by HA snapshots
- **Rotate the GLM API key**: change it in the add-on Configuration tab and restart. `models.json` is not overwritten — the key is resolved from `$GLM_API_KEY` at request time.
- **Add / override models**: edit them in pi-web's **Models** panel or `/data/pi-agent/models.json` directly. Restarts do not touch existing config.

## Images

Multi-arch images are published to GHCR by [`.github/workflows/build.yml`](.github/workflows/build.yml):

- `ghcr.io/woowtech/woow-ha-pi-agent-amd64:<version>`
- `ghcr.io/woowtech/woow-ha-pi-agent-aarch64:<version>`
