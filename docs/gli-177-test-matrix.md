# GLI-177 Test Matrix

| Acceptance criterion | Regression coverage | Fixture / input |
| --- | --- | --- |
| Production public adapters render through Ant Design RN | `contracts.test.tsx`, `assert-ui-contract-boundary.test.mjs` | Public Button, Field, Dialog, ScreenState, Provider, and Toast imports |
| SmartTro color and state mapping remains locked | `contracts.test.tsx` | Primary, pressed, disabled, danger, warning, success, field-error theme tokens |
| Account/Edit Profile behavior remains unchanged | Account and Edit Profile component suites | Existing review fixture and profile gateway doubles |
| One polite, deduplicated five-second toast remains owned by RootNavigator | `SuccessToastAdapter.test.tsx` | Consecutive profile-save event IDs |
| No pilot API becomes public; product bundles may include the required vendor | `assert-ui-contract-boundary.test.mjs`, `assert-product-bundle.test.mjs` | Public barrel and representative bundle assets |
