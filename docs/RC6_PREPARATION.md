# RC6 companion candidate — 2026-11-27

The HA candidate is `0.15.28-rc.6`, pairing Agent Connect `0.1.27-rc.6`
with Omnigent `0.3.42-rc.6`. Paseo remains
`0.17.5-r4-8664f2c3f8f5` with the peer-matched a7 payload.

| Package | Source | Archive SHA-256 |
| --- | --- | --- |
| Agent Connect 0.1.27-rc.6 | `ba9f1c408a61193efc47c2914c6edd67c6f681b7` (source and archive build commit) | `224c819fc14876c86f5febe0996a26e73ce618682faf611bac1b340b08b71335` |
| Omnigent 0.3.42-rc.6 | `d4640bac3fd48b338c1f81230cb3d31fb75f79b2` | `91321ee0af4a8500317b726113e0c24332026f26142c4400b283cd55883f12e0` |

Agent Connect adapter SHA-256 is
`22d3a604d0c3ddc9305afe07f9f68524bec906fddb16636c08ac2783b4442a6c`.
Omnigent's combined adapter SHA-256 is
`8d55d6824307023eed5ead7fa89080650d3981fae1746378db9a400fab8a9632`;
its archive metadata binds Paseo `0.1.27-rc.6` and removes the stale
`JSON3` dependency without changing its effective dependency set.

The C6 sessions acceptance helper is part of the candidate image smoke. It
checks a bounded raw gzip response and the ordinary `fetch().json()` path,
using only the image's loopback Pi Web process and owned synthetic sessions.
Its real local runtime receipt is
[`logs/sessions-http-json-live-piweb-receipt.json`](../logs/sessions-http-json-live-piweb-receipt.json):
Pi Web 0.12.0 launched via `node bin/pi-web.js`, installed Next 16.3.8,
with npm lock integrity and installed package hashes. This helper run is not
a Next 16.4.6 image test. Agent Connect's canonical RC6 production HTTP evidence
records Next.js 16.4.6 and valid gzip/JSON behavior in its build artifacts.

No HA image was built locally. Fresh HA RC6 image CI, Store comparison and
mock-Supervisor upgrade/startup checks remain release gates; this is not a
stable-release claim.
