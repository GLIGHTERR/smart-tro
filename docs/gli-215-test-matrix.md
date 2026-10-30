## GLI-215 Focus Ring Regression Matrix

| Scenario | Expected result | Evidence |
| --- | --- | --- |
| Sign-in password, keyboard/pointer/touch focus | One 2px outer ring retains the 24px pill geometry; no input chrome | `tests/web/auth-password-radius.spec.ts` at 320, 375, 390, and 430px viewports |
| Password reveal, keyboard activation, pointer press | Reveal remains a 54x48 accessible target with no separate ring; field ring stays unified | `tests/web/auth-password-radius.spec.ts` |
| Sign-up password and confirmation, keyboard/pointer focus | Both public `AuthField` instances retain the outer ring without layout border | `tests/web/auth-signup-flow.spec.ts` |
| Native focus and visibility state | Android/iOS adapter retains the native pill border focus indicator, password semantics, and accessible reveal state | `src/ui/__tests__/AuthControls.test.tsx`, `src/screens/__tests__/AuthScreen.test.tsx` |
| Disabled/loading, palette, validation, and API behavior | Existing auth state, colors, copy, validation, and gateway behavior remain unchanged | full Jest coverage suite |
| Security/trust boundary | CSS is constant, field labels remain React props, and no user-controlled value reaches style or injected HTML | source-first self-review of the changed UI boundary |
