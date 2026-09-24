# GLI-64 recovery integration evidence

Validated on 2026-09-24 against `https://smart-platform-renter-api.onrender.com` and backend OpenAPI at `smart-platform-services` merge `15be9c0`.

## Runtime contract

- Health endpoints returned HTTP 200.
- A non-account email received the required generic HTTP 202 response with challenge expiry and resend cooldown fields.
- An invalid recovery OTP returned HTTP 401 `PASSWORD_RECOVERY_OTP_INVALID`.
- An invalid reset token returned HTTP 401 `PASSWORD_RESET_TOKEN_INVALID`.
- No real OTP, password, reset token, or account email was written to this evidence directory.

## Build and visual checks

- Expo Web export succeeded with the real review API configuration.
- Expo Android export succeeded and produced the Hermes Android bundle with the same configuration.
- Headless Chrome rendered all three approved web states at 390x844; screenshots are stored beside this file.
- The runner had no `adb`/emulator target, so physical Android interaction remains part of GLI-65 QA after the PR is merged and deployed.

## Test matrix

| Area | Cases |
| --- | --- |
| Request | invalid email; normalized email; generic success; malformed response; network/server/cold-start errors; rate-limit retry |
| OTP | six-digit validation; expiry boundary; invalid code; five-attempt exhaustion; resend cooldown; replacement challenge |
| Reset | password policy; confirmation mismatch; expired/one-time token; unchanged password; successful return to Sign In without a session |
| State/security | concurrent submit suppression; background password clearing; cold-start process reset; no secret persistence or diagnostics |
| Compatibility | UC-01/UC-02 gateway, preview gateway, device ID, session, validation, and startup suites |

Commands:

```text
npm run lint
npm run typecheck
npm run test:coverage
EXPO_PUBLIC_API_BASE_URL=https://smart-platform-renter-api.onrender.com EXPO_PUBLIC_AUTH_USE_MOCK=false EXPO_PUBLIC_UC03_REVIEW=true npx expo export --platform web
EXPO_PUBLIC_API_BASE_URL=https://smart-platform-renter-api.onrender.com EXPO_PUBLIC_AUTH_USE_MOCK=false EXPO_PUBLIC_UC03_REVIEW=true npx expo export --platform android
```
