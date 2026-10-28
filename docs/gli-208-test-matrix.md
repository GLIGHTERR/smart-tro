## GLI-208 Test Matrix

| Scope | Input / state | Expected evidence | Coverage |
| --- | --- | --- | --- |
| Product routing | Android product workflow has `EXPO_PUBLIC_HOME_REVIEW=false` and `EXPO_PUBLIC_ACCOUNT_REVIEW=false` | A clean launch reaches `Auth` and exposes `Đăng ký` | `android-product-workflow.test.mjs`, `product_smoke.py` |
| Authenticated fixture regression | Home and Account review flags remain enabled only in their dedicated screen tests | Fixture data remains available without changing unauthenticated root routing | `HomeScreen.test.tsx`, `AccountScreen.test.tsx`, `accountModel.test.ts` |
| Invalid state | A clean-entry hierarchy includes `Đăng ký` plus authenticated review text | Product smoke writes `FAIL` and rejects the artifact | `test_product_smoke.py` |
| Product boundary | Product workflow is pilot-disabled or its immutable provenance is missing | The workflow or smoke harness rejects the artifact | `android-product-workflow.test.mjs`, `test_product_smoke.py` |

The exact Android artifact is rebuilt by `android-product.yml` after the merge. Its emulator job verifies the normal launcher entry; end-to-end OTP delivery remains UAT scope against the approved provider environment.
