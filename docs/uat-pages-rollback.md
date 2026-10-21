# Pages UAT preview rollback

Baseline before this workflow change:

- Root source: `755208b966c3ead2cf3a1999fb88be344e448e13` (`master`)
- Prior deployment: https://github.com/GLIGHTERR/smart-tro/actions/runs/39428573874
- Locally reproduced root payload digest: `878b266ff0b1441c792faf7f5c34194cbcc08b3bb26e00a28e6f03ac6e03ad07`

Use rollback immediately for root/site regression, failed provenance guard, broken
asset path or partial publish, a PO stop request, or after a PO UAT PASS event.
Do not rollback automatically after a successful pilot unless PO has confirmed
PASS.

Before publishing a preview, create a revert PR for the forward workflow commit.
The revert restores the former workflow after the Pages artifact has been
cleaned. Keep it unmerged unless rollback is required.

To publish a clean root-only rollback artifact, resolve the current `master`
commit and run this one command (replace `ROOT_SHA` with that exact 40-character
commit):

```bash
gh workflow run deploy-preview.yml --ref master \
  -f deployment_mode=rollback -f root_sha=ROOT_SHA
```

The workflow refuses a non-current `master` SHA, omits `qa-pilot`, and writes
`preview-provenance.json` with `"pilot": null`. After its deployment succeeds,
smoke `https://glighterr.github.io/smart-tro/` and fetch
`/smart-tro/preview-provenance.json`; then merge the prepared revert PR only
when the rollback is approved.
