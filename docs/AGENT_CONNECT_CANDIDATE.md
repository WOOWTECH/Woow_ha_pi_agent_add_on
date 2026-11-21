# Agent Connect release candidate — 2026-11-21

This is coordinated source preparation, not a published release or deployment.
The candidate archives are unpublished `npm pack` results, vendored in
`candidate-packages/` for reviewable builds without inventing release URLs.
Native pins use local `file://` inputs; HA uses verified `COPY` inputs. Their
SHA-256 values identify the actual bytes. Publishing or repacking later requires
coordinated consumer updates and the normal release gates.

| Input | Candidate version | SHA-256 |
| --- | --- | --- |
| `@woowtech/pi-agent-shared-runtime` | 0.1.5 | `68ba472e3292341911e2041e3e4c19f46ea38aaca13b96728ac874cbb6e97240` |
| `@woowtech/pi-paseo` (Agent Connect) | 0.1.17 | `1d4f0e9dc08ee73f9935dbff054f2854f77c2b80aedc7f81c3cc527481885fd8` |

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
diff whitespace checks pass. Local helper execution used Pi SDK1.0; added CI and
image gates deliberately exercise HA's SDK1.1 before release. No add-on version
was changed and no Supervisor image/upgrade was deployed in this source work.
