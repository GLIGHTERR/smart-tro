import { validateAuthForm } from "../validation";

describe("validateAuthForm", () => {
  it("requires valid sign-in credentials", () => {
    expect(validateAuthForm({ email: "bad", password: "short" })).toEqual({ email: "Enter a valid email address.", password: "Use at least 8 characters." });
  });
  it("accepts a complete registration form", () => {
    expect(validateAuthForm({ name: "Mai", email: "mai@example.com", password: "password1" }, true)).toEqual({});
  });
});
