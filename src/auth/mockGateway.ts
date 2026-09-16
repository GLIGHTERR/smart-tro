export type GatewayErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_UNVERIFIED"
  | "INVALID_OTP"
  | "OTP_EXPIRED"
  | "OTP_ATTEMPTS_EXHAUSTED"
  | "RESEND_COOLDOWN"
  | "RESEND_LIMIT"
  | "ACCOUNT_EXISTS";

export class GatewayError extends Error {
  constructor(public readonly code: GatewayErrorCode) {
    super(code);
  }
}

type Account = { password: string; verified: boolean };
type Challenge = { email: string; expiresAt: number; attempts: number; resendAt: number };

const OTP = "123456"; // Preview-only fixture; production policy belongs to the backend.
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_RESENDS_PER_HOUR = 5;

export interface AuthGateway {
  requestOtp(email: string): Promise<{ attemptId: string; expiresAt: number; resendAvailableAt: number }>;
  resendOtp(attemptId: string): Promise<{ expiresAt: number; resendAvailableAt: number }>;
  verifyOtp(attemptId: string, otp: string): Promise<void>;
  createAccount(attemptId: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
}

export function createMockAuthGateway(now: () => number = Date.now): AuthGateway {
  const accounts = new Map<string, Account>([
    ["demo@smarttro.vn", { password: "SmartTro!1", verified: true }],
    ["unverified@smarttro.vn", { password: "SmartTro!1", verified: false }]
  ]);
  const challenges = new Map<string, Challenge>();
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
    async resendOtp(attemptId) {
      const challenge = challengeFor(attemptId);
      const current = now();
      if (current < challenge.resendAt) throw new GatewayError("RESEND_COOLDOWN");
      const history = (resendHistory.get(challenge.email) ?? []).filter((time) => current - time < 60 * 60 * 1000);
      if (history.length >= MAX_RESENDS_PER_HOUR) throw new GatewayError("RESEND_LIMIT");
      resendHistory.set(challenge.email, [...history, current]);
      challenge.expiresAt = current + OTP_TTL_MS;
      challenge.resendAt = current + RESEND_COOLDOWN_MS;
      challenge.attempts = 0;
      return { expiresAt: challenge.expiresAt, resendAvailableAt: challenge.resendAt };
    },
    async verifyOtp(attemptId, otp) {
      const challenge = challengeFor(attemptId);
      if (challenge.attempts >= MAX_ATTEMPTS) throw new GatewayError("OTP_ATTEMPTS_EXHAUSTED");
      if (otp !== OTP) {
        challenge.attempts += 1;
        throw new GatewayError(challenge.attempts >= MAX_ATTEMPTS ? "OTP_ATTEMPTS_EXHAUSTED" : "INVALID_OTP");
      }
    },
    async createAccount(attemptId, password) {
      const challenge = challengeFor(attemptId);
      if (accounts.has(challenge.email)) throw new GatewayError("ACCOUNT_EXISTS");
      accounts.set(challenge.email, { password, verified: true });
    },
    async signIn(email, password) {
      const account = accounts.get(email);
      if (!account || account.password !== password) throw new GatewayError("INVALID_CREDENTIALS");
      if (!account.verified) throw new GatewayError("ACCOUNT_UNVERIFIED");
      // The review build deliberately creates no session or token.
    }
  };
}
