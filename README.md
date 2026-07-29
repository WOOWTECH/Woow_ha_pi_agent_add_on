# WoowTech HA Pi Agent Add-on Repository

Home Assistant Supervisor add-on that ships [pi-web](https://github.com/agegr/pi-web) — the browser workspace for the [pi coding agent](https://github.com/earendil-works/pi) — pre-wired to WoowTech's GLM (智譜清言) inference gateway.

## Install

1. In Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add: `https://github.com/WOOWTECH/Woow_ha_pi_agent_add_on`
3. Install **Woow HA Pi Agent**
4. Open the **Configuration** tab, paste your GLM API key, save
5. Start the add-on; open the log to confirm `pi-web` is listening on `:30141`
6. Access the UI at `http://<home-assistant-host>:30141`

For a sidebar entry, add to `configuration.yaml` and restart HA:

```yaml
panel_iframe:
  pi_agent:
    title: Pi Agent
    url: "http://homeassistant.local:30141"
    icon: mdi:robot
    require_admin: true
```

See [`woow_ha_pi_agent/DOCS.md`](woow_ha_pi_agent/DOCS.md) for full usage notes.

## Add-ons in this repository

| Add-on | Description |
|---|---|
| [Woow HA Pi Agent](woow_ha_pi_agent/) | Pi coding agent + pi-web UI, GLM-backed |
