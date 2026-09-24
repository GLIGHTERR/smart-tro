# SmartTro mobile foundation

Expo React Native + TypeScript foundation for the renter app. It deliberately contains no backend runtime or booking/property business implementation.

## Start

```bash
cp .env.example .env
npm install
npm run start
```

Set `EXPO_PUBLIC_API_BASE_URL` to the deployed renter API (the current review URL is `https://smart-platform-renter-api.onrender.com`). It is public configuration only: never add credentials or service secrets to this application. Review and production builds fail closed when it is missing.

`EXPO_PUBLIC_AUTH_USE_MOCK=true` enables the preview-only mock adapter. It is permitted for automated tests and local visual preview only; do not set it in review or production builds.

`EXPO_PUBLIC_REVIEW_SOCIALS=true` keeps the Facebook, Google, and Apple controls visible for visual review. These controls are UI-only in the current foundation and do not perform social authentication yet.

`EXPO_PUBLIC_UC03_REVIEW=true` enables the forgot-password flow against the configured renter API. Recovery credentials stay in process memory only. Reviewers can enter from Sign In; web visual evidence can open `?uc03=email`, `?uc03=otp`, or `?uc03=password`. The query parameter selects only a visual step and never carries an email, OTP, password, challenge ID, or reset token.

## Typography

The approved application font is **Be Vietnam Pro**. Keep the font mapping consistent across new screens:

- `BeVietnamPro_400Regular`: inputs, placeholders, body, helper, notice, and error text.
- `BeVietnamPro_600SemiBold`: screen titles, primary actions, links, separators, and social labels.

Only load the weights a screen actually uses. Do not reintroduce Poppins or mix arbitrary system fonts into application content; platform status-bar chrome and brand icons are excluded from this rule.

## Architecture

- `src/navigation`: unauthenticated auth screen and authenticated tab shell.
- `src/auth`: SecureStore-backed session/device abstraction, form validation, and the email-auth API boundary. Mobile stores rotated access/refresh tokens in SecureStore; web keeps them only in page memory.
- `src/api/http.ts`: base URL, authorization, errors, and JSON transport boundary.
- `src/auth/gateway.ts`: UC-01/UC-02/UC-03 contract boundary. It sends a stable `X-Device-Id`, maps auth errors, rotates both tokens on refresh, and verifies `/auth/me` after login/restore.
- `src/auth/recoveryState.ts`: UC-03 in-memory state, expiry/cooldown handling, lifecycle sanitization, and double-submit guard. Recovery secrets are never written to session storage, local storage, SecureStore, routes, or diagnostics.
- `src/ui`: design tokens and reusable form, button, loading, empty, and error primitives.

## Handoff

GLI-17 owns confirmation of renter API routes/contracts in `smart-platform-services`. GLI-15 can replace the authenticated placeholder tabs with search, listing, and booking flows without changing the navigation/session/API boundaries.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
```

## Android review APK

The `preview` EAS profile builds an internally distributed APK against the deployed renter API. It uses the real auth gateway and mobile `expo-secure-store`; it never embeds backend, Brevo, database, or other service secrets.

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

Install the resulting APK on a review device and validate sign-in, app restart/session restoration, refresh-token rotation, `/auth/me`, and logout/revocation. The GitHub Pages review remains intentionally memory-only and is not evidence for persistent mobile session behavior.

## Auth integration test matrix

| AC / behavior | Coverage |
| --- | --- |
| UC-01 signup | Request, six-digit verification, password completion, then return to Sign In without a session |
| UC-02 session | Login then `/auth/me`, restore with refresh rotation, current-session logout cleanup |
| Failure states | Mapped OTP, credentials, account state, rate-limit, provider, network, malformed-response, and server errors |
| Security/state | Email normalization, no password/OTP persistence, secure mobile token storage, web memory-only session, stable device header |
| UC-03 recovery | Generic request, challenge-bound OTP verification, resend/expiry/rate limits, one-time reset token, return to Sign In without a session |
| UC-03 lifecycle | Background resume preserves a valid step but clears password fields; cold restart returns to Sign In because recovery state is process-only |
