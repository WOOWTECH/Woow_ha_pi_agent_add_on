# Agent Connect release candidate — 2026-11-21

This is coordinated source preparation, not a published release or deployment.
The candidate archives are unpublished `npm pack` results, vendored in
`candidate-packages/` for reviewable builds without inventing release URLs.
Native pins use local `file://` inputs; HA uses verified `COPY` inputs. Their
SHA-256 values identify the actual bytes. Publishing or repacking later requires
coordinated consumer updates and the normal release gates.

| Input | Candidate version | SHA-256 |
| --- | --- | --- |
| `@woowtech/pi-agent-shared-runtime` | 0.1.5 | `eb6e2056c5523307331f40e1c3a61d552315ef743abfda42a44f7228d6f86a96` |
| `@woowtech/pi-paseo` (Agent Connect) | 0.1.17 | `ef08edfa18cd3f71d8e50cc22329ee7c143632e04338f16c7188ae848f5c8170` |

HA retains official Pi Web 0.12.0 with its independent Ingress bridge. Its
existing Omnigent plugin 0.3.31 pin is unchanged because it does not consume
the 0.10 combined adapter. The Agent Connect GUI supports older user-selected
Paseo plugins by disabling the new selector while retaining Paseo pairing.

Agent Connect preserves package IDs and paths. Existing installations default
to Paseo; users may choose Woowtech Smart or Apporo Smart. A running daemon
continues until the user stops and starts it to apply a target change. Pairing
is blocked while that change is pending.

Before publication, run each platform's existing acceptance and upgrade gates
using the exact candidate image or installer. Local Linux tests and browser
fixtures do not substitute for macOS/Windows host acceptance, a multiarch
container build, HA Supervisor upgrade tests or actual branded relay pairing.

## Shared resources in this candidate

The distribution installs the same shared-runtime archive as k3s and calls its
`src/distribution.mjs` at startup and provider refresh. Fresh eligible settings
receive the bundle once. Explicit disablement, removal and external package
choices survive subsequent starts. Migration retires only unchanged MCP entries
recorded by the former helper; modified/unowned entries and existing skills stay.
Original changed provider configs receive private backups before migration.

Common memory lives under `<canonical-data>/shared-runtime/memory`; Claude,
Codex and Pi retain separate native histories. Switching Agent Connect brands
does not change this host-local root. Drain old shared-runtime/MCP processes
before upgrading from the former directory-lock implementation to SQLite locks,
then restart sessions to load new resource configuration. No native transcripts
are imported automatically.

Validation is source-only: the exact archive was installed with production
npm options into a scratch native install; actual shipped helper tests pass for
fresh, disabled and removed choices. HA legacy sync and wrapper regressions
still pass. The shared package's distribution suite covers legacy MCP ownership,
user skills and common memory paths. Real macOS, Ubuntu, Windows/WSL2 and HA
Supervisor/provider acceptance remain pending; k3s/PaaS acceptance is separate.

Final source verification (2026-11-21): Agent Connect bridge/UI20/20; shipped
shared helper3/3 against the final archive; legacy state migration, provider
wrappers and image-layer contract scripts pass. Node syntax, workflow YAML and
diff whitespace checks pass. The refreshed archive passes local helper tests against HA's exact SDK1.1;
image gates also exercise that SDK before release. No add-on version
was changed and no Supervisor image/upgrade was deployed in this source work.

## Candidate refresh after live acceptance

The shared runtime now excludes its own generated skill aliases before the SDK
selects authoritative package sources. Repeated synchronization keeps enabled
skills present, while removal, disablement and project overrides remain effective.
The frozen archive passes nine resource authority/boundary regressions against
both the native SDK 1.0 graph and HA's exact SDK 1.1 graph. Native helper and
alternate-agent-directory tests pass 16/16; the HA helper passes 3/3. These tests
are also required by each distribution's CI.

Agent Connect now uses persistent SQLite guards on macOS; Linux retains flock.
Actual Apple Silicon (Node 22.23.4) and Intel (Node 22.19.0) CI passed OS-lock,
state and onboarding tests, plus real daemon start, stop, restart and identity
retention. The macOS lifecycle uses no provider credentials or model turns.
[Mac verification run](https://github.com/WOOWTECH/pi-paseo-plugin/actions/runs/44867850835)
does not substitute for signed-installer or interactive provider acceptance.
Darwin stale daemon recovery remains conservative; this patch does not claim
Linux PID-birth recovery on macOS. Windows uses the supported WSL2 Linux path.
