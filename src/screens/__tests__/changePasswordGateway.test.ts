import { ChangePasswordGatewayError, createApiChangePasswordGateway, createConfiguredChangePasswordGateway } from "../changePasswordGateway";

const fetchMock = jest.fn();
const input = { currentPassword: "Current1!", newPassword: "Changed2@", confirmation: "Changed2@", idempotencyKey: "change-1" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("change-password gateway", () => {
  beforeEach(() => fetchMock.mockReset());

  it("posts the exact approved contract with the active subject token and idempotency key", async () => {
    fetchMock.mockResolvedValue(json({ changed: true, next: "profile" }));
    await expect(createApiChangePasswordGateway({ baseUrl: "https://api.example", fetch: fetchMock }).change("access-token", input)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("https://api.example/auth/password/change", expect.objectContaining({
      method: "POST",
      headers: { Accept: "application/json", Authorization: "Bearer access-token", "Content-Type": "application/json", "Idempotency-Key": "change-1" },
      body: JSON.stringify({ currentPassword: "Current1!", newPassword: "Changed2@", confirmPassword: "Changed2@" })
    }));
  });

  it.each([
    [401, {}, "INVALID_SESSION"],
    [401, { error: { code: "INVALID_CREDENTIALS" } }, "INVALID_CURRENT_PASSWORD"],
    [400, { error: { code: "INVALID_SESSION" } }, "INVALID_SESSION"],
    [400, { error: { code: "INVALID_CREDENTIALS" } }, "INVALID_CURRENT_PASSWORD"],
    [429, {}, "RATE_LIMITED"],
    [400, { error: { code: "AUTH_RATE_LIMITED" } }, "RATE_LIMITED"],
    [409, {}, "CONFLICT"],
    [400, { error: { code: "PASSWORD_CHANGE_CONFLICT" } }, "CONFLICT"],
    [400, {}, "VALIDATION_ERROR"],
    [422, { code: "PASSWORD_CONFIRMATION_MISMATCH" }, "VALIDATION_ERROR"],
    [422, { code: "PASSWORD_UNCHANGED" }, "VALIDATION_ERROR"],
    [422, { code: "IDEMPOTENCY_KEY_REQUIRED" }, "VALIDATION_ERROR"],
    [503, { error: { code: "untrusted_detail" } }, "UNAVAILABLE"]
  ] as const)("maps HTTP %i to safe %s", async (status, body, code) => {
    fetchMock.mockResolvedValue(json(body, status));
    await expect(createApiChangePasswordGateway({ baseUrl: "https://api.example", fetch: fetchMock }).change("token", input)).rejects.toEqual(expect.objectContaining({ code }));
  });

  it("fails closed for malformed success and response parse failures", async () => {
    fetchMock.mockResolvedValueOnce(json(null)).mockResolvedValueOnce(json("unexpected")).mockResolvedValueOnce(json({ changed: true, next: "unexpected" })).mockResolvedValueOnce(json({ changed: false, next: "profile" })).mockResolvedValueOnce(new Response("not-json", { status: 200 })).mockResolvedValueOnce(new Response("not-json", { status: 500 }));
    const gateway = createApiChangePasswordGateway({ baseUrl: "https://api.example", fetch: fetchMock });
    await expect(gateway.change("token", input)).rejects.toEqual(expect.objectContaining({ code: "UNAVAILABLE" }));
    await expect(gateway.change("token", input)).rejects.toEqual(expect.objectContaining({ code: "UNAVAILABLE" }));
    await expect(gateway.change("token", input)).rejects.toEqual(expect.objectContaining({ code: "UNAVAILABLE" }));
    await expect(gateway.change("token", input)).rejects.toEqual(expect.objectContaining({ code: "UNAVAILABLE" }));
    await expect(gateway.change("token", input)).rejects.toEqual(expect.objectContaining({ code: "UNAVAILABLE" }));
    await expect(gateway.change("token", input)).rejects.toEqual(expect.objectContaining({ code: "UNAVAILABLE" }));
  });

  it("distinguishes network and timeout failures without exposing transport details", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockRejectedValueOnce(new DOMException("abort", "AbortError"));
    const immediateTimer = ((callback: () => void) => { callback(); return 0 as unknown as ReturnType<typeof setTimeout>; }) as typeof setTimeout;
    await expect(createApiChangePasswordGateway({ baseUrl: "https://api.example", fetch: fetchMock }).change("token", input)).rejects.toEqual(expect.objectContaining({ code: "NETWORK_ERROR" }));
    await expect(createApiChangePasswordGateway({ baseUrl: "https://api.example", fetch: fetchMock, setTimeout: immediateTimer }).change("token", input)).rejects.toEqual(expect.objectContaining({ code: "TIMEOUT" }));
  });

  it("fails safely when no API URL is configured", async () => {
    await expect(createConfiguredChangePasswordGateway("").change("token", input)).rejects.toEqual(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    expect(createConfiguredChangePasswordGateway("https://api.example")).toEqual(expect.objectContaining({ change: expect.any(Function) }));
    expect(createConfiguredChangePasswordGateway()).toEqual(expect.objectContaining({ change: expect.any(Function) }));
    expect(createApiChangePasswordGateway({ baseUrl: "https://api.example" })).toEqual(expect.objectContaining({ change: expect.any(Function) }));
    expect(new ChangePasswordGatewayError("NETWORK_ERROR").message).toBe("NETWORK_ERROR");
  });
});
