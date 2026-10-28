# GLI-207 Autofill Field Test Matrix

| Acceptance area | Coverage | Evidence |
| --- | --- | --- |
| Shared field primitive | Email and password render through `BaseAuthField`; no `InputItem` suffix remains in the auth renderer | `AuthControls.test.tsx`, UI contract-boundary test |
| Surface ownership | Shell owns paint/chrome; input and reveal remain transparent; reveal is 54x48 and keeps `aria-expanded` | `AuthControls.test.tsx`, `AuthScreen.test.tsx` |
| Focus and interaction | Keyboard, mouse, touch, password toggle, pressed state, and reveal keyboard focus share one shell ring | `auth-password-radius.spec.ts` at 320/375/390/430 |
| Equivalent autofill | Screenshot baselines assert full password-shell pixels after deterministic browser autofill-equivalent paint; production `:-webkit-autofill` selector is present | `auth-autofill-visual.spec.ts` at 320/375/390/430 |
| Existing auth contract | Validation, single flight, account-unverified routing, navigation, and accessibility remain unchanged | 203 Jest tests and 28 Playwright auth tests |

The Chromium credential manager cannot be deterministically populated through Playwright; `.fill()` is deliberately not used as autofill evidence. The equivalent harness applies the same inset fill and text paint contract as the production WebKit autofill rule and compares full-field screenshots.
