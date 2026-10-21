# GLI-161 Android interaction harness audit

## Failure taxonomy

| Run / head | Observed failure | Class | Missing invariant |
| --- | --- | --- | --- |
| `39469780837` / `920c3b0` | controls disappeared after typing `Alice` | retained IME and reduced viewport | each case starts with IME closed and verified |
| `39473690779` / `80086ff` | all app controls missing; launcher XML captured | unsafe Back transition | Back is sent only when IME visibility is proven; app foreground is verified after every transition |
| `39534242208` / `09a43e5` | `Navigate` not found while `Show toast and navigate` existed | stale copy-based locator | harness consumes a shared immutable identifier manifest, never display copy |
| `39536487778` / `6ccca5b` | long-toast control remained below 1.5x viewport | incomplete one-direction scroll model | search is bounded, settled, re-queried and progress-aware |
| `39538178416` / `164cffb` | swipe began inside native input and did not move the parent | gesture consumed by child control | gesture coordinates come from the ScrollView edge, outside editable content |
| `39538178416` / `164cffb` | diagnostic `dumpsys`/reset commands failed and contaminated later cases | diagnostics and cases coupled | diagnostic capture is non-authoritative; every case performs its own verified reset and records its own failure evidence |
| `39542230458` / `2d55f1d` | Android 35 app window existed but foreground parser returned unknown | platform state-source compatibility | foreground uses resumed-activity state with window fallback; only idempotent reads/resets retry transient ADB failures |

The failures are harness defects. The artifacts do not show a product control disappearing or an APK/provisioning failure. Required APK and Web checks passed on the failed heads.

## State model and invariants

Each case follows the same transition:

1. Restore font scale `1.0`, portrait rotation, and automatic rotation.
2. Apply the case-specific font scale and verify the stored setting.
3. If and only if the SmartTro activity is foreground and the IME reports visible, send Back and verify both IME closure and unchanged foreground package.
4. Force-stop, explicitly start `com.smartplatform.smarttro/.MainActivity`, wait for the package to become foreground, and verify the Page 1 contract identifier.
5. Run interactions through shared `testID` values from `src/pilot/interaction-contract.json`.
6. After every gesture/navigation transition, verify SmartTro remains foreground. Scroll searches capture each attempt, re-query the hierarchy after settlement, stop on repeated no-progress, and never begin inside the native input.
7. Capture screenshot, XML, foreground activity, IME state, font scale and rotation for reset, search, success and failure steps.
8. Restore system settings in `finally`; the next case does not consume state from the previous case.

All cases continue after an individual failure so one emulator run reports the complete failure set. The checked-in artifact-derived fixture manifest traces the six known classes to their source run/head.

## CI contract

`harness-preflight` validates selectors, reset branches, launcher/IME fixtures, bounded scrolling, no-progress handling, exception isolation and manifest uniqueness before the APK job starts. The emulator job then runs as two serial, independent runners that download the same APK artifact; both attempts must pass. Android workflow concurrency cancels obsolete PR runs, while artifact names and checkout remain bound to the exact PR head SHA.
