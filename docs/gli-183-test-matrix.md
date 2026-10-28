# GLI-183 Test Matrix

| Acceptance criterion | Regression coverage | Fixture / input |
| --- | --- | --- |
| Field labels appear above controls and helper/error copy below | `src/ui/__tests__/contracts.test.tsx`; profile web visual test | Required name, optional phone helper, read-only email |
| No vendor separator reaches the label or input border | `contracts.test.tsx` verifies the adapter owns a sibling label; profile visual screenshots | Ant `InputItem` receives no inline-label child and has its separator disabled |
| Normal, focus, error, disabled, and helper states preserve the profile flow | Profile component tests; `tests/web/account-visual.spec.ts` | Authorized non-production profile fixture and validation/save states |
| Changed Field branches and profile behavior remain covered | `npm run test:coverage` | Controlled values, change callback, required marker, optional hint/error, disabled state |
| Adopted Wave 2+ consumers use the shared contract | Source audit: `EditPersonalInformationScreen` is the only production `Field` consumer | Auth and recovery inputs are pre-existing standalone flows, not adopted `Field` consumers |
