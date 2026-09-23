import type { RecoveryStep } from "./recoveryState";

export function getRecoveryReviewStep(): RecoveryStep | null {
  if (process.env.EXPO_PUBLIC_UC03_REVIEW !== "true") return null;
  const step = new URLSearchParams(window.location.search).get("uc03");
  return step === "email" || step === "otp" || step === "password" ? step : null;
}
