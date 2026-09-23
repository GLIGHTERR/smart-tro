# UC-03 forgot-password visual evidence

- Source: SmartPlatform `docs/use-cases/smarttro/UC-03-forgot-password.md`
- Figma nodes: email `2005:3286`, OTP `2005:3261`, password `2005:3310`
- Captures: `smart-platform/docs/assets/smarttro-auth/forgot-password-*.png`
- Review flag: `EXPO_PUBLIC_UC03_REVIEW=true`
- Web review states: `?uc03=email`, `?uc03=otp`, `?uc03=password`

The folder contains each of the three screens at `320x568`, `375x812`, `390x844`, and `430x932`. The back control is an approved implementation necessity for flow navigation and is the only intentional composition addition to the static Figma captures. The OTP evidence shows the required generic response and disabled resend countdown state after an email request.

The flow is FE-only: it does not call a password-recovery endpoint, send an OTP, mutate a password, revoke a session, or persist recovery data. Production keeps the review flag disabled until the backend contract is approved and mapped.
