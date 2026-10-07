import { createApiProfileGateway, createConfiguredProfileGateway, ProfileGatewayError } from "../gateway";

const fetchMock = jest.fn();
const payload = { profile: { displayName: "Test renter", email: "test@example.com", phone: null, avatar: null }, rentals: [{ contractId: "contract-1", room: "Room 1", property: "Property 1", expiresAt: "2026-12-31", signedAt: "2024-01-01T00:00:00.000Z" }] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("profile gateway", () => {
  beforeEach(() => fetchMock.mockReset());
  it("uses the token subject endpoint and accepts zero, one, and many valid rentals", async () => {
    const gateway = createApiProfileGateway({ baseUrl: "https://api.example", fetch: fetchMock });
    fetchMock.mockResolvedValueOnce(json({ ...payload, rentals: [] })).mockResolvedValueOnce(json(payload)).mockResolvedValueOnce(json({ ...payload, rentals: [payload.rentals[0], { ...payload.rentals[0], contractId: "contract-2", signedAt: "2024-02-01T00:00:00.000Z" }] }));
    await expect(gateway.read("access-token")).resolves.toMatchObject({ rentals: [] });
    await expect(gateway.read("access-token")).resolves.toMatchObject({ rentals: [expect.any(Object)] });
    await expect(gateway.read("access-token")).resolves.toMatchObject({ rentals: [expect.any(Object), expect.any(Object)] });
    expect(fetchMock).toHaveBeenCalledWith("https://api.example/profile", expect.objectContaining({ headers: { Accept: "application/json", Authorization: "Bearer access-token" } }));
  });
  it.each([[401, { error: { code: "INVALID_SESSION" } }, "INVALID_SESSION"], [409, { error: { code: "PROFILE_INCOMPLETE" } }, "PROFILE_INCOMPLETE"], [503, { error: { code: "PROFILE_UNAVAILABLE" } }, "PROFILE_UNAVAILABLE"], [500, {}, "PROFILE_UNAVAILABLE"], [500, null, "PROFILE_UNAVAILABLE"]] as const)("maps HTTP %i safely", async (status, body, code) => {
    fetchMock.mockResolvedValue(json(body, status));
    await expect(createApiProfileGateway({ baseUrl: "https://api.example", fetch: fetchMock }).read("token")).rejects.toEqual(expect.objectContaining({ code }));
  });
  it("fails closed for malformed, partial, open-ended, and invalid-JSON successes", async () => {
    fetchMock.mockResolvedValueOnce(json({ profile: payload.profile, rentals: [{ ...payload.rentals[0], expiresAt: null }] })).mockResolvedValueOnce(json({ profile: { ...payload.profile, email: "" }, rentals: [] })).mockResolvedValueOnce(new Response("not json", { status: 200 }));
    const gateway = createApiProfileGateway({ baseUrl: "https://api.example", fetch: fetchMock });
    await expect(gateway.read("token")).rejects.toEqual(expect.objectContaining({ code: "PROFILE_UNAVAILABLE" }));
    await expect(gateway.read("token")).rejects.toEqual(expect.objectContaining({ code: "PROFILE_UNAVAILABLE" }));
    await expect(gateway.read("token")).rejects.toEqual(expect.objectContaining({ code: "PROFILE_UNAVAILABLE" }));
  });
  it("rejects every incomplete object shape without exposing it to the screen", async () => {
    const invalid = [null, {}, { profile: null, rentals: [] }, { profile: payload.profile, rentals: null }, { profile: { ...payload.profile, phone: 7 }, rentals: [] }, { profile: { ...payload.profile, avatar: 7 }, rentals: [] }, { profile: payload.profile, rentals: [null] }, { profile: payload.profile, rentals: [{ ...payload.rentals[0], contractId: "" }] }, { profile: payload.profile, rentals: [{ ...payload.rentals[0], expiresAt: "2026-02-30" }] }, { profile: payload.profile, rentals: [{ ...payload.rentals[0], signedAt: "not-a-date" }] }];
    invalid.forEach((body) => fetchMock.mockResolvedValueOnce(json(body)));
    const gateway = createApiProfileGateway({ baseUrl: "https://api.example", fetch: fetchMock });
    for (let index = 0; index < invalid.length; index += 1) await expect(gateway.read("token")).rejects.toEqual(expect.objectContaining({ code: "PROFILE_UNAVAILABLE" }));
  });
  it("distinguishes offline and timeout failures and fails when unconfigured", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockRejectedValueOnce(new DOMException("abort", "AbortError"));
    const timeoutTimer = ((callback: () => void) => { callback(); return 0 as unknown as ReturnType<typeof setTimeout>; }) as typeof setTimeout;
    await expect(createApiProfileGateway({ baseUrl: "https://api.example", fetch: fetchMock }).read("token")).rejects.toEqual(expect.objectContaining({ code: "NETWORK_ERROR" }));
    await expect(createApiProfileGateway({ baseUrl: "https://api.example", fetch: fetchMock, setTimeout: timeoutTimer }).read("token")).rejects.toEqual(expect.objectContaining({ code: "TIMEOUT" }));
    await expect(createConfiguredProfileGateway("").read("token")).rejects.toEqual(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    expect(createConfiguredProfileGateway("https://api.example")).toEqual(expect.objectContaining({ read: expect.any(Function) }));
    expect(new ProfileGatewayError("NETWORK_ERROR").message).toBe("NETWORK_ERROR");
  });
});
