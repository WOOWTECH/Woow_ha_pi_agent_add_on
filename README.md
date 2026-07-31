<p align="center">
  <img src="docs/screenshots/main_ui.png" alt="Woow HA Pi Agent — pi-web workspace inside Home Assistant" width="820"/>
</p>

<h1 align="center">Woow HA Pi Agent Add-on</h1>

<p align="center">
  <b>The <a href="https://github.com/agegr/pi-web">pi-web</a> workspace, packaged as a Home Assistant Supervisor add-on and pre-wired to 7 reasoning providers.</b><br/>
  <sub>GLM · MiniMax · OpenAI · OpenRouter · Anthropic · DeepSeek · Groq — BYOK, all optional, at least one required.</sub>
</p>

<p align="center">
  <a href="https://github.com/WOOWTECH/Woow_ha_pi_agent_add_on/releases"><img src="https://img.shields.io/github/v/release/WOOWTECH/Woow_ha_pi_agent_add_on?label=release&color=blue" alt="Release"/></a>
  <img src="https://img.shields.io/badge/HA%20add--on-Supervisor-41BDF5?logo=home-assistant&logoColor=white" alt="Home Assistant Add-on"/>
  <img src="https://img.shields.io/badge/arch-amd64%20%7C%20aarch64-lightgrey" alt="Architectures"/>
  <img src="https://img.shields.io/badge/base-debian--base%209.1.0-red?logo=debian&logoColor=white" alt="Base image"/>
  <img src="https://img.shields.io/badge/node-22.x-339933?logo=node.js&logoColor=white" alt="Node 22"/>
  <img src="https://img.shields.io/badge/pi--web-0.8.4-8A2BE2" alt="pi-web version"/>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"/>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#skills-system">Skills</a> ·
  <a href="#related-packages">Packages</a> ·
  <a href="#security">Security</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="README_zh-TW.md">中文文件</a>
</p>

---

## Overview

**Woow HA Pi Agent** is a single Home Assistant Supervisor add-on that ships [`@agegr/pi-web`](https://www.npmjs.com/package/@agegr/pi-web) — the browser workspace for the [pi coding agent](https://github.com/earendil-works/pi) — pre-wired to seven reasoning providers. Install once, paste a key, and every HA admin gets a per-session choice of model directly from the HA sidebar.

- **Zero-port install.** UI runs behind HA Ingress; no LAN/firewall changes.
- **BYOK, side-by-side.** Compare GLM-4.6 vs. Claude Opus 4.7 vs. Groq Llama in the same UI.
- **State survives updates.** Sessions + models + skill worktrees live under `/data/pi-agent/` and ride HA snapshots.
- **Skill store built in.** Add skills from GitHub URLs, `owner/repo` shorthand, or local paths straight from the UI (v0.12.0 shipped `git`+`openssh-client` so this works out of the box).
- **Video-production pipeline.** ffmpeg + Playwright + edge-tts + rclone all pre-installed for the `pitch_video` workflow (v0.11.0).
- **Watchdog.** Supervisor probes `/api/home`; hangs auto-restart.

## Quick Start

| Step | Action |
|---:|---|
| 1 | **Settings → Add-ons → Add-on Store → ⋮ → Repositories** |
| 2 | Add `https://github.com/WOOWTECH/Woow_ha_pi_agent_add_on` and install **Woow HA Pi Agent** |
| 3 | Open **Configuration**, paste **at least one** provider API key, save |
| 4 | **Start**, then open the **Pi Agent** entry from the HA sidebar (admins only) |

That's it — a fresh install answers on the sidebar tile within ~10 s. See [`DOCS.md`](DOCS.md) for per-provider notes.

## Features

### Provider catalog (v0.12.0)

| Provider | API mode | Signature model(s) | Why |
|---|---|---|---|
| **GLM-4.6** (智譜清言) | `openai-completions` + `thinkingFormat: "zai"` | `glm-4.6` | China-side reasoner with thinking blocks, competitive pricing |
| **MiniMax M3** | `openai-completions` + `thinkingFormat: "deepseek"` | `MiniMax-M2` / `abab7-chat-preview` | Ultra-long context (up to 1M), cheap draft tier |
| **OpenAI** | `openai-completions` | `gpt-4o` / `gpt-4o-mini` | Baseline, image input |
| **OpenRouter** | `openai-completions` | `anthropic/claude-sonnet-4` · `openai/gpt-4o` · `deepseek/deepseek-chat` · `meta-llama/llama-3.3-70b-instruct` | One key → many models, cheap fallback |
| **Anthropic direct** | `anthropic` | `claude-opus-4-7` · `claude-sonnet-4-6` · `claude-haiku-4-5` | Native thinking blocks + `cache_control` (OpenRouter route drops both) |
| **DeepSeek direct** | `openai-completions` | `deepseek-chat` · `deepseek-reasoner` (R1) | Cheaper than OpenRouter; R1 exposes native thinking tokens |
| **Groq** | `openai-completions` | `llama-3.3-70b-versatile` · `kimi-k2-instruct` | LPU-hosted (~500 tok/s), "cheap fast draft" tier |

Each provider is enabled only when its key is set. Boot-time self-check probes every configured provider once and logs `HTTP 200 / 401 / 402 / 429 / 000` per line in the addon Logs tab — a bad key surfaces in seconds, not after the first chat.

### Runtime & operations

- **In-process SDK.** `pi-web` imports `@earendil-works/pi-coding-agent` — one Node process, no separate agent daemon.
- **HA Ingress + sidebar auto-enable.** No published ports; sidebar tile shows on first boot via Supervisor API POST (fixed in v0.8.0).
- **s6-overlay supervisor.** `nginx` (front) + `pi-web` (upstream) + `video-tools-init` (oneshot).
- **Idempotent seed.** `models.json` merges added providers on subsequent boots via `jq`; user edits survive restarts.
- **Persistent worktrees.** `HOME=/data/pi-agent/home` so `pi-cwd-*/` folders and installed skills ride addon updates (v0.10.0).
- **Cold backup policy.** `backup_exclude` skips rebuildable caches (`playwright-cache/`, `venv/`, `**/clips/**`, `**/segments/**`) — snapshots stay small; `rclone.conf` stays inside so Drive tokens survive a restore.

## Architecture

### Runtime topology

```mermaid
flowchart LR
    Browser["Browser<br/>(HA admin)"] -->|HTTPS + HA cookie| HA["Home Assistant<br/>Core + Supervisor"]
    HA -->|Ingress proxy<br/>X-Ingress-Path| Nginx["nginx (30142)<br/>sub_filter rewrites"]
    Nginx -->|Host: localhost| PiWeb["pi-web (Next.js 16)<br/>Node 22 · port 30141"]
    PiWeb -->|in-process SDK| Agent["@earendil-works/<br/>pi-coding-agent"]
    Agent -->|BYOK HTTPS| GLM[(GLM-4.6)]
    Agent --> Claude[(Anthropic)]
    Agent --> OAI[(OpenAI)]
    Agent --> OR[(OpenRouter)]
    Agent --> DS[(DeepSeek)]
    Agent --> Groq[(Groq LPU)]
    Agent --> MM[(MiniMax)]
    PiWeb -.persistent state.-> Data["/data/pi-agent/<br/>sessions · models.json ·<br/>home/pi-cwd-* · skills/"]
```

**Why nginx in front of pi-web:** upstream ships absolute-path assets (`/_next/...`, `/api/...`, `/manifest.webmanifest`, `/icons/*`) and Home Assistant Ingress rewrites the URL prefix per install. The nginx layer uses `sub_filter` byte-level rewrites plus an injected `</head>` JS shim that wraps `fetch`, `EventSource`, `XMLHttpRequest`, `history.pushState/replaceState`, `Element.setAttribute`, and property setters (`href`/`src`) — so React writes, RSC prefetches, `next/font` runtime injections, and `router.push('/')` all route through the ingress prefix instead of leaking to HA Core. The `X-Ingress-Path` header is whitelist-validated (`^/api/hassio_ingress/[A-Za-z0-9_-]{16,128}$`) before it reaches any body-rewrite, closing the CVE class where a misconfigured upstream proxy lets the client shape the header (v0.7.0).

### Skill install flow (v0.12.0)

```mermaid
sequenceDiagram
    autonumber
    participant U as HA admin (browser)
    participant W as pi-web Skills modal
    participant S as skills CLI 1.5.21
    participant G as git / ssh
    participant D as /data/pi-agent/skills/
    U->>W: Paste GitHub URL, owner-repo, or local path
    W->>S: spawn npx skills add TARGET
    alt GitHub or owner-repo
        S->>G: git clone via simple-git
        G-->>S: repo tree
        S->>G: fallback ssh -o BatchMode=yes if HTTPS auth fails
    else Local path
        S->>D: cp -R via node-tar
    end
    S->>D: Write SKILL.md and assets under skills/NAME/
    S-->>W: exit 0
    W-->>U: Modal refreshes and skill appears in list
    Note over W,D: Next session system prompt picks up available_skills block
```

**Why `git` + `openssh-client` are in the base image:** the `skills` CLI shells out to `git clone` (via `simple-git`) for every repo-backed install — the Skills modal's Search button, `owner/repo` shorthand, and `skills.sh` entries pointing at a repo all take that path. Missing `git` failed 99% of installs with `spawn git ENOENT` (the exact incident that shipped v0.12.0). `openssh-client` enables the CLI's `ssh -o BatchMode=yes` retry for private repos. `gh` is intentionally omitted (20 MB+, only used for a swallowed `gh auth token` fallback).

### s6-overlay boot sequence

```mermaid
flowchart TD
    Start(["Container start"]) --> S6["s6-overlay init<br/>(oneshots first)"]
    S6 --> Init["video-tools-init<br/>(oneshot)"]
    Init -->|sentinel exists| Skip["exit &lt;100ms"]
    Init -->|first boot| Bootstrap["mkdir /data/pi-agent<br/>python -m venv → pip install<br/>playwright install chromium"]
    Bootstrap --> Sentinel["touch .video-tools-installed"]
    Skip --> Longrun["long-run services"]
    Sentinel --> Longrun
    Longrun --> Nginx["nginx service<br/>(port 30142)"]
    Longrun --> PiWeb["pi-web service<br/>exec 2>&amp;1<br/>self-check per provider<br/>POST ingress_panel=true<br/>exec pi-web"]
    Nginx --> Ready(["watchdog OK<br/>UI live"])
    PiWeb --> Ready
```

Full architecture write-up: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). File-by-file deployment record for the currently-running v0.12.0: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Design brief for the upcoming k3s port: [`docs/K3S_BLUEPRINT.md`](docs/K3S_BLUEPRINT.md).

## Screenshots

Captured live from a working WoowTech HA install (`woowtech-ha.woowtech.io`).

### Home Assistant integration

| ![HA sidebar](docs/screenshots/ha_sidebar.png) | ![HA add-on info](docs/screenshots/ha_addon_info.png) |
|:---:|:---:|
| **Sidebar tile (admins only).** `panel_admin: true` gates the entry; auto-enabled on every boot via the Supervisor API — no toggle hunt on fresh installs. | **Add-on Info tab.** Shows current version, hostname, "Open Web UI" button (Ingress route), and the standard Supervisor controls. |
| ![HA add-on config](docs/screenshots/ha_addon_config.png) | ![HA add-on logs](docs/screenshots/ha_addon_logs.png) |
| **Configuration tab.** Seven optional `password?` fields. Empty fields = provider skipped. At least one key required or the add-on refuses to boot (fatal log line). | **Logs tab.** Per-provider self-check output (`HTTP 200 / 401 / 402 / 429 / 000`) — a bad key surfaces here in seconds, not after the first chat. |

### pi-web workspace

| ![Main UI](docs/screenshots/main_ui.png) | ![Session view](docs/screenshots/pi_web_session.png) |
|:---:|:---:|
| **Main workspace.** New-session composer, model dropdown, and mode selector — all embedded inside the HA iframe with no visible ingress plumbing. | **Session view.** Reasoning transcript, tool-call blocks, and inline diffs render the same as standalone pi-web. |
| ![Skills modal](docs/screenshots/skills_modal.png) | ![Models panel](docs/screenshots/models_panel.png) |
| **Skills modal.** Add from GitHub URL, `owner/repo`, or local path — the v0.12.0 fix (`git`+`openssh-client` in the image) unblocked every repo-backed install path. | **Models panel.** Live edit of `/data/pi-agent/models.json` — add providers, rename models, tune `contextWindow`/`maxTokens` without restarting the addon. |

| ![System prompt with skills](docs/screenshots/system_prompt_skills.png) |
|:---:|
| **System prompt with `<available_skills>` block.** Skill discovery happens at session start — the `description` frontmatter of each `SKILL.md` under `/data/pi-agent/skills/` is injected here so the model knows when to invoke each skill. Write descriptions in the imperative "Use when…" form. |

## Configuration

| Option | Required | Notes |
|---|---|---|
| `api_key` | No† | GLM API key from `open.bigmodel.cn` |
| `minimax_api_key` | No† | MiniMax API key from `api.minimax.io` |
| `openai_api_key` | No† | OpenAI key from `platform.openai.com` |
| `openrouter_api_key` | No† | OpenRouter key from `openrouter.ai` |
| `anthropic_api_key` | No† | Anthropic key from `console.anthropic.com` |
| `deepseek_api_key` | No† | DeepSeek key from `platform.deepseek.com` |
| `groq_api_key` | No† | Groq key from `console.groq.com` |

† **At least one** must be set. The schema declares each as `password?` — HA stores them as secrets and never renders them in plaintext.

### First-run bootstrap

`/data/pi-agent/models.json` is seeded on first boot in provider priority order:

`GLM → Anthropic → OpenAI → OpenRouter → DeepSeek → Groq → MiniMax`

Any additional providers whose keys are set later are merged in on subsequent boots via idempotent `jq` — **user edits win** (rename a model, remove a provider, add custom entries; they all survive). Only clearing `models.json` re-triggers the seed.

Reference configs live in [`examples/models/`](examples/models/):
- [`glm-only.json`](examples/models/glm-only.json) — minimal GLM-4.6 setup with `thinkingFormat: "zai"`
- [`multi-provider.json`](examples/models/multi-provider.json) — full 5-provider layout

## Skills System

Skills are user-scope by default — one folder per skill under `PI_CODING_AGENT_DIR/skills/` (the addon pins this to `/data/pi-agent/skills/` so skills persist across image updates).

```
/data/pi-agent/skills/hello-world/
├── SKILL.md            ← required, frontmatter drives discovery
└── scripts/greet.sh    ← referenced from SKILL.md
```

Three install paths, all reachable from **pi-web → Skills → Add skill**:

1. **GitHub URL** — `https://github.com/owner/repo` (branch/subpath supported)
2. **`owner/repo` shorthand** — expands to the same
3. **Local path** — copies from anywhere inside the addon's writable mounts

A minimal reference skill lives in [`examples/skills/hello-world/`](examples/skills/hello-world/). Drop it into `/data/pi-agent/skills/hello-world/` (or use the pi-web Add-skill flow with the local-path option) and it appears in every new session's `<available_skills>` block.

Write your skill's `description` in the imperative "Use when…" form — that's the exact string pi's model sees.

## Related Packages

The runtime is composed from the following packages (all bundled in the image):

| Package | Version | Role |
|---|---|---|
| [`@agegr/pi-web`](https://www.npmjs.com/package/@agegr/pi-web) | `0.8.4` (pinned) | Next.js 16 browser workspace — served behind nginx on port 30141 |
| [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) | transitive | The pi SDK — imported in-process by pi-web, no separate daemon |
| [`skills`](https://www.npmjs.com/package/skills) | `1.5.21` | CLI for the Add-skill flow; shells out to `git` / `ssh` / `gh` |
| `simple-git` | via `skills` | Wraps `git clone` for repo-backed installs |
| `node-tar` | via `skills` | Extraction for tarball-backed installs |
| Node.js | `22.x` (nodesource) | Runtime — pi-web requires ≥22.19.0 |
| nginx | Debian bookworm | Ingress front; sub_filter rewrites; whitelist-validates `X-Ingress-Path` |
| ffmpeg + ffprobe | Debian bookworm | Video pipeline (v0.11.0) — segments, xfade, subtitle burn |
| Chromium runtime `.so` set | Debian bookworm | Playwright browser (binary itself lands in `/data/pi-agent/playwright-cache/`) |
| edge-tts / pyyaml / mutagen | Python venv | TTS + timeline generation for `pitch_video` |
| rclone | Current .deb from `downloads.rclone.org` | Google Drive upload step |
| s6-overlay | via `hassio-addons/debian-base:9.1.0` | Service supervisor |

**Pinning rationale.** `@agegr/pi-web` is pinned (not `@latest`) because the upstream ships 40+ hardcoded `/api/*` routes and absolute-path assets that the nginx shim depends on. An upstream refactor of `_next` chunk names, RSC prefetch shape, or a new `/api/*` route can silently regress the shim without any local code change. Bump manually only after end-to-end validating a new release.

### Container image

Multi-arch images built by [`.github/workflows/build.yml`](.github/workflows/build.yml) and published to GHCR:

- `ghcr.io/woowtech/woow-ha-pi-agent-amd64:<version>`
- `ghcr.io/woowtech/woow-ha-pi-agent-aarch64:<version>`

Base: `ghcr.io/hassio-addons/debian-base:9.1.0`.

## Security

| Layer | Guarantee | Trust boundary |
|---|---|---|
| HA Ingress | Only HA-authenticated users can reach `/api/hassio_ingress/<token>/*` | HA session cookie |
| Sidebar tile | Admins only (`panel_admin: true`) | HA admin role |
| `X-Ingress-Path` | Whitelist-validated (`^/api/hassio_ingress/[A-Za-z0-9_-]{16,128}$`) before body-rewrite | Defense-in-depth vs. misconfigured upstream proxy |
| API keys | Stored in `/data/options.json` (Supervisor-managed); declared as `password?`; passed to pi as `$*_API_KEY` env vars | HA host filesystem |
| pi-web app auth | **None.** Access control is delegated to HA. | Anyone with HA admin login = full pi-web access |
| `rclone.conf` | Inside HA snapshots (unlike caches) so Drive tokens survive restore | HA backup encryption |

If you need per-user pi-web auth beyond HA login, put an auth-proxy in front of HA itself — do not try to add auth inside pi-web (the ingress layer strips headers before pi-web sees them).

## Testing

- **Boot self-check** — every configured provider probed with `max_tokens=1` at start; results logged per line.
- **HA Supervisor watchdog** — `http://[HOST]:[PORT:30142]/api/home` polled on interval; auto-restart on hang.
- **End-to-end verification cadence.** Every version tag goes through: (a) fresh install → sidebar tile visible → first chat succeeds; (b) Skills → Add skill from GitHub URL → skill appears in `<available_skills>`; (c) `pitch_video` dry-run through `python video/verify.py`. See [`tests/`](tests/) for the recorded fixtures.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Add-on won't start, log says "No provider key configured" | Open Configuration, paste at least one key, save, start |
| UI loads but every chat returns `401 身份验证失败` | API key wrong. Check Logs tab for the per-provider self-check line to identify which provider — rotate the offending key |
| Chat returns `402` / `429` | Auth OK but out of credits / rate-limited. Refill or switch model from the Models dropdown |
| "Open Web UI" button 404s | `ha core restart`; ingress token occasionally needs Supervisor re-registration |
| Blank iframe, `/_next/...` 404s in network tab | nginx sub_filter or shim regression. Grep `ha addons logs b9cf5676_woow_ha_pi_agent` for nginx errors; check that `X-Ingress-Path` is present on the request |
| Sidebar tile missing on fresh install | Toggle "Show in sidebar" manually on the Info tab (Supervisor POST occasionally races on slow hosts) |
| Skills → Add fails with `spawn git ENOENT` | Pre-v0.12.0 image. Update to ≥0.12.0 — `git` + `openssh-client` are now baked in |
| Worktree disappeared after addon update | Should not happen since v0.10.0. If you upgraded from ≤v0.9.1, pre-existing worktrees were on ephemeral rootfs — recreate under `HOME=/data/pi-agent/home` |
| Video pipeline fails mid-run | `rm /data/pi-agent/.video-tools-installed`, then restart the addon — `video-tools-init` re-downloads the venv + Chromium |

Full recipe in [`DOCS.md`](DOCS.md#troubleshooting).

## Development

### Layout

```
Woow_ha_pi_agent_add_on/
├── config.yaml              Add-on manifest — arch, ingress, watchdog, schema
├── build.yaml               Multi-arch build args
├── Dockerfile               Debian base → Node 22 → ffmpeg/rclone → pi-web pin
├── DOCS.md                  User-facing docs shown in HA add-on info tab
├── CHANGELOG.md             Every release, with rationale (0.1.0 → 0.12.0)
├── README.md                This file
├── README_zh-TW.md          Traditional Chinese mirror
├── repository.yaml          HA add-on repository manifest
├── rootfs/                  s6-overlay service tree + nginx conf + init scripts
│   ├── etc/s6-overlay/
│   │   ├── s6-rc.d/pi-web/run
│   │   ├── s6-rc.d/nginx/run
│   │   └── scripts/video-tools-init
│   └── etc/nginx/           nginx.conf + sub_filter rules + injected shim
├── examples/
│   ├── ha/panel_iframe.yaml       Sidebar pin as YAML config
│   ├── models/glm-only.json       Minimal single-provider models.json
│   ├── models/multi-provider.json Full 5-provider models.json
│   └── skills/hello-world/        Reference skill template
├── docs/
│   ├── ARCHITECTURE.md      Deep dive — process model, ingress shim, backup
│   └── screenshots/         PNGs used in README + docs
├── tests/                   Boot / self-check / ingress smoke tests
└── .github/workflows/build.yml    Multi-arch GHCR publish
```

### Local build

```bash
docker buildx build \
  --build-arg BUILD_FROM=ghcr.io/hassio-addons/debian-base-amd64:9.1.0 \
  --build-arg BUILD_ARCH=amd64 \
  --build-arg BUILD_VERSION=0.12.0-dev \
  -t local/woow-ha-pi-agent-amd64:0.12.0-dev .
```

### Bump pi-web

Edit `Dockerfile`:

```dockerfile
ARG PI_WEB_VERSION=0.8.4   # ← bump here
```

Then run the full end-to-end suite before tagging a release — the shim depends on upstream's exact asset shape.

## Support

- **Issues / feature requests** — [github.com/WOOWTECH/Woow_ha_pi_agent_add_on/issues](https://github.com/WOOWTECH/Woow_ha_pi_agent_add_on/issues)
- **Upstream pi-web** — [github.com/agegr/pi-web](https://github.com/agegr/pi-web)
- **Upstream pi coding agent** — [github.com/earendil-works/pi](https://github.com/earendil-works/pi)
- **Skills CLI** — [github.com/anthropics/skills](https://github.com/anthropics/skills) (upstream `skills` npm package)

## License

MIT © [WOOWTECH](https://github.com/WOOWTECH). See [`LICENSE`](LICENSE) for the full text.

Bundled upstream packages retain their own licenses (`@agegr/pi-web` MIT, `@earendil-works/pi-coding-agent` MIT, `skills` MIT, ffmpeg LGPL/GPL depending on build, Chromium BSD, rclone MIT).

---

<p align="center">
  <sub>Built by <a href="https://github.com/WOOWTECH">WOOWTECH</a> · Powered by <a href="https://github.com/earendil-works/pi">pi</a> · Delivered via <a href="https://www.home-assistant.io/">Home Assistant</a></sub>
</p>
