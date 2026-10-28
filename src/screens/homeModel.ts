import type { OutlineGlyphMapType } from "@ant-design/icons-react-native";

export type ActiveContract = {
  id: string;
  roomAndProperty: string;
  address: string;
  expiryDate: string;
};

export type HomeProfile = { displayName?: string | null; email: string };

export function addressFor(address: Record<string, unknown>) {
  return Object.values(address).filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()).join(", ");
}

export const homeDestinations = {
  contract: "UC-07 — Hợp đồng điện tử của tôi",
  messages: "UC-15 — Tin nhắn",
  account: "UC-04 — Tài khoản/Cá nhân",
  properties: "UC-10 — Danh sách phòng available",
  payment: "Thanh Toán",
  reports: "UC-18 — Danh sách báo cáo sự cố",
} as const;

export type HomeAction = keyof typeof homeDestinations;
export type HomeActionIconName = Extract<OutlineGlyphMapType, "file-protect" | "message" | "user" | "bank" | "dollar-circle" | "alert">;

export const homeActions: readonly { id: HomeAction; label: string; icon: HomeActionIconName }[] = [
  { id: "contract", label: "Hợp đồng", icon: "file-protect" },
  { id: "messages", label: "Tin nhắn", icon: "message" },
  { id: "account", label: "Tài khoản", icon: "user" },
  { id: "properties", label: "D.S.Trọ", icon: "bank" },
  { id: "payment", label: "T.Toán", icon: "dollar-circle" },
];

export function displayNameFor(profile: HomeProfile) {
  return profile.displayName?.trim() || profile.email;
}

export function sortActiveContracts(contracts: readonly ActiveContract[]) {
  return [...contracts].sort((left, right) => left.expiryDate.localeCompare(right.expiryDate) || left.id.localeCompare(right.id));
}

export function actionsFor(contracts: readonly ActiveContract[]) {
  return contracts.length ? [...homeActions, { id: "reports" as const, label: "Báo cáo", icon: "alert" as const }] : [...homeActions];
}

export function carouselIndex(offset: number, pageWidth: number, itemCount: number) {
  if (pageWidth <= 0 || itemCount <= 0) return 0;
  return Math.min(itemCount - 1, Math.max(0, Math.round(offset / pageWidth)));
}
