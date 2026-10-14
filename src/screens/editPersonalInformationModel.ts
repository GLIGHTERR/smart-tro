export type EditableProfile = { displayName: string; phone: string | null; email: string };

export const domesticPhonePattern = /^0\d{9}$/;

export function normalizeName(value: string) { return value.trim().replace(/\s+/gu, " "); }

export function domesticPhoneFromCanonical(phone: string | null) {
  if (!phone) return "";
  const match = /^\+84(\d{9})$/.exec(phone);
  return match ? `0${match[1]}` : "";
}

export function canonicalPhoneFromDomestic(phone: string) { return phone ? `+84${phone.slice(1)}` : null; }

export function validateEditableProfile(displayName: string, phone: string) {
  const name = normalizeName(displayName);
  return {
    name,
    nameError: !name ? "Họ và tên là bắt buộc." : Array.from(name).length > 160 ? "Họ và tên tối đa 160 ký tự." : undefined,
    phoneError: phone && !domesticPhonePattern.test(phone) ? "Nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0." : undefined,
  };
}

export function isDirty(original: EditableProfile, displayName: string, phone: string) {
  return normalizeName(displayName) !== normalizeName(original.displayName) || canonicalPhoneFromDomestic(phone) !== original.phone;
}
