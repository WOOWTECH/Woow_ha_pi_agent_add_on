# AGENTS.md

Rules for every agent and person who changes this repository. The full
release mechanism is described in the Woow_HA_App_Store README (section
"版本策略與同步") and in ADR-0005 of the WOOW addon pipeline.

1. **`main` only changes through a pull request.** A ruleset blocks direct
   pushes, force pushes and deleting the branch, and nobody can bypass it.
   Push a branch, open a PR, wait for the required checks, then merge.
2. **A PR that changes an addon version is a release.** Merging it publishes
   that version to the WOOW App Store. It must pass every required check; the
   checks are the approval, there is no human review step. A version-bump
   upgrade comparison against the latest stable Release will become one of
   these required checks (pipeline #89).
3. **Breaking changes must be declared in `upgrade-notes.yaml`** with the
   migration path: removed or retyped options, a changed port, arch or image
   name, or data an upgrade cannot carry over. The upgrade comparison blocks
   an undeclared breaking change once pipeline #89 is in place and defines
   the file format; until then, describe the change and its migration in the
   PR and the CHANGELOG.
