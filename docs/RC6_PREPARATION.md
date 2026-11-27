# RC6 preparation — 2026-11-27

This worktree carries the reviewed C6 sessions HTTP acceptance helper and stages
the canonical Agent Connect archive for RC6. The archive SHA-256 is
`224c819fc14876c86f5febe0996a26e73ce618682faf611bac1b340b08b71335`;
its source base is `867d9065f609aa5e32d88f2d55cf07c5d3fadc3e`, build commit is
`ba9f1c408a61193efc47c2914c6edd67c6f681b7`, runtime is
`0.17.5-r4-8664f2c3f8f5`, and adapter patch SHA-256 is
`22d3a604d0c3ddc9305afe07f9f68524bec906fddb16636c08ac2783b4442a6c`.

The archive is stored under `candidate-packages/pending/` and is deliberately
not selected by `cli-runtime/versions.json` or the image. Dirac's exact
Omnigent RC6 archive and combined-patch digest are not available yet. Keep the
existing RC5 pair active until those exact values arrive; do not build an image
from a mixed RC5/RC6 pair. The RC5 receipts and archives remain unchanged.

The C6 helper sends a raw gzip request with bounded wire/decompressed sizes,
checks a single gzip layer, and independently validates the normal
`fetch().json()` client path against the image's owned loopback Pi Web server.
Its local runtime receipt is
[`logs/sessions-http-json-live-piweb-receipt.json`](../logs/sessions-http-json-live-piweb-receipt.json):
that run used Pi Web 0.12.0, launched with `node bin/pi-web.js`, and the
installed Next package was 16.3.8 (lockfile tarball integrity and installed
package metadata SHA are recorded there). It proves the helper exercised a
real Pi Web/Next server, but does not exercise Next 16.4.6.

Separately, the canonical Agent Connect RC6 build evidence records a production
HTTP check on Next.js 16.4.6: one gzip layer, valid JSON from both `fetch()`
and identity encoding. Its preserved output is in the canonical source
archive's `artifacts/production-http-green.log` and
`artifacts/verify-host-green-2.log`. No HA/k3s image has been built in this
worktree.
