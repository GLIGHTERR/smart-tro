# GLI-155 pilot test matrix

Baseline: SmartTro master 85f046e00d94eda387b208b9c0796d51cf06af4c.
The Android runtime and accessibility gate remains separate in GLI-156.

| Contract | Cases | Evidence |
| --- | --- | --- |
| Boundary | public API has no vendor types; vendor imports confined to renderer | lint guard, typecheck |
| Button | enabled, disabled, press | unit and browser |
| Input | focus, value, validation, keyboard | unit and browser; Android in GLI-156 |
| Persistent alert | visible until caller clears it; caller input unchanged | unit and browser |
| Dialog | open, close, Escape/back, focus and restoration | unit and browser; Android in GLI-156 |
| Toast | default duration, deadline, replacement, duplicate event, unmount/dismiss, navigation | fake-timer unit and browser |
| Accessibility | live region, keyboard dialog/focus, long text | browser; device announcement in GLI-156 |
| Regression | UC-05 success/failure and navigation | existing tests and Web regression |
| Build | npm ci, dependency tree, Expo Doctor, lint, typecheck, coverage, production export | commands in handoff |
| Bundle | normal product entry before/after with the same export configuration; isolated pilot size separately | commands in handoff |

No permissions, concurrent writes, persistence, or backend operations are added by
the pilot; event deduplication and timer cancellation cover relevant idempotency
and race cases. Device behavior is not inferred from mocks.

The isolated pilot is selected at build time with `EXPO_PUBLIC_UI_PILOT=true`;
the ordinary product entry and UC-05 are unchanged. `npm run test:web:ui-pilot`
exports and exercises that entry in Chromium. The existing Web suite uses the
normal entry. Neither suite proves mobile accessibility, font autolinking,
keyboard/safe-area behavior, or iOS support.

Rollback: do not merge the pilot PR, or revert its single commit if it has been
integrated later. The existing internal primitives and product entry remain in
place. Do not enable the pilot flag in product builds before the separate
Android and final G1 gates are satisfied.
