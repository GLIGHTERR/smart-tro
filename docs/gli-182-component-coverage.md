# GLI-182 Component Coverage Inventory

| Product row | Terminal disposition | Evidence |
| --- | --- | --- |
| Home action grid and retry | Public `PressableControl` | `HomeScreen.tsx`; Home component and web navigation regression tests |
| Account header, tabs, retry/session, and account actions | Public `PressableControl`; existing `Button`/`Dialog` where confirmation is required | `AccountScreen.tsx`; explicit role, selected state, focus, keyboard, touch, and color regression in `AccountScreen.test.tsx` |
| Account profile edit form | Existing public `Field`, `Button`, and `Dialog` | `EditPersonalInformationScreen.tsx`; `contracts.test.tsx` and profile regressions |
| Root loading, saved-profile toast, and destination back control | Existing `ScreenState`/`Toast`; public `PressableControl` | `RootNavigator.tsx`; UI contract boundary check and navigation web regression |
| Auth and password-recovery controls | Existing dedicated public `AuthControls` and `BaseAuthField` contracts | Existing auth/recovery component and web accessibility regressions; no migration in this wave |
| `SafeAreaView`, `ScrollView`, `FlatList`, `RefreshControl`, `ActivityIndicator`, `Image`, `Text`, `View`, and `LinearGradient` | Documented platform-renderer exception | These are layout, virtualization, system-inset, image, loading, text, or gradient primitives rather than product controls. Replacing them would alter native/web behavior or list performance; Home/Account tests and web smoke cover their affected render paths. |
| React Navigation `NavigationContainer` and native stack | Documented navigation-platform exception | Linking, deep-link, back-stack, and route ownership remain in `RootNavigator.tsx`; `tests/web/home-navigation.spec.ts` and `tests/web/auth-deep-link.spec.ts` cover Web behavior. |

The inventory preserves all existing product colors, copy, API/gateway calls, deep links, and navigation behavior. `PressableControl` is intentionally a pass-through public contract: it centralizes the native interactive primitive without changing its renderer or interaction semantics.

## Test Matrix

| Changed branch or state | Regression evidence | Input / fixture |
| --- | --- | --- |
| Public control forwards role, selected state, focus, blur, and press | `src/ui/__tests__/contracts.test.tsx` | Tab role with selected state and each event callback |
| Account tabs retain selection and gain visible keyboard focus | Account unit regression and `tests/web/account-visual.spec.ts` | Personal/Signature tabs; pointer click, Enter, touch tap, focus outline `#A84300` |
| Home action and retry controls retain behavior | `src/screens/__tests__/HomeScreen.test.tsx`; `tests/web/home-navigation.spec.ts` | Single, multiple, empty, error contract fixtures and all permitted routes |
| Account normal, loading, error, timeout, session, and sign-out controls retain behavior | `src/screens/__tests__/AccountScreen.test.tsx`; `tests/web/account-visual.spec.ts` | Existing isolated Account review fixtures at mobile and desktop widths |
| Platform/navigation exceptions remain behaviorally safe | `tests/web/home-navigation.spec.ts`, `tests/web/account-visual.spec.ts`, and deep-link regression | Review-only fixture routes, native stack back behavior, and browser history |
