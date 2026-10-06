import { IconOutline } from "@ant-design/icons-react-native";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius } from "@/theme/tokens";
import { accountReviewScenario, maskEmail, maskPhone, sortActiveRentals, type AccountProfile, type ActiveRental } from "./accountModel";

type AccountState = "loading" | "ready" | "error" | "session";
type AccountPayload = { profile: AccountProfile; rentals: ActiveRental[] };

const reviewRentals: ActiveRental[] = [
  { contractId: "contract-b", room: "Phòng 305", property: "Nhà trọ Mùa Thu", expiresAt: "2026-12-31", signedAt: "2024-04-02" },
  { contractId: "contract-a", room: "Phòng 102", property: "Nhà trọ Bình Minh", expiresAt: "2026-10-15", signedAt: "2024-04-02" },
  { contractId: "contract-c", room: "Phòng 201", property: "Nhà trọ Xuân Hạ", expiresAt: "2027-01-20", signedAt: "2024-08-10" },
];

function mockPayload(): AccountPayload {
  const scenario = accountReviewScenario();
  const rentals = scenario === "zero" ? [] : scenario === "multiple" ? reviewRentals : [reviewRentals[0]!];
  return { profile: { displayName: "Nguyễn Văn A", email: "nguyen.van.a.renter@example.com", phone: "0901234567", avatar: null }, rentals };
}

export function AccountScreen({ sessionKey, onBack, onEditProfile, onChangePassword, onSignOut }: { sessionKey: string; onBack: () => void; onEditProfile: () => void; onChangePassword: () => void; onSignOut: () => void }) {
  const [state, setState] = useState<AccountState>("loading");
  const [payload, setPayload] = useState<AccountPayload | null>(null);
  const scenario = accountReviewScenario();
  const load = useCallback(() => {
    setPayload(null);
    setState("loading");
    if (scenario === "loading") return;
    setTimeout(() => {
      if (scenario === "error" || scenario === "timeout") return setState("error");
      if (scenario === "session") return setState("session");
      setPayload(mockPayload());
      setState("ready");
    }, 220);
  }, [scenario]);

  useEffect(() => { load(); }, [sessionKey, load]);
  const rentals = useMemo(() => sortActiveRentals(payload?.rentals ?? []), [payload]);
  const { width } = useWindowDimensions();

  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><HeaderButton accessibilityLabel="Quay lại" icon="left" onPress={onBack} /><Text accessibilityRole="header" style={styles.title}>Tài khoản</Text><HeaderButton accessibilityLabel="Chỉnh sửa thông tin cá nhân" icon="edit" onPress={onEditProfile} /></View>
    <View accessibilityRole="tablist" style={styles.tabs}><Text accessibilityRole="tab" accessibilityState={{ selected: true }} style={styles.activeTab}>Cá nhân</Text><Text accessibilityRole="tab" accessibilityState={{ selected: false }} style={styles.tab}>Chữ ký</Text></View>
    {state === "loading" ? <LoadingCard /> : null}
    {state === "error" ? <ErrorState timeout={scenario === "timeout"} onRetry={load} /> : null}
    {state === "session" ? <SessionState onSignOut={onSignOut} /> : null}
    {state === "ready" && payload ? <><ProfileCard profile={payload.profile} />{rentals.length ? <RentalRegion rentals={rentals} width={width} /> : null}<View style={styles.actions}><Action label="Đổi mật khẩu" icon="lock" onPress={onChangePassword} /><Action label="Đăng xuất" icon="logout" onPress={onSignOut} danger /></View></> : null}
  </ScrollView></SafeAreaView>;
}

function ProfileCard({ profile }: { profile: AccountProfile }) {
  const [avatarFailed, setAvatarFailed] = useState(!profile.avatar?.trim());
  return <View style={styles.profileCard}><Avatar source={avatarFailed ? null : profile.avatar} onError={() => setAvatarFailed(true)} /><View style={styles.profileText}><Text style={styles.name}>{profile.displayName}</Text><Text accessibilityLabel={`Số điện thoại ${maskPhone(profile.phone)}`} style={styles.contact}>{maskPhone(profile.phone)}</Text><Text accessibilityLabel={`Email ${maskEmail(profile.email)}`} style={styles.contact}>{maskEmail(profile.email)}</Text></View></View>;
}

function Avatar({ source, onError }: { source: string | null; onError: () => void }) {
  if (!source) return <View accessibilityLabel="Ảnh đại diện tài khoản mặc định" style={styles.avatar}><IconOutline accessible={false} importantForAccessibility="no" color="#A84300" name="user" size={34} /></View>;
  return <Image accessibilityLabel="Ảnh đại diện tài khoản" onError={onError} source={{ uri: source }} style={styles.avatar} />;
}

function RentalRegion({ rentals, width }: { rentals: ActiveRental[]; width: number }) {
  const [page, setPage] = useState(0);
  if (rentals.length === 1) return <View style={styles.rentals}><Text style={styles.sectionTitle}>Đang thuê · 1</Text><RentalCard rental={rentals[0]!} /></View>;
  const onScroll = (event: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => setPage(Math.max(0, Math.min(rentals.length - 1, Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))));
  return <View style={styles.rentals}><Text accessibilityLabel={`Đang thuê ${rentals.length} hợp đồng`} style={styles.sectionTitle}>Đang thuê · {rentals.length}</Text><FlatList data={rentals} horizontal keyExtractor={(rental) => rental.contractId} onMomentumScrollEnd={onScroll} onScroll={onScroll} pagingEnabled renderItem={({ item }) => <View style={{ width }}><RentalCard rental={item} /></View>} scrollEventThrottle={16} showsHorizontalScrollIndicator={false} testID="account-rental-carousel" /><Text accessibilityLabel={`Hợp đồng ${page + 1} trên ${rentals.length}`} style={styles.indicator}>{page + 1} / {rentals.length}</Text></View>;
}

function RentalCard({ rental }: { rental: ActiveRental }) { return <View style={styles.rentalCard}><RentalValue label="Phòng" value={rental.room} /><RentalValue label="Nhà trọ" value={rental.property} /><RentalValue label="Hết hạn" value={new Date(`${rental.expiresAt}T00:00:00`).toLocaleDateString("vi-VN")} /></View>; }
function RentalValue({ label, value }: { label: string; value: string }) { return <View style={styles.rentalRow}><Text style={styles.rentalLabel}>{label}</Text><Text style={styles.rentalValue}>{value}</Text></View>; }
function LoadingCard() { return <View accessibilityLabel="Đang tải thông tin tài khoản" style={styles.stateCard}><ActivityIndicator color={colors.action} /><Text style={styles.stateText}>Đang tải thông tin tài khoản</Text></View>; }
function ErrorState({ timeout, onRetry }: { timeout: boolean; onRetry: () => void }) { return <View accessibilityRole="alert" style={styles.stateCard}><Text style={styles.stateText}>{timeout ? "Kết nối mất nhiều thời gian hơn dự kiến." : "Chưa thể tải thông tin tài khoản."}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable></View>; }
function SessionState({ onSignOut }: { onSignOut: () => void }) { return <View accessibilityRole="alert" style={styles.stateCard}><Text style={styles.stateText}>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</Text><Pressable accessibilityRole="button" onPress={onSignOut} style={styles.retry}><Text style={styles.retryText}>Đăng nhập lại</Text></Pressable></View>; }
function HeaderButton({ accessibilityLabel, icon, onPress }: { accessibilityLabel: string; icon: ComponentProps<typeof IconOutline>["name"]; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}><IconOutline accessible={false} importantForAccessibility="no" color="#A84300" name={icon} size={24} /></Pressable>; }
function Action({ label, icon, onPress, danger = false }: { label: string; icon: ComponentProps<typeof IconOutline>["name"]; onPress: () => void; danger?: boolean }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}><IconOutline accessible={false} importantForAccessibility="no" color={danger ? "#B33A3A" : "#A84300"} name={icon} size={21} /><Text style={[styles.actionText, danger && styles.danger]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: "#FFF2DB", flex: 1 }, content: { flexGrow: 1, paddingBottom: 40 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16 }, headerButton: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 }, headerButtonPressed: { backgroundColor: "#F3DEC0", opacity: 0.75 }, title: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 28 }, tabs: { borderBottomColor: "#E6CDA8", borderBottomWidth: 1, flexDirection: "row", gap: 28, marginHorizontal: 24, marginTop: 22 }, tab: { color: "#856D51", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, paddingBottom: 12 }, activeTab: { borderBottomColor: "#A84300", borderBottomWidth: 3, color: "#A84300", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 16, paddingBottom: 9 }, profileCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: radius.md, flexDirection: "row", marginHorizontal: 24, marginTop: 24, padding: 20 }, avatar: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#F0DDBF", borderRadius: 42, borderWidth: 1, height: 84, justifyContent: "center", overflow: "hidden", width: 84 }, profileText: { flex: 1, marginLeft: 16 }, name: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 18 }, contact: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 14, marginTop: 7 }, rentals: { marginTop: 26 }, sectionTitle: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 18, marginBottom: 12, marginHorizontal: 24 }, rentalCard: { backgroundColor: "#FFFFFF", borderRadius: radius.md, marginHorizontal: 24, minHeight: 142, padding: 18 }, rentalRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 5 }, rentalLabel: { color: "#806C57", fontFamily: "BeVietnamPro_400Regular", fontSize: 14 }, rentalValue: { color: "#2E2E2E", flexShrink: 1, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14, textAlign: "right" }, indicator: { color: "#806C57", fontFamily: "BeVietnamPro_400Regular", fontSize: 13, marginTop: 10, textAlign: "center" }, actions: { backgroundColor: "#FFFFFF", borderRadius: radius.md, marginHorizontal: 24, marginTop: 26 }, action: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 52, paddingHorizontal: 18 }, actionText: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 15 }, danger: { color: "#B33A3A" }, stateCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: radius.md, gap: 14, margin: 24, padding: 28 }, stateText: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, textAlign: "center" }, retry: { backgroundColor: "#A84300", borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 }, retryText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold" },
});
