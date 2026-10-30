# GLI-214 Test Matrix

| Boundary | Input / state | Expected result |
| --- | --- | --- |
| Normal signup | Formatted E.164 phone | Client canonicalizes the number and sends the API contract's E.164 form. |
| Invalid signup | Local phone without country prefix | Client blocks completion before any API request and shows the E.164 validation message. |
| API validation response | Nested `400 BAD_REQUEST` completion response | Gateway maps it to `VALIDATION_ERROR`, not `NETWORK_ERROR`. |
| API success | `201 { created: true, next: "sign_in" }` | Existing signup flow returns to sign-in without a session. |
| Transport failures | Rejected fetch, timeout, unavailable base URL | Existing `NETWORK_ERROR`, `SERVER_WAKING`, and configuration mappings remain covered. |
