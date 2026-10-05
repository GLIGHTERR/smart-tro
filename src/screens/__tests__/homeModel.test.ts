import { actionsFor, carouselIndex, displayNameFor, homeActions, homeDestinations, sortActiveContracts } from "../homeModel";

describe("Home model", () => {
  it("uses a non-empty display name and otherwise falls back to the account email", () => {
    expect(displayNameFor({ displayName: "  Mai An  ", email: "mai@example.com" })).toBe("Mai An");
    expect(displayNameFor({ displayName: "  ", email: "mai@example.com" })).toBe("mai@example.com");
    expect(displayNameFor({ email: "mai@example.com" })).toBe("mai@example.com");
  });

  it("sorts contracts by nearest expiry then a stable contract id", () => {
    expect(sortActiveContracts([
      { id: "z", roomAndProperty: "Z", address: "", expiryDate: "2026-05-01" },
      { id: "b", roomAndProperty: "B", address: "", expiryDate: "2026-04-01" },
      { id: "a", roomAndProperty: "A", address: "", expiryDate: "2026-04-01" },
    ]).map(({ id }) => id)).toEqual(["a", "b", "z"]);
  });

  it("shows reports only while the renter has an active contract", () => {
    expect(actionsFor([])).toEqual(homeActions);
    expect(actionsFor([{ id: "c", roomAndProperty: "", address: "", expiryDate: "2026-01-01" }]).map(({ id }) => id)).toEqual(["contract", "messages", "account", "properties", "payment", "reports"]);
  });

  it("maps every Home action to its approved Ant Design outline glyph", () => {
    expect(actionsFor([{ id: "c", roomAndProperty: "", address: "", expiryDate: "2026-01-01" }]).map(({ icon }) => icon)).toEqual(["file-protect", "message", "user", "bank", "dollar-circle", "alert"]);
  });

  it("keeps every Home navigation stub mapped to its approved destination", () => {
    expect(homeDestinations).toEqual({
      contract: "UC-07 — Hợp đồng điện tử của tôi",
      messages: "UC-15 — Tin nhắn",
      account: "UC-04 — Tài khoản/Cá nhân",
      properties: "UC-10 — Danh sách phòng available",
      payment: "Thanh Toán",
      reports: "UC-18 — Danh sách báo cáo sự cố",
    });
  });

  it("maps scroll offsets to a valid carousel page", () => {
    expect(carouselIndex(0, 1280, 3)).toBe(0);
    expect(carouselIndex(1280, 1280, 3)).toBe(1);
    expect(carouselIndex(-20, 1280, 3)).toBe(0);
    expect(carouselIndex(9999, 1280, 3)).toBe(2);
    expect(carouselIndex(1280, 0, 3)).toBe(0);
    expect(carouselIndex(1280, 1280, 0)).toBe(0);
  });
});
