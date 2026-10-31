# GLI-220 Test Matrix

| Boundary | Synthetic input / state | Expected result |
| --- | --- | --- |
| Domestic signup | Valid ten-digit Vietnamese mobile input beginning with `09` | Personal step accepts it and `signup/complete` receives canonical `+84...`. |
| Canonical signup | Formatted canonical Vietnamese E.164 input | Client retains the equivalent canonical `+84...` value without a second prefix. |
| Invalid boundaries | Short/long inputs, unsupported Vietnamese prefixes, letters/symbols, malformed `+84`, and non-Vietnamese international input | Personal step rejects before `signup/complete` with the existing validation message. |
| Existing registration state | Successful completion, loading guard, OTP state, navigation, and gateway validation mapping | Existing screen and browser-flow regressions remain unchanged. |
| Security/privacy | Client-side untrusted phone input | Normalization does not log a value; server-side E.164 validation remains authoritative. |
