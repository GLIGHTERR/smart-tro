import { createApiAuthGateway, createConfiguredAuthGateway, GatewayError } from "../gateway";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const noContent = () => new Response(null, { status: 204 });

describe("email auth gateway", () => {
  const getDeviceId = jest.fn(async () => "device-1");
  const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const gateway = () => createApiAuthGateway({ baseUrl: "https://api.example", getDeviceId, fetch: fetchMock, now: () => 1_000 });

  beforeEach(() => { fetchMock.mockReset(); getDeviceId.mockClear(); });

  it("uses the approved signup payloads and the API cooldown for an initial request", async () => {
    fetchMock.mockResolvedValueOnce(json({ attemptId: "attempt-1", expiresInSeconds: 300, resendAfterSeconds: 41 }));
    fetchMock.mockResolvedValueOnce(noContent());
    fetchMock.mockResolvedValueOnce(noContent());
    const auth = gateway();
    await expect(auth.requestOtp("mai@example.com")).resolves.toEqual({ attemptId: "attempt-1", expiresAt: 301000, resendAvailableAt: 42000 });
    await auth.verifyOtp("mai@example.com", "attempt-1", "123456");
    await auth.createAccount("mai@example.com", "attempt-1", "123456", "Strong!1");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.example/auth/signup/otp/request", expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "mai@example.com" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://api.example/auth/signup/otp/verify", expect.objectContaining({ body: JSON.stringify({ email: "mai@example.com", attemptId: "attempt-1", code: "123456" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "https://api.example/auth/signup/complete", expect.objectContaining({ body: JSON.stringify({ email: "mai@example.com", attemptId: "attempt-1", code: "123456", password: "Strong!1" }) }));
    expect((fetchMock.mock.calls[0]![1]?.headers as Record<string, string>)["X-Device-Id"]).toBe("device-1");
  });

  it("uses the request endpoint to resend with the returned remaining cooldown", async () => {
    fetchMock.mockResolvedValue(json({ attemptId: "attempt-2", expiresInSeconds: 600, resendAfterSeconds: 6 }));
    await expect(gateway().resendOtp("mai@example.com")).resolves.toEqual({ attemptId: "attempt-2", expiresAt: 601000, resendAvailableAt: 7000 });
  });

  it("uses the legacy 60-second fallback only when the cooldown is absent", async () => {
    fetchMock.mockResolvedValue(json({ attemptId: "attempt-2", expiresInSeconds: 600 }));
    await expect(gateway().resendOtp("mai@example.com")).resolves.toEqual({ attemptId: "attempt-2", expiresAt: 601000, resendAvailableAt: 61000 });
  });

  it("logs in, verifies the authenticated session, refreshes both tokens, and logs out", async () => {
    fetchMock.mockResolvedValueOnce(json({ accessToken: "access-1", refreshToken: "refresh-1" }));
    fetchMock.mockResolvedValueOnce(json({ id: "renter-1" }));
    fetchMock.mockResolvedValueOnce(json({ accessToken: "access-2", refreshToken: "refresh-2" }));
    fetchMock.mockResolvedValueOnce(noContent());
    const auth = gateway();
    await expect(auth.signIn("mai@example.com", "Strong!1")).resolves.toEqual({ accessToken: "access-1", refreshToken: "refresh-1" });
    await expect(auth.me("access-1")).resolves.toBeUndefined();
    await expect(auth.refresh("refresh-1")).resolves.toEqual({ accessToken: "access-2", refreshToken: "refresh-2" });
    await expect(auth.logout("refresh-2")).resolves.toBeUndefined();
    expect((fetchMock.mock.calls[1]![1]?.headers as Record<string, string>).Authorization).toBe("Bearer access-1");
    expect(fetchMock.mock.calls[2]![1]?.body).toBe(JSON.stringify({ refreshToken: "refresh-1" }));
  });

  it("uses the deployed password-recovery contract without creating a session", async () => {
    fetchMock.mockResolvedValueOnce(json({ accepted: true, message: "Nếu email tồn tại, mã xác thực đã được gửi.", challengeId: "challenge-1", expiresInSeconds: 600, resendAfterSeconds: 43 }, 202));
    fetchMock.mockResolvedValueOnce(json({ verified: true, resetToken: "reset-token", expiresInSeconds: 600 }));
    fetchMock.mockResolvedValueOnce(json({ reset: true, next: "sign_in", email: "mai@example.com" }));
    const auth = gateway();
    await expect(auth.requestPasswordRecovery("mai@example.com")).resolves.toEqual({ challengeId: "challenge-1", expiresAt: 601000, resendAvailableAt: 44000 });
    await expect(auth.verifyPasswordRecovery("mai@example.com", "challenge-1", "123456")).resolves.toEqual({ resetToken: "reset-token", expiresAt: 601000 });
    await expect(auth.resetPassword("reset-token", "Changed!1", "Changed!1")).resolves.toEqual({ email: "mai@example.com", next: "sign_in" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.example/auth/password/recovery/request", expect.objectContaining({ body: JSON.stringify({ email: "mai@example.com" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://api.example/auth/password/recovery/verify", expect.objectContaining({ body: JSON.stringify({ email: "mai@example.com", challengeId: "challenge-1", code: "123456" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "https://api.example/auth/password/recovery/reset", expect.objectContaining({ body: JSON.stringify({ resetToken: "reset-token", newPassword: "Changed!1", confirmPassword: "Changed!1" }) }));
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("Authorization");
  });

  it.each([
    ["challenge accepted", "requestPasswordRecovery", { accepted: false, challengeId: "challenge", expiresInSeconds: 600, resendAfterSeconds: 60 }],
    ["challenge id", "requestPasswordRecovery", { accepted: true, challengeId: "", expiresInSeconds: 600, resendAfterSeconds: 60 }],
    ["challenge expiry", "requestPasswordRecovery", { accepted: true, challengeId: "challenge", expiresInSeconds: "bad", resendAfterSeconds: 60 }],
    ["challenge cooldown", "requestPasswordRecovery", { accepted: true, challengeId: "challenge", expiresInSeconds: 600, resendAfterSeconds: "bad" }],
    ["verification flag", "verifyPasswordRecovery", { verified: false, resetToken: "token", expiresInSeconds: 600 }],
    ["reset token", "verifyPasswordRecovery", { verified: true, resetToken: "", expiresInSeconds: 600 }],
    ["reset expiry", "verifyPasswordRecovery", { verified: true, resetToken: "token", expiresInSeconds: "bad" }],
    ["completion flag", "resetPassword", { reset: false, next: "sign_in", email: "mai@example.com" }],
    ["completion next", "resetPassword", { reset: true, next: "other", email: "mai@example.com" }],
    ["completion email", "resetPassword", { reset: true, next: "sign_in", email: "" }],
  ] as const)("rejects a malformed recovery %s response", async (_label, method, body) => {
    fetchMock.mockResolvedValue(json(body));
    const auth = gateway();
    const operation = method === "requestPasswordRecovery"
      ? auth.requestPasswordRecovery("mai@example.com")
      : method === "verifyPasswordRecovery"
        ? auth.verifyPasswordRecovery("mai@example.com", "challenge", "123456")
        : auth.resetPassword("token", "Changed!1", "Changed!1");
    await expect(operation).rejects.toEqual(expect.objectContaining({ code: "SERVER_ERROR" }));
  });

  it.each([["INVALID_OTP", 400, "INVALID_OTP"], ["EMAIL_EXISTS", 409, "ACCOUNT_EXISTS"], ["ignored", 429, "AUTH_RATE_LIMITED"], ["ignored", 503, "SERVER_ERROR"], ["ignored", 400, "NETWORK_ERROR"]] as const)("maps %s responses", async (backendCode, status, expected) => {
    fetchMock.mockResolvedValue(json({ code: backendCode }, status));
    await expect(gateway().requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: expected }));
  });

  it("preserves the backend retry duration for rate limits", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "AUTH_RATE_LIMITED", details: { retryAfterSeconds: 17 } }, 429));
    fetchMock.mockResolvedValueOnce(json({ code: "AUTH_RATE_LIMITED", details: { retryAfterSeconds: "bad" } }, 429));
    await expect(gateway().requestPasswordRecovery("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "AUTH_RATE_LIMITED", retryAfterSeconds: 17 }));
    await expect(gateway().requestPasswordRecovery("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "AUTH_RATE_LIMITED", retryAfterSeconds: undefined }));
  });

  it("maps nested backend errors, invalid JSON, invalid successful payloads, and fetch failures", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: "ACCOUNT_UNVERIFIED" } }, 401));
    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 500 }));
    fetchMock.mockResolvedValueOnce(json({ expiresInSeconds: 3 }));
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const auth = gateway();
    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "ACCOUNT_UNVERIFIED" }));
    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "SERVER_ERROR" }));
    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "SERVER_ERROR" }));
    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "NETWORK_ERROR" }));
    expect(new GatewayError("INVALID_OTP").message).toBe("INVALID_OTP");
  });

  it("bounds device-ID retrieval and records a sanitized device phase diagnostic", async () => {
    const diagnostic = jest.fn();
    const never = new Promise<string>(() => undefined);
    const immediateTimer = (callback: () => void) => { callback(); return 0 as unknown as ReturnType<typeof setTimeout>; };
    const auth = createApiAuthGateway({ baseUrl: "https://api.example", getDeviceId: () => never, fetch: fetchMock, diagnostic, createCorrelationId: () => "correlation-1", now: () => 1_000, setTimeout: immediateTimer, clearTimeout: jest.fn() });

    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "NETWORK_ERROR" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ correlationId: "correlation-1", path: "/auth/signup/otp/request", phase: "device_id" }));
  });

  it("aborts a hung fetch at the hard deadline and identifies the request for backend correlation", async () => {
    const diagnostic = jest.fn();
    const deadlineTimer = (callback: () => void, ms: number) => {
      if (ms !== 5_000) callback();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    };
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));
    const auth = createApiAuthGateway({ baseUrl: "https://api.example", getDeviceId, fetch: fetchMock, diagnostic, createCorrelationId: () => "correlation-2", now: () => 1_000, platform: "android", setTimeout: deadlineTimer, clearTimeout: jest.fn() });

    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "SERVER_WAKING" }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.example/auth/signup/otp/request", expect.objectContaining({ headers: expect.objectContaining({ "X-Correlation-Id": "correlation-2" }), signal: expect.objectContaining({ aborted: true }) }));
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ correlationId: "correlation-2", phase: "fetch", platform: "android", timedOut: true, errorName: "AbortError" }));
  });

  it("reports parse failures without recording credentials or tokens", async () => {
    const diagnostic = jest.fn();
    fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
    const auth = createApiAuthGateway({ baseUrl: "https://api.example", getDeviceId, fetch: fetchMock, diagnostic, createCorrelationId: () => "correlation-3", now: () => 1_000 });

    await expect(auth.signIn("mai@example.com", "Strong!1")).rejects.toEqual(expect.objectContaining({ code: "SERVER_ERROR" }));
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ correlationId: "correlation-3", path: "/auth/login", phase: "parse" }));
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain("Strong!1");
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain("mai@example.com");
  });

  it("keeps diagnostics safe for non-native fetch failures", async () => {
    const diagnostic = jest.fn();
    fetchMock.mockRejectedValueOnce(null).mockRejectedValueOnce({}).mockRejectedValueOnce("offline");
    const auth = createApiAuthGateway({ baseUrl: "https://api.example", getDeviceId, fetch: fetchMock, diagnostic });

    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "NETWORK_ERROR" }));
    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "NETWORK_ERROR" }));
    await expect(auth.requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: "NETWORK_ERROR" }));
    expect(diagnostic).toHaveBeenNthCalledWith(1, expect.not.objectContaining({ errorName: expect.anything(), errorMessage: expect.anything() }));
    expect(diagnostic).toHaveBeenNthCalledWith(2, expect.not.objectContaining({ errorName: expect.anything(), errorMessage: expect.anything() }));
    expect(diagnostic).toHaveBeenNthCalledWith(3, expect.not.objectContaining({ errorName: expect.anything(), errorMessage: expect.anything() }));
  });

  it("fails closed when no API base URL is configured", async () => {
    await expect(createConfiguredAuthGateway(getDeviceId, "").signIn("mai@example.com", "Strong!1")).rejects.toEqual(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    await expect(createConfiguredAuthGateway(getDeviceId).signIn("mai@example.com", "Strong!1")).rejects.toEqual(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    expect(createConfiguredAuthGateway(getDeviceId, "https://api.example")).toEqual(expect.objectContaining({ requestOtp: expect.any(Function) }));
  });
});
