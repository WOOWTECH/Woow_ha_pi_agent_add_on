# AGENTS.md

Rules for every agent and person who changes this repository. The full
release mechanism is described in the Woow_HA_App_Store README (section
"版本策略與同步") and in ADR-0005 of the WOOW addon pipeline.

1. **`main` only changes through a pull request.** A ruleset blocks direct
   pushes, force pushes and deleting the branch, and nobody can bypass it.
   Push a branch, open a PR, wait for the required checks, then merge.
2. **A PR that changes an addon version is a release.** Merging it publishes
   that version to the WOOW App Store. It must pass every required check; the
   checks are the approval, there is no human review step. One of them is
   `Upgrade comparison / compare` (pipeline #89): it compares each addon whose
   version the PR changes with the latest formal Release. A PR that changes
   no version passes it in seconds. The result is in the job summary.
3. **Breaking changes must be declared in `upgrade-notes.yaml`** next to the
   addon's `config.yaml` (here the repository root), with the
   migration path. Create the file only when something needs declaring. The
   upgrade comparison blocks any breaking change without a matching entry:
   `option-removed`, `schema-removed`, `schema-retyped`, `made-required`,
   `range-narrowed`, `enum-value-removed`, `required-added`, `arch-removed`,
   `port-removed`, `image-changed`. Changed defaults and host ports are only
   reported. It also blocks a new fixable Critical or High vulnerability in
   the amd64 image unless it is accepted with a reason. Format:

   ```yaml
   "1.3.0":                       # the new version, quoted
     breaking:
       - change: option-removed   # change and key exactly as the report shows
         key: ssl_port            # schema path, e.g. database.port; the arch,
                                  # the port (8069/tcp) or `image`
         migration: Use the 443/tcp port mapping instead.
     accepted_vulnerabilities:
       - id: CVE-2026-1234        # id and package exactly as the report shows
         package: openssl
         reason: Upstream base image not updated yet; replaced in 1.3.1.
   ```

   Only sections newer than the latest formal Release and up to the new
   version count. `migration` and `reason` must not be empty. The report
   prints a ready-to-paste entry for each finding. The release puts these
   entries on the GitHub Release under 破壞性變更與遷移方式 and 已接受的漏洞.
   Full rules: the Woow_HA_App_Store README, section
   "升版比對與 `upgrade-notes.yaml`".
