import { emptyChangePasswordForm, isChangePasswordDirty, validateChangePassword } from "../changePasswordModel";

describe("change-password form rules", () => {
  it("starts with no secret values and is not dirty", () => {
    const form = emptyChangePasswordForm();
    expect(form).toEqual({ currentPassword: "", newPassword: "", confirmation: "" });
    expect(isChangePasswordDirty(form)).toBe(false);
  });

  it("reports every required and policy error without normalizing input", () => {
    expect(validateChangePassword({ currentPassword: "", newPassword: " abc ", confirmation: "different" })).toEqual({ currentPassword: "Nhập mật khẩu hiện tại.", newPassword: "Dùng ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.", confirmation: "Xác nhận mật khẩu mới không khớp." });
  });

  it("rejects a reused password and missing confirmation", () => {
    expect(validateChangePassword({ currentPassword: "Aa1!valid", newPassword: "Aa1!valid", confirmation: "" })).toEqual({ newPassword: "Mật khẩu mới phải khác mật khẩu hiện tại.", confirmation: "Xác nhận mật khẩu mới." });
  });

  it("accepts matching valid passwords and detects any dirty field", () => {
    const form = { currentPassword: "Aa1!current", newPassword: "Bb2@changed", confirmation: "Bb2@changed" };
    expect(validateChangePassword(form)).toEqual({});
    expect(isChangePasswordDirty({ ...form, currentPassword: "" })).toBe(true);
  });
});
