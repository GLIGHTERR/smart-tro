# GLI-68 OTP change-email evidence

- Design source: Smart Platform Figma node `2005:3261` and the issue attachment captured at 375x812.
- Review state: `EXPO_PUBLIC_UC03_REVIEW=true`, `EXPO_PUBLIC_AUTH_USE_MOCK=true`, URL query `?uc03=otp`.
- Captures: `320x568`, `375x812`, `390x844`, and `430x932`.
- The screenshots verify the destination copy, masked email, underlined `Đổi email` action, OTP input, and the required `Tiếp tục` then `Gửi lại mã OTP` order.

The query parameter selects only the in-memory review step. It does not contain or persist an email, OTP, challenge ID, reset token, or password.

Generated from the exported web bundle with headless Chrome. Android behavior is covered by the BackHandler integration test and the label-gated EAS preview build attached to the PR handoff.
