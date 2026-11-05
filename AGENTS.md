# AGENTS.md

Rules for every agent and person who changes this repository. The full
release mechanism is described in the Woow_HA_App_Store README (section
"版本策略與同步") and in ADR-0005 of the WOOW addon pipeline.

1. **`main` only changes through a pull request.** A ruleset blocks direct
   pushes, force pushes and deleting the branch, and nobody can bypass it.
   Push a branch, open a PR, wait for the required checks, then merge.
2. **A PR that changes an addon version is a release.** Merging it publishes
   that version to the WOOW App Store. It must pass every required check; the
   checks are the approval, there is no human review step. Every PR runs
   `Upgrade comparison / compare` (pipeline #89); treat a failure as blocking.
   It compares each addon whose version the PR changes with the latest Stable
   Release. It also runs the upgrade test (pipeline #143): the Release's image,
   then this PR's amd64 image on the same data directories, under a mock
   Supervisor; the new version must start (here: the watchdog `/api/home` on
   port 30142 answers and the container stays up). The Store registry currently
   skips this upgrade test (pipeline #158); it runs once #158 removes the skip.
   Do not write `skip_upgrade_test` in `upgrade-check/settings.yaml`: only the
   registry approves a skip. When it runs, it checks startup only, not data. To
   check data, add hooks in `upgrade-check/`: `seed` writes data on the
   Release, `verify` checks it on this PR's image. Their interface
   (environment, JSON report) is in the Woow_HA_App_Store README,
   "第 2 類 升級測試", paragraph "資料檢查（#138）". Keep the hooks executable
   (`git update-index --chmod=+x`), with LF endings and a `#!` of python3 or
   busybox sh only (no bash): they run in the Store's python:3.12-alpine mock
   Supervisor container, so never `docker run` from them. A hook must not
   leave background processes running when it exits, and a hook file must not
   be a symlink to anything outside `upgrade-check/` (only that directory is
   mounted). An optional `upgrade-check/settings.yaml` sets `startup_timeout`,
   `stable_seconds` and `hook_timeout` (positive integer seconds);
   `hook_timeout` defaults to 600 and covers the whole `docker exec` of a
   hook. A PR that changes no version passes it in seconds. The result is in
   the job summary. To re-run it, use "Re-run all jobs", not "Re-run failed
   jobs": a re-run judges its own build, and an earlier attempt's SBOM and
   image are not used.
3. **Breaking changes must be declared in `upgrade-notes.yaml`** next to the
   addon's `config.yaml` (here the repository root). Create the file only when
   the upgrade comparison asks for it; copy `change` and `key` from its report
   and write the migration path. It also blocks a new fixable Critical or High
   vulnerability unless it is accepted with a reason. The release puts these
   entries on the GitHub Release. Rules, change names and the file format: the
   Woow_HA_App_Store README, section "升版比對與 `upgrade-notes.yaml`".
