export type AuthForm = { name?: string; email: string; password: string };

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

export function validateEmail(email: string): string | undefined {
  return /^\S+@\S+\.\S+$/.test(normalizeEmail(email)) ? undefined : "Nhập địa chỉ email hợp lệ.";
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Dùng ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.";
  }
  return undefined;
}

export function normalizeDisplayName(displayName: string): string {
  return displayName.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(displayName: unknown): string | undefined {
  return typeof displayName === "string" && normalizeDisplayName(displayName) ? undefined : "Nhập họ và tên.";
}

export function normalizePhone(phone: string): string | null {
  const normalized = phone.trim();
  if (!normalized) return null;
  if (/^0(?:3|5|7|8|9)\d{8}$/.test(normalized)) return `+84${normalized.slice(1)}`;
  return normalized.startsWith("+") ? `+${normalized.slice(1).replace(/[ ()-]/g, "")}` : normalized;
}

export function validatePhone(phone: unknown): string | undefined {
  if (typeof phone !== "string" || !normalizePhone(phone)) return undefined;
  return /^\+84(?:3|5|7|8|9)\d{8}$/.test(normalizePhone(phone)!) ? undefined : "Nhập số điện thoại theo định dạng +84901234567.";
}

export function validateAuthForm(form: AuthForm, requiresName = false): Partial<Record<keyof AuthForm, string>> {
  const errors: Partial<Record<keyof AuthForm, string>> = {};
  if (requiresName && !form.name?.trim()) errors.name = "Please enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
  if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  return errors;
}
