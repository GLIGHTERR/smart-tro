## GLI-219 Password Reveal Icon Regression Matrix

| Scenario | Expected result | Evidence |
| --- | --- | --- |
| Android release startup | The FontAwesome TTF is embedded by prebuild and loaded before auth UI mounts. | `scripts/__tests__/font-assets.test.mjs` |
| Sign-in password, initially masked | The 54 x 48dp reveal target renders the amber `eye` glyph and preserves native password masking. | `src/ui/__tests__/AuthControls.test.tsx` |
| Sign-in password, revealed | The same target renders the amber `eye-slash` glyph with expanded state true after activation. | `src/ui/__tests__/AuthControls.test.tsx` |
| Signup password and confirmation | Both use the shared `AuthField` adapter, so they inherit the registered FontAwesome face, target geometry, touch, and keyboard semantics. | `src/screens/__tests__/AuthScreen.test.tsx` |
| Focus, palette, and Web behavior | The existing transparent target, unified focus ring, colors, and Web auth tests remain unchanged. | `src/ui/__tests__/AuthControls.test.tsx`, `npm run test:web:auth` when browser evidence is required |
| Security/trust boundary | Only static local font assets and icon names are registered; no user input, auth state, or sensitive data crosses a new boundary. | Focused source review of `app.json`, `src/App.tsx`, and `BaseAuthField.tsx` |
