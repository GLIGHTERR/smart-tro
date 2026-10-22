# GLI-155 pilot test matrix

Baseline: SmartTro master 85f046e00d94eda387b208b9c0796d51cf06af4c.
The Android runtime and accessibility gate remains separate in GLI-156.

| Contract | Cases | Evidence |
| --- | --- | --- |
| Boundary | public API has no vendor types; vendor imports confined to renderer | lint guard, typecheck |
| Button | enabled, disabled, press | unit and browser |
| Input | focus, value, one visible field-error message, valid clear, keyboard | unit and browser; Android in GLI-156 |
| Persistent alert | independent system/business message, visible until caller clears it | unit and browser |
| Dialog | Web masked centered panel; open, close, Escape/back, focus and restoration | unit and browser; Android in GLI-156 |
| Toast | default duration, deadline, replacement, duplicate event, unmount/dismiss, show-and-navigate lifecycle | fake-timer unit and browser |
| Accessibility | live region, keyboard dialog/focus, long text | browser; device announcement in GLI-156 |
| Regression | UC-05 success/failure and navigation | existing tests and Web regression |
| Build | npm ci, dependency tree, Expo Doctor, lint, typecheck, coverage, production export | commands in handoff |
| Bundle | normal product entry before/after with the same export configuration; isolated pilot size separately | commands in handoff |

No permissions, concurrent writes, persistence, or backend operations are added by
the pilot; event deduplication and timer cancellation cover relevant idempotency
and race cases. Device behavior is not inferred from mocks.

The validation and persistent-alert demos are deliberately separate: `Validate`
does not render a NoticeBar, and `Show persistent alert` does not depend on the
field state. `Show toast and navigate` creates the one-shot success message and
moves to Page 2 in one action; `Go back` is navigation only, not a vendor demo.

Adapter mapping: Button, InputItem, NoticeBar, Provider and Toast are rendered
by `@ant-design/react-native` inside `src/ui/pilot/renderer.tsx`. Dialog is an
adapter fallback: React Native Web renders the masked, centered panel because
the vendor modal portal did not expose a usable Web dialog tree; Android uses
React Native `Modal` so Android Back reaches `onRequestClose`. Neither fallback
is exposed through the public `src/ui` types, and no second UI vendor is used.

The isolated pilot is selected at build time with `EXPO_PUBLIC_UI_PILOT=true`;
the ordinary product entry and UC-05 are unchanged. `npm run test:web:ui-pilot`
exports and exercises that entry in Chromium, but Pages never publishes it.
Normal `npm run export:web` runs a deterministic bundle-content guard that
rejects pilot copy and `@ant-design/react-native` markers. Neither suite proves
mobile accessibility, font autolinking, keyboard/safe-area behavior, or iOS
support.

Rollback: do not merge the pilot PR, or revert its single commit if it has been
integrated later. The existing internal primitives and product entry remain in
place. Do not enable the pilot flag in product builds before the separate
Android and final G1 gates are satisfied.
