## GLI-223 Android artifact workflow contract

Android/EAS artifact workflows are request-driven and manual-only. A pull request, a branch push, and a merge to `master` must not launch an Android build, emulator, or EAS artifact.

| Workflow | Manual request | Immutable provenance | Rejected input / automatic event |
| --- | --- | --- | --- |
| `.eas/workflows/android-preview.yml` | Check out and locally verify the exact SHA, then run `eas workflow:run .eas/workflows/android-preview.yml -F commit_sha=<40-character-commit-sha>` | EAS records the `commit_sha` input with the manual request; the command contract requires the local `HEAD` to match | No `push` or `pull_request` trigger; a malformed or mismatched request must be corrected before dispatch |
| `.github/workflows/android-product.yml` | `workflow_dispatch` with `commit_sha` | The workflow accepts lowercase 40-character SHA only, checks out that SHA, verifies `HEAD`, and uses it in artifact names/provenance | Validation stops malformed or non-immutable values before Android jobs |
| `.github/workflows/android-pilot.yml` | `workflow_dispatch` with `commit_sha` | The workflow accepts lowercase 40-character SHA only, checks out that SHA, and uses it in artifact names/provenance | Validation stops malformed or non-immutable values before Android jobs |

`test.yml` and `deploy-preview.yml` retain their automatic triggers. Validate this policy with the static workflow-contract tests and YAML parsing only; do not request an Android/EAS build while validating the contract.

Rollback is a normal Git revert of the commit that changes these three workflow files and the corresponding workflow-contract tests/documentation. The revert itself does not launch an Android/EAS artifact because the workflows remain manual-only until an explicit dispatch is made.
