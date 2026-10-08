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
  it("permits an absent phone and validates supplied phone text only", () => {
    expect(normalizePhone("  ")).toBeNull();
    expect(normalizePhone(" 0901 234 567 ")).toBe("0901 234 567");
    expect(validatePhone("")).toBeUndefined();
    expect(validatePhone("+84 (901) 234-567")).toBeUndefined();
    expect(validatePhone("not-a-phone")).toBeDefined();
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
