import type { HttpClient } from "./http";

export type RenterProfile = { id: string; name: string; email: string };
export type AuthResponse = { accessToken: string; renter: RenterProfile };

// This is the only renter API contract boundary. Confirm routes/payloads with GLI-17.
export function createRenterApi(http: HttpClient) {
  return {
    signIn: (email: string, password: string) =>
      http.request<AuthResponse>("/renter/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (name: string, email: string, password: string) =>
      http.request<AuthResponse>("/renter/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
    me: () => http.request<RenterProfile>("/renter/me")
  };
}
