# Paseo managed web client in Home Assistant

This change retains the official Pi Web 0.12.0 npm build and its SDK 1.1
compatibility pins. It does **not** install the plugins' Pi Web 0.10 overlay.
The native desktop tabs and mobile picker are MCP → Omnigent → Paseo.

## Immutable image inputs

- Paseo plugin 0.1.9, source `eed990fe06899e42bf446cf2d584ed2c26ae6bed` (public release archive verified with
  SHA256 `31efd9184ec93aa6c6b4da85f235ac7570dc6f64e39195c21d6c23f8ce93fbdb`).
- Paseo daemon 0.11.2, locked runtime revision `0.11.2-r2-6d8dbe515479`.
- Fixed web client 0.13.0-woow.1, source
  `68388f19198f1f696efe18906df42049e208d135`, stream repair
  `043aa8286b90418eb1f4e9982ca1a349c84f2a3d`, archive SHA256
  `7e7495f70f721e96e121f76bd91573150cf91aa112143d9f4d51a3fcf9dc8bce`.
- Omnigent is retained from the latest main; coordinate its 0.3.16 recovery
  release and the next available HA version before merging this draft.

The image builds daemon dependencies for amd64 and aarch64 and downloads the
web client at build time, checking the plugin's manifest and checksum. First
boot copies the web client to `/data/pi-agent/pi-paseo/web-client/`; it does
not require an npm install or web-client download. Existing user runtime paths
are preferred; otherwise the bundled runtime in `/opt/woow/paseo-runtime` is
used. Provider login, live relay access and conversations still require network.

## Ingress and authentication

`/paseo/setup`, `/api/paseo` and `/paseo-web/*` use a separate Unix socket behind
the existing nginx listener. The HA Supervisor-only source-IP restrictions
remain unchanged. No new public port is opened. Settings API reads and writes
require an in-memory token, same-origin checks and bounded JSON requests.
Passwords and pairing data are not included in status responses.

The client artifact has basePath `/paseo-web`. The server rewrites that base
in the actual HTML, CSS, JSON and JS responses to the validated
`/api/hassio_ingress/<token>/paseo-web` prefix. This covers Expo router base,
absolute assets and dynamic imports. Deep links use the client's index fallback.
The upstream response is deliberately uncompressed while rewriting; stale gzip
headers, lengths and ETags are not forwarded. Responses are private/no-store and
vary on X-Ingress-Path to avoid sharing one HA session's prefix with another.
The settings page retains a strict CSP; the Expo client retains its upstream
headers (including same-origin framing) without inheriting the settings CSP
that would block its runtime. HA can compress the final response downstream.

Pairing is an explicit POST operation. Its private fragment remains in the
browser URL and is not sent to nginx. The persistent private pairing record is
owned by the plugin; browser logs/screenshots from real accounts must not be
published. The Ingress URL is session-specific: reopen from HA after it expires.

## Upgrade and lifecycle

No options, ports, architectures, image name or existing data formats change.
Credentials, settings and sessions are preserved. First install registers the
bundled plugin once and creates one persisted SDK onboarding conversation without requiring a model account or spending tokens. The plugin supervisor performs initialization independently.
A marker prevents reinstallation after removal; pre-existing package overrides
and explicit disabling are retained. Package enable/disable/removal is observed
without restarting Pi Web. A manual service pause survives container restart;
shutdown stops the owned supervisor without persisting a user pause.

New users still need to authorize the provider CLIs through their official
login flows. This integration does not migrate or create provider credentials.
The bundled Claude Code/Codex versions, shared skills/MCP and Omnigent bridge
are retained. Existing custom plugin paths remain user-controlled and may need
upgrading to support the managed web API.

## Validation and release scope

`tests/omnigent-native-browser.mjs` runs the real compiled Pi Web 0.12 and the
checksum-verified Paseo client through the repository's actual nginx config.
Only listener/socket/log paths are adapted for local isolation; a small front
proxy simulates Supervisor path stripping. No browser JS override is used.
It covers desktop/tablet/390px mobile, settings order, private API/pair link,
mobile scrolling, actual `/paseo-web/settings` reload, absolute assets, gzip
request handling, CSP and absence of pairing fragments in access logs.
Provider responses are fixtures: this is not live HA or paid three-engine chat
acceptance. The Docker build runs real CLI/SDK/static-client smoke tests with
network disabled. PR builds exercise generated local-source contexts on both
architectures and never push images. Parent integration owns the release
version, merge, Store/local-build synchronization and live acceptance.
