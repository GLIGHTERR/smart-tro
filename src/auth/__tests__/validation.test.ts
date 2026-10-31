import { normalizeDisplayName, normalizeEmail, normalizePhone, validateAuthForm, validateDisplayName, validateEmail, validatePassword, validatePhone } from "../validation";

describe("validateAuthForm", () => {
  it("requires valid sign-in credentials", () => {
    expect(validateAuthForm({ email: "bad", password: "short" })).toEqual({ email: "Enter a valid email address.", password: "Use at least 8 characters." });
  });
  it("requires a name when the legacy registration form needs one", () => {
    expect(validateAuthForm({ email: "mai@example.com", password: "password1" }, true)).toEqual({ name: "Please enter your name." });
  });
  it("accepts a complete registration form", () => {
    expect(validateAuthForm({ name: "Mai", email: "mai@example.com", password: "password1" }, true)).toEqual({});
  });
});

describe("signup validation", () => {
  it("normalizes the required display name and permits one name", () => {
    expect(normalizeDisplayName("  Mai   An  ")).toBe("Mai An");
    expect(validateDisplayName(null)).toBeDefined();
    expect(validateDisplayName("  ")).toBeDefined();
    expect(validateDisplayName("Mai")).toBeUndefined();
  });
  it("permits absent, domestic Vietnamese, and canonical Vietnamese mobile inputs", () => {
    expect(normalizePhone("  ")).toBeNull();
    expect(normalizePhone(" +84 (901) 234-567 ")).toBe("+84901234567");
    expect(normalizePhone("0901234567")).toBe("+84901234567");
    expect(validatePhone("")).toBeUndefined();
    expect(validatePhone("+84 (901) 234-567")).toBeUndefined();
    expect(validatePhone("0901234567")).toBeUndefined();
  });
  it.each(["090123456", "09012345678", "0101234567", "0201234567", "not-a-phone", "---", "+8490123456", "+849012345678", "+84012345678", "+12025550123"]) ("rejects malformed or non-Vietnamese mobile input %p", (phone) => {
    expect(validatePhone(phone)).toBe("Nhập số điện thoại theo định dạng +84901234567.");
  });
  it("normalizes email and rejects empty or malformed email", () => {
    expect(normalizeEmail(" Mai@Example.COM ")).toBe("mai@example.com");
    expect(validateEmail("bad")).toBeDefined();
    expect(validateEmail("mai@example.com")).toBeUndefined();
  });
  it("requires all password rule categories", () => {
    expect(validatePassword("short")).toBeDefined();
    expect(validatePassword("alllower!1")).toBeDefined();
    expect(validatePassword("NoNumber!")).toBeDefined();
    expect(validatePassword("NoSymbol1")).toBeDefined();
    expect(validatePassword("NOLOWER1!")).toBeDefined();
    expect(validatePassword(`${"Aa1!".repeat(33)}`)).toBeDefined();
    expect(validatePassword("Strong!1")).toBeUndefined();
  });
});
