# GLI-169 Sign-in UI Test Matrix

| Acceptance area | Regression coverage | Evidence |
| --- | --- | --- |
| Email/password sign-in | Email normalization, gateway session creation, `me` verification, provider sign-in, validation and gateway error feedback | `AuthScreen.test.tsx` |
| Double submit | Two synchronous login presses yield one gateway call and an accessible disabled/loading control | `AuthScreen.test.tsx` |
| Unverified account | `ACCOUNT_UNVERIFIED` requests OTP and reaches the existing OTP step with the normalized email and error notice | `AuthScreen.test.tsx` |
| Password/a11y/color parity | Reveal state and 48px control; locked input, action, disabled, focus and link colors; native keyboard/password props | `AuthScreen.test.tsx`, `AuthControls.test.tsx` |
| Links/social regression | Existing feature-gated social controls and registration transition remain covered; recovery keeps its production visibility guard | `AuthScreen.test.tsx` |
| Vendor boundary | `AuthScreen` imports only `@/ui`; Ant components remain in `src/ui/AuthControls.tsx` | `scripts/__tests__/assert-ui-contract-boundary.test.mjs` |

Android and Web product-path validation remain required after the PR has an immutable head SHA. Rollback is a single revert of the GLI-169 PR.
