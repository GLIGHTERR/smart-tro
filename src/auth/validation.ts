export type AuthForm = { name?: string; email: string; password: string };

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

export function validateEmail(email: string): string | undefined {
  return /^\S+@\S+\.\S+$/.test(normalizeEmail(email)) ? undefined : "Nhập địa chỉ email hợp lệ.";
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Dùng ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.";
  }
  return undefined;
}

export function validateAuthForm(form: AuthForm, requiresName = false): Partial<Record<keyof AuthForm, string>> {
  const errors: Partial<Record<keyof AuthForm, string>> = {};
  if (requiresName && !form.name?.trim()) errors.name = "Please enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
  if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  return errors;
}
