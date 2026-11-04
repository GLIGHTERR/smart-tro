import { validatePassword } from "@/auth/validation";

export type ChangePasswordForm = { currentPassword: string; newPassword: string; confirmation: string };
export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordForm, string>>;

export const emptyChangePasswordForm = (): ChangePasswordForm => ({ currentPassword: "", newPassword: "", confirmation: "" });

export function validateChangePassword(form: ChangePasswordForm): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};
  if (!form.currentPassword) errors.currentPassword = "Nhập mật khẩu hiện tại.";
  const passwordError = validatePassword(form.newPassword);
  if (passwordError) errors.newPassword = form.newPassword ? passwordError : "Nhập mật khẩu mới.";
  if (!form.confirmation) errors.confirmation = "Xác nhận mật khẩu mới.";
  else if (form.confirmation !== form.newPassword) errors.confirmation = "Xác nhận mật khẩu mới không khớp.";
  if (form.currentPassword && form.currentPassword === form.newPassword) errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại.";
  return errors;
}

export function visibleChangePasswordErrors(form: ChangePasswordForm, touched: Partial<Record<keyof ChangePasswordForm, boolean>>): ChangePasswordErrors {
  const errors = validateChangePassword(form);
  return Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field as keyof ChangePasswordForm])) as ChangePasswordErrors;
}

export function isChangePasswordDirty(form: ChangePasswordForm) { return Boolean(form.currentPassword || form.newPassword || form.confirmation); }
