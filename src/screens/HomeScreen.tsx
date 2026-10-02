import { LinearGradient } from "expo-linear-gradient";
import { IconOutline } from "@ant-design/icons-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/theme/tokens";
import { actionsFor, displayNameFor, homeDestinations, sortActiveContracts, type ActiveContract, type HomeProfile } from "./homeModel";

type HomePayload = { profile: HomeProfile; contracts: ActiveContract[] };
type LoadState = "loading" | "ready" | "error";

const reviewContracts: ActiveContract[] = [
  { id: "abcyz", roomAndProperty: "Phòng 102 - Trọ Xuân Hạ", address: "Xuân Thủy, Cầu Giấy, Hà Nội", expiryDate: "2025-03-30" },
  { id: "mno12", roomAndProperty: "Phòng 305 - Trọ Mùa Thu", address: "Dịch Vọng, Cầu Giấy, Hà Nội", expiryDate: "2025-05-15" },
  { id: "abc01", roomAndProperty: "Phòng 201 - Trọ Bình Minh", address: "Yên Hòa, Cầu Giấy, Hà Nội", expiryDate: "2025-05-15" },
];

function mockPayload(): HomePayload {
  const scenario = reviewScenario();
  const contracts = scenario === "none" ? [] : scenario === "multiple" ? reviewContracts : [reviewContracts[0]!];
  return { profile: { displayName: scenario === "email" ? "" : "Nguyễn Văn A", email: "nguyen.van.a.renter@example.com" }, contracts };
}

function reviewScenario() {
  if (Platform.OS !== "web" || process.env.EXPO_PUBLIC_HOME_REVIEW !== "true") return process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO;
  const scenario = new URLSearchParams(globalThis.location?.search ?? "").get("home");
  return scenario === "none" || scenario === "single" || scenario === "multiple" || scenario === "error" ? scenario : "single";
}

export function HomeScreen({ sessionKey, onNavigate }: { sessionKey: string; onNavigate: (destination: string) => void }) {
  const [state, setState] = useState<LoadState>("loading");
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [toast, setToast] = useState("");

  const load = (refresh = false) => {
    setState("loading");
    setTimeout(() => {
      if (reviewScenario() === "error") {
        setState("error");
        setToast(refresh ? "Không thể làm mới dữ liệu. Đang hiển thị dữ liệu gần nhất." : "Bạn đang ngoại tuyến. Vui lòng thử lại.");
        return;
      }
      setPayload(mockPayload());
      setState("ready");
    }, 220);
  };

  useEffect(() => {
    // A new authenticated session must never inherit the previous renter's card.
    setPayload(null);
    setToast("");
    load();
  }, [sessionKey]);

  const contracts = useMemo(() => sortActiveContracts(payload?.contracts ?? []), [payload]);
  const actions = actionsFor(contracts);
  const profile = payload?.profile;
  const { width } = useWindowDimensions();

  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}><LinearGradient colors={["#FF9800", "#FFB242", "#FFF2DB"]} locations={[0, 0.28, 0.62]} style={styles.page}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={state === "loading" && !!payload} tintColor="#A84300" />}>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Xin chào</Text>
        {profile ? <Text accessibilityLabel={displayNameFor(profile)} numberOfLines={1} style={styles.name}>{displayNameFor(profile)}</Text> : <View accessibilityLabel="Đang tải thông tin tài khoản" style={styles.nameSkeleton} />}
      </View>
      <View style={styles.contractRegion}>
        {state === "loading" && !payload ? <ContractSkeleton /> : null}
        {state === "error" && !payload ? <InlineRetry onRetry={() => load()} /> : null}
        {payload && contracts.length === 1 ? <ContractCard contract={contracts[0]!} /> : null}
        {payload && contracts.length > 1 ? <ContractCarousel contracts={contracts} width={width} /> : null}
      </View>
      <View style={styles.actions}>{actions.map((action) => <Pressable accessibilityLabel={`${action.label}: ${homeDestinations[action.id]}`} accessibilityRole="button" key={action.id} onPress={() => onNavigate(homeDestinations[action.id])} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}><IconOutline accessible={false} color="#2E2E2E" importantForAccessibility="no" name={action.icon} size={31} /><Text style={styles.actionLabel}>{action.label}</Text></Pressable>)}</View>
    </ScrollView>
    {toast ? <View accessibilityLiveRegion="polite" style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
  </LinearGradient></SafeAreaView>;
}

function ContractCarousel({ contracts, width }: { contracts: ActiveContract[]; width: number }) {
  const [active, setActive] = useState(0);
  return <><FlatList data={contracts} horizontal keyExtractor={(contract) => contract.id} onMomentumScrollEnd={(event) => setActive(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))} pagingEnabled renderItem={({ item }) => <View style={{ width }}><ContractCard contract={item} /></View>} showsHorizontalScrollIndicator={false} /><View accessibilityLabel={`${active + 1} trên ${contracts.length} hợp đồng`} style={styles.dots}>{contracts.map((contract, index) => <View key={contract.id} style={[styles.dot, index === active && styles.dotActive]} />)}</View></>;
}

function ContractCard({ contract }: { contract: ActiveContract }) {
  const expiry = new Date(`${contract.expiryDate}T00:00:00`).toLocaleDateString("en-GB");
  return <View accessibilityLabel={`${contract.roomAndProperty}, ${contract.address}, Hợp đồng #${contract.id} hết hạn ${expiry}`} style={styles.card}><Text numberOfLines={1} style={styles.room}>{contract.roomAndProperty}</Text><Text style={styles.address}>{contract.address}</Text><Text style={styles.contract}>Hợp đồng: #{contract.id} {expiry}</Text></View>;
}

function ContractSkeleton() { return <View accessibilityLabel="Đang tải hợp đồng" style={styles.skeleton}><ActivityIndicator color={colors.action} /><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, styles.skeletonShort]} /></View>; }
function InlineRetry({ onRetry }: { onRetry: () => void }) { return <View style={styles.retry}><Text style={styles.retryCopy}>Chưa thể tải tóm tắt hợp đồng.</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}><Text style={styles.retryLabel}>Thử lại</Text></Pressable></View>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: "#FF9800", flex: 1 }, page: { flex: 1 }, content: { flexGrow: 1, paddingBottom: 36 }, greeting: { minHeight: 180, paddingHorizontal: 41, paddingTop: 43 }, hello: { color: "#FFFFFF", fontFamily: "BeVietnamPro_400Regular", fontSize: 19 }, name: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 29, lineHeight: 40, marginTop: 2 }, nameSkeleton: { backgroundColor: "rgba(255,255,255,0.45)", borderRadius: 8, height: 36, marginTop: 8, width: "72%" }, contractRegion: { minHeight: 188 }, card: { backgroundColor: "#FFFFFF", borderRadius: 12, elevation: 4, marginHorizontal: 40, paddingHorizontal: 20, paddingVertical: 22, shadowColor: "#000000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.24, shadowRadius: 2 }, room: { color: "#161616", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 18, textAlign: "center" }, address: { color: "#161616", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, marginTop: 8 }, contract: { color: "#161616", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, marginTop: 3 }, skeleton: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: radius.md, gap: spacing.md, marginHorizontal: 40, padding: 28 }, skeletonLine: { backgroundColor: "#F2E5D3", borderRadius: 5, height: 14, width: "100%" }, skeletonShort: { width: "65%" }, retry: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: radius.md, marginHorizontal: 40, padding: 22 }, retryCopy: { color: colors.muted, fontFamily: "BeVietnamPro_400Regular", textAlign: "center" }, retryButton: { backgroundColor: "#FF9A05", borderRadius: 8, marginTop: 12, paddingHorizontal: 22, paddingVertical: 9 }, retryLabel: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold" }, dots: { flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 12 }, dot: { backgroundColor: "#E4BE82", borderRadius: 5, height: 7, width: 7 }, dotActive: { backgroundColor: "#A84300", width: 19 }, actions: { backgroundColor: "#FFFFFF", borderRadius: 20, elevation: 3, flexDirection: "row", flexWrap: "wrap", marginHorizontal: 40, paddingVertical: 18, shadowColor: "#000000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 2 }, action: { alignItems: "center", height: 76, justifyContent: "center", width: "33.333%" }, actionPressed: { opacity: 0.58 }, actionLabel: { color: "#202020", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, marginTop: 6 }, toast: { backgroundColor: "#2E2E2E", borderRadius: 9, bottom: 20, left: 20, padding: 12, position: "absolute", right: 20 }, toastText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_400Regular", fontSize: 13, textAlign: "center" },
});
