# GLI-166 test matrix

| AC | Coverage | Evidence |
| --- | --- | --- |
| 1 | Public UI barrel excludes pilot exports; product imports only UI contracts; vendor search is confined to `src/ui`. | Static search and typecheck |
| 2 | Account load/retry/session and Edit Profile validation, save serialization, retry and session recovery retain the existing gateway behavior. | `AccountScreen` and `EditPersonalInformationScreen` tests |
| 3 | Toast consumes one event id once, has a polite live region, and expires at 5000 ms; errors remain inline alerts. | `SuccessToastAdapter` and Edit Profile tests |
| 4 | Dialog uses modal a11y semantics; controls expose button labels and disabled state; profile fields retain keyboard-safe layout. | Component tests and web build |
| 5 | Existing Vietnamese copy, payload allowlist and navigation assertions run unchanged. | Profile screen regression tests |
