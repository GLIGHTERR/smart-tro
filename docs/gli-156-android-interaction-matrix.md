# GLI-156 technical pilot interaction matrix

This harness runs against the APK produced from the workflow's triggering
immutable SHA. It captures technical observations, not formal QA or TalkBack
certification.

| Scope | Input and expected observation | Evidence |
| --- | --- | --- |
| Provenance | SHA and APK hash match the pilot handoff; mismatch aborts | CI log |
| Input/validation | Empty `Name`, then `Alice`; required error appears then clears | UI XML and screenshots |
| Disabled Button | `Disabled` has `enabled=false`; tapping does not navigate | UI XML and screenshots |
| Persistent Alert | Empty validation shows alert; remains after a delay | UI XML and screenshots |
| Dialog | Enter synthetic `Alice`, open, close with control, reopen and press Android Back; retain Page 1 input after each close | UI XML and screenshots |
| Toast | `Show toast`, observe immediate and after >5s, then navigate | Screenshots and UI XML |
| Keyboard/focus | Focus Name, enter `Alice`; record keyboard state and hierarchy | UI XML and input-method dump |
| Long text/font scale | Long toast with font scale 1.5; record hierarchy and screenshot | Screenshots and UI XML |
| Orientation/safe area | Request landscape; record actual orientation and bounds (app declares portrait) | settings, UI XML, screenshot |
| Accessibility | Inspect installed/enabled services, try TalkBack only if available; collect semantics | service listing and UI XML |
| Exceptions/crashes | Record per-case failures; collect logcat even on failures | results JSON and logcat |
| Dedupe | UI generates a fresh event ID each tap, so same-ID dedupe cannot be exercised | Explicitly not tested |

Helper unit tests cover XML target matching, disabled nodes, absent/malformed
targets and bounds, independent of an Android device. External device commands
are integration boundaries. Tests do not establish manual screen-reader PASS.
