export type ActiveContract = {
  id: string;
  roomAndProperty: string;
  address: string;
  expiryDate: string;
};

export type HomeProfile = { displayName?: string | null; email: string };

export const homeDestinations = {
  contract: "UC-07 — Hợp đồng điện tử của tôi",
  messages: "UC-15 — Tin nhắn",
  account: "UC-04 — Tài khoản/Cá nhân",
  properties: "UC-10 — Danh sách phòng available",
  payment: "Thanh Toán",
  reports: "UC-18 — Danh sách báo cáo sự cố",
} as const;

export type HomeAction = keyof typeof homeDestinations;

export const homeActions: readonly { id: HomeAction; label: string; icon: HomeAction }[] = [
  { id: "contract", label: "Hợp đồng", icon: "contract" },
  { id: "messages", label: "Tin nhắn", icon: "messages" },
  { id: "account", label: "Tài khoản", icon: "account" },
  { id: "properties", label: "D.S.Trọ", icon: "properties" },
  { id: "payment", label: "T.Toán", icon: "payment" },
];

export function displayNameFor(profile: HomeProfile) {
  return profile.displayName?.trim() || profile.email;
}

export function sortActiveContracts(contracts: readonly ActiveContract[]) {
  return [...contracts].sort((left, right) => left.expiryDate.localeCompare(right.expiryDate) || left.id.localeCompare(right.id));
}

export function actionsFor(contracts: readonly ActiveContract[]) {
  return contracts.length ? [...homeActions, { id: "reports" as const, label: "Báo cáo", icon: "reports" as const }] : [...homeActions];
}
