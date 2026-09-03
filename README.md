# SmartTro mobile foundation

Expo React Native + TypeScript foundation for the renter app. It deliberately contains no backend runtime or booking/property business implementation.

## Start

```bash
cp .env.example .env
npm install
npm run start
```

Set `EXPO_PUBLIC_API_BASE_URL` to the deployed `smart-platform-services` base URL. It is public configuration only: never add credentials or service secrets to this application.

## Architecture

- `src/navigation`: unauthenticated auth screen and authenticated tab shell.
- `src/auth`: SecureStore-backed session abstraction and form validation.
- `src/api/http.ts`: base URL, authorization, errors, and JSON transport boundary.
- `src/api/renter.ts`: the sole renter endpoint contract. Endpoint paths and request/response shapes must be confirmed with GLI-17 before backend integration.
- `src/ui`: design tokens and reusable form, button, loading, empty, and error primitives.

## Handoff

GLI-17 owns confirmation of renter API routes/contracts in `smart-platform-services`. GLI-15 can replace the authenticated placeholder tabs with search, listing, and booking flows without changing the navigation/session/API boundaries.

## Verify

```bash
npm run lint
npm run typecheck
npm test
```
