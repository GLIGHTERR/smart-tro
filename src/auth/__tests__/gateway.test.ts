import { createApiAuthGateway, createConfiguredAuthGateway, GatewayError } from "../gateway";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const noContent = () => new Response(null, { status: 204 });

describe("email auth gateway", () => {
  const getDeviceId = jest.fn(async () => "device-1");
  const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const gateway = () => createApiAuthGateway({ baseUrl: "https://api.example", getDeviceId, fetch: fetchMock, now: () => 1_000 });

  beforeEach(() => { fetchMock.mockReset(); getDeviceId.mockClear(); });

  it("uses the approved signup payloads and stable device header", async () => {
    fetchMock.mockResolvedValueOnce(json({ attemptId: "attempt-1", expiresInSeconds: 300, resendAvailableInSeconds: 20 }));
    fetchMock.mockResolvedValueOnce(noContent());
    fetchMock.mockResolvedValueOnce(noContent());
    const auth = gateway();
    await expect(auth.requestOtp("mai@example.com")).resolves.toEqual({ attemptId: "attempt-1", expiresAt: 301000, resendAvailableAt: 21000 });
    await auth.verifyOtp("mai@example.com", "attempt-1", "123456");
    await auth.createAccount("mai@example.com", "attempt-1", "123456", "Strong!1");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.example/auth/signup/otp/request", expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "mai@example.com" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://api.example/auth/signup/otp/verify", expect.objectContaining({ body: JSON.stringify({ email: "mai@example.com", attemptId: "attempt-1", code: "123456" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "https://api.example/auth/signup/complete", expect.objectContaining({ body: JSON.stringify({ email: "mai@example.com", attemptId: "attempt-1", code: "123456", password: "Strong!1" }) }));
    expect((fetchMock.mock.calls[0]![1]?.headers as Record<string, string>)["X-Device-Id"]).toBe("device-1");
  });

  it("uses the request endpoint to resend and defaults its cooldown", async () => {
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

  it.each([["INVALID_OTP", 400, "INVALID_OTP"], ["EMAIL_EXISTS", 409, "ACCOUNT_EXISTS"], ["ignored", 429, "AUTH_RATE_LIMITED"], ["ignored", 503, "SERVER_ERROR"], ["ignored", 400, "NETWORK_ERROR"]] as const)("maps %s responses", async (backendCode, status, expected) => {
    fetchMock.mockResolvedValue(json({ code: backendCode }, status));
    await expect(gateway().requestOtp("mai@example.com")).rejects.toEqual(expect.objectContaining({ code: expected }));
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

  it("fails closed when no API base URL is configured", async () => {
    await expect(createConfiguredAuthGateway(getDeviceId, "").signIn("mai@example.com", "Strong!1")).rejects.toEqual(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    expect(createConfiguredAuthGateway(getDeviceId, "https://api.example")).toEqual(expect.objectContaining({ requestOtp: expect.any(Function) }));
  });
});
