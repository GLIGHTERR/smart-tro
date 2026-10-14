import { canonicalPhoneFromDomestic, domesticPhoneFromCanonical, isDirty, normalizeName, validateEditableProfile } from "../editPersonalInformationModel";

describe("edit personal information model", () => {
  const profile = { displayName: "Nguyễn  Văn A", phone: "+84901234567", email: "mai@example.com" };

  it("normalizes Unicode whitespace and enforces the normalized 160-character boundary", () => {
    expect(normalizeName("  Nguyễn\t Văn\nA  ")).toBe("Nguyễn Văn A");
    expect(validateEditableProfile(" ", "").nameError).toBe("Họ và tên là bắt buộc.");
    expect(validateEditableProfile("a".repeat(160), "").nameError).toBeUndefined();
    expect(validateEditableProfile("a".repeat(161), "").nameError).toBe("Họ và tên tối đa 160 ký tự.");
  });

  it("round trips optional Vietnamese domestic phones at the mock boundary", () => {
    expect(domesticPhoneFromCanonical("+84901234567")).toBe("0901234567");
    expect(domesticPhoneFromCanonical(null)).toBe("");
    expect(domesticPhoneFromCanonical("0901234567")).toBe("");
    expect(canonicalPhoneFromDomestic("0901234567")).toBe("+84901234567");
    expect(canonicalPhoneFromDomestic("")).toBeNull();
    expect(validateEditableProfile("Mai", "0912345678").phoneError).toBeUndefined();
    expect(validateEditableProfile("Mai", "09123").phoneError).toBe("Nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0.");
  });

  it("returns clean after a full revert, including whitespace-only name changes", () => {
    expect(isDirty(profile, " Nguyễn Văn A ", "0901234567")).toBe(false);
    expect(isDirty(profile, "Mai An", "0901234567")).toBe(true);
    expect(isDirty(profile, "Nguyễn Văn A", "")).toBe(true);
  });
});
