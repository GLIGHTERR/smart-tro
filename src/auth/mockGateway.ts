import { GatewayError, type AuthGateway } from "./gateway";
export { GatewayError, type GatewayErrorCode } from "./gateway";

type Account = { password: string; verified: boolean };
type Challenge = { email: string; expiresAt: number; attempts: number; resendAt: number };

const OTP = "123456"; // Preview-only fixture; production policy belongs to the backend.
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_RESENDS_PER_HOUR = 5;

export function createMockAuthGateway(now: () => number = Date.now): AuthGateway {
  const accounts = new Map<string, Account>([
    ["demo@smarttro.vn", { password: "SmartTro!1", verified: true }],
    ["unverified@smarttro.vn", { password: "SmartTro!1", verified: false }]
  ]);
  const challenges = new Map<string, Challenge>();
  const resetTokens = new Map<string, { email: string; expiresAt: number }>();
  const resendHistory = new Map<string, number[]>();
  let sequence = 0;

  const challengeFor = (id: string) => {
    const challenge = challenges.get(id);
    if (!challenge || now() > challenge.expiresAt) throw new GatewayError("OTP_EXPIRED");
    return challenge;
  };

  return {
    async requestOtp(email) {
      const current = now();
      const attemptId = `preview-${++sequence}`;
      const expiresAt = current + OTP_TTL_MS;
      const resendAvailableAt = current + RESEND_COOLDOWN_MS;
      challenges.set(attemptId, { email, expiresAt, attempts: 0, resendAt: resendAvailableAt });
      return { attemptId, expiresAt, resendAvailableAt };
    },
    async resendOtp(email) {
      const attemptId = [...challenges.entries()].find(([, challenge]) => challenge.email === email)?.[0] ?? "";
      const challenge = challengeFor(attemptId);
      const current = now();
      if (current < challenge.resendAt) throw new GatewayError("RESEND_COOLDOWN");
      const history = (resendHistory.get(challenge.email) ?? []).filter((time) => current - time < 60 * 60 * 1000);
      if (history.length >= MAX_RESENDS_PER_HOUR) throw new GatewayError("RESEND_LIMIT");
      resendHistory.set(challenge.email, [...history, current]);
      challenge.expiresAt = current + OTP_TTL_MS;
      challenge.resendAt = current + RESEND_COOLDOWN_MS;
      challenge.attempts = 0;
      return { attemptId, expiresAt: challenge.expiresAt, resendAvailableAt: challenge.resendAt };
    },
    async verifyOtp(_email, attemptId, otp) {
      const challenge = challengeFor(attemptId);
      if (challenge.attempts >= MAX_ATTEMPTS) throw new GatewayError("OTP_ATTEMPTS_EXHAUSTED");
      if (otp !== OTP) {
        challenge.attempts += 1;
        throw new GatewayError(challenge.attempts >= MAX_ATTEMPTS ? "OTP_ATTEMPTS_EXHAUSTED" : "INVALID_OTP");
      }
    },
    async createAccount(_email, attemptId, _otp, password) {
      const challenge = challengeFor(attemptId);
      if (accounts.has(challenge.email)) throw new GatewayError("ACCOUNT_EXISTS");
      accounts.set(challenge.email, { password, verified: true });
    },
    async signIn(email, password) {
      const account = accounts.get(email);
      if (!account || account.password !== password) throw new GatewayError("INVALID_CREDENTIALS");
      if (!account.verified) throw new GatewayError("ACCOUNT_UNVERIFIED");
      return { accessToken: "preview-access-token", refreshToken: "preview-refresh-token" };
    },
    async refresh() { return { accessToken: "preview-access-token", refreshToken: "preview-refresh-token" }; },
    async me() { return undefined; },
    async logout() { return undefined; },
    async requestPasswordRecovery(email) {
      const current = now();
      const challengeId = `recovery-${++sequence}`;
      const expiresAt = current + OTP_TTL_MS;
      const resendAvailableAt = current + RESEND_COOLDOWN_MS;
      challenges.set(challengeId, { email, expiresAt, attempts: 0, resendAt: resendAvailableAt });
      return { challengeId, expiresAt, resendAvailableAt };
    },
    async verifyPasswordRecovery(email, challengeId, code) {
      const challenge = challengeFor(challengeId);
      const account = accounts.get(email);
      if (!account?.verified || challenge.email !== email || challenge.attempts >= MAX_ATTEMPTS || code !== OTP) {
        challenge.attempts += 1;
        throw new GatewayError("PASSWORD_RECOVERY_OTP_INVALID");
      }
      const resetToken = `preview-reset-${++sequence}`;
      const expiresAt = now() + OTP_TTL_MS;
      resetTokens.set(resetToken, { email, expiresAt });
      return { resetToken, expiresAt };
    },
    async resetPassword(resetToken, newPassword, confirmPassword) {
      const reset = resetTokens.get(resetToken);
      if (!reset || reset.expiresAt <= now()) throw new GatewayError("PASSWORD_RESET_TOKEN_INVALID");
      if (newPassword !== confirmPassword) throw new GatewayError("PASSWORD_CONFIRMATION_MISMATCH");
      const account = accounts.get(reset.email)!;
      if (account.password === newPassword) throw new GatewayError("PASSWORD_UNCHANGED");
      account.password = newPassword;
      resetTokens.delete(resetToken);
      return { email: reset.email, next: "sign_in" };
    }
  };
}
