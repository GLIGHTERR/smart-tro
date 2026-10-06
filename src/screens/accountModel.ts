export type AccountProfile = { displayName: string; email: string | null; phone: string | null; avatar: string | null };
export type ActiveRental = { contractId: string; room: string; property: string; expiresAt: string; signedAt: string };

export function maskPhone(phone: string) {
  return /^\d{10}$/.test(phone) ? `•••••••${phone.slice(-3)}` : null;
}

export function isDisplayableEmail(email: string | null) { return typeof email === "string" && email.trim().length > 0 && /^[^@\s]+@[^@\s]+$/.test(email); }

export function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return "*";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const masked = local.length >= 3 ? `${local[0]}***${local.at(-1)}` : local.length === 2 ? `${local[0]}*` : "*";
  return `${masked}@${domain}`;
}

export function sortActiveRentals(rentals: ActiveRental[]) {
  return [...rentals].sort((left, right) => left.signedAt.localeCompare(right.signedAt) || left.contractId.localeCompare(right.contractId));
}

export function accountReviewScenario() {
  // CI already enables the shared Home review mode for browser fixtures.
  if (process.env.EXPO_PUBLIC_ACCOUNT_REVIEW !== "true" && process.env.EXPO_PUBLIC_HOME_REVIEW !== "true") return process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO;
  if (typeof globalThis.location === "undefined") return undefined;
  const scenario = new URLSearchParams(globalThis.location.search).get("account");
  return ["zero", "one", "multiple", "loading", "error", "timeout", "session", "long", "phone-empty", "email-invalid"].includes(scenario ?? "") ? scenario : "one";
}
