import React from "react";
import { FlatList, ScrollView, Text } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { ProfileGatewayError, type ProfileGateway } from "@/profile/gateway";
import { HomeScreen } from "../HomeScreen";

jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
const rental = (id: string, expiresAt: string) => ({ contractId: id, room: `Phong ${id}`, property: `Nha ${id}`, propertyAddress: { street: "1 Nguyen Hue", city: "HCM" }, expiresAt, signedAt: "2026-01-01T00:00:00.000Z" });
const payload = (rentals: ReturnType<typeof rental>[] = []) => ({ profile: { displayName: "Mai An", email: "mai@example.com", phone: null, avatar: null }, rentals });
const text = (root: ReactTestInstance) => root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join("|");
const gateway = (read: jest.Mock): ProfileGateway => ({ read });
const rendered: TestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  act(() => rendered.splice(0).forEach((view) => view.unmount()));
});

async function renderHome(element: React.ReactElement) {
  let view!: TestRenderer.ReactTestRenderer;
  await act(async () => { view = TestRenderer.create(element); });
  rendered.push(view);
  return view;
}

describe("HomeScreen", () => {
  it("renders no fake card or report action when the authenticated account has no rentals", async () => {
    const read = jest.fn().mockResolvedValue(payload()); let view!: TestRenderer.ReactTestRenderer;
    view = await renderHome(<HomeScreen gateway={gateway(read)} sessionKey="a" onNavigate={jest.fn()} />);
    expect(read).toHaveBeenCalledWith("a"); expect(text(view.root)).not.toContain("Báo cáo"); expect(view.root.findAllByProps({ testID: "contract-carousel" })).toHaveLength(0);
  });
  it("sorts real rentals by expiry then id and maps the source address", async () => {
    const read = jest.fn().mockResolvedValue(payload([rental("z", "2026-05-01"), rental("b", "2026-04-01"), rental("a", "2026-04-01")])); let view!: TestRenderer.ReactTestRenderer;
    view = await renderHome(<HomeScreen gateway={gateway(read)} sessionKey="a" onNavigate={jest.fn()} />);
    const carousel = view.root.findByType(FlatList); expect(carousel.props.data.map((item: { id: string }) => item.id)).toEqual(["a", "b", "z"]); expect(text(view.root)).toContain("1 Nguyen Hue, HCM"); expect(view.root.findByProps({ accessibilityLabel: "1 trên 3 hợp đồng" })).toBeTruthy();
    act(() => carousel.props.onScroll({ nativeEvent: { contentOffset: { x: 100 }, layoutMeasurement: { width: 100 } } })); expect(view.root.findByProps({ accessibilityLabel: "2 trên 3 hợp đồng" })).toBeTruthy();
  });
  it.each(["INVALID_SESSION", "PROFILE_INCOMPLETE", "PROFILE_UNAVAILABLE", "TIMEOUT", "NETWORK_ERROR"] as const)("keeps actions and exposes retry on first-load %s", async (code) => {
    const read = jest.fn().mockRejectedValue(new ProfileGatewayError(code)); let view!: TestRenderer.ReactTestRenderer;
    view = await renderHome(<HomeScreen gateway={gateway(read)} sessionKey="a" onNavigate={jest.fn()} />);
    expect(text(view.root)).toContain("Chưa thể tải tóm tắt hợp đồng."); expect(text(view.root)).not.toContain("Báo cáo"); expect(text(view.root)).toContain("Hợp đồng");
  });
  it("retains loaded data and uses a non-blocking toast when refresh fails", async () => {
    const read = jest.fn().mockResolvedValueOnce(payload([rental("a", "2026-01-01")])).mockRejectedValueOnce(new ProfileGatewayError("NETWORK_ERROR")); let view!: TestRenderer.ReactTestRenderer;
    view = await renderHome(<HomeScreen gateway={gateway(read)} sessionKey="a" onNavigate={jest.fn()} />);
    await act(async () => { view.root.findByType(ScrollView).props.refreshControl.props.onRefresh(); });
    expect(text(view.root)).toContain("Phong a - Nha a"); expect(text(view.root)).toContain("Không thể làm mới dữ liệu. Đang hiển thị dữ liệu gần nhất.");
  });
  it("clears stale renter data after a session switch", async () => {
    let resolve!: (value: ReturnType<typeof payload>) => void; const first = new Promise<ReturnType<typeof payload>>((done) => { resolve = done; }); const read = jest.fn().mockReturnValueOnce(first).mockResolvedValueOnce(payload()); let view!: TestRenderer.ReactTestRenderer;
    view = await renderHome(<HomeScreen gateway={gateway(read)} sessionKey="a" onNavigate={jest.fn()} />); await act(async () => { view.update(<HomeScreen gateway={gateway(read)} sessionKey="b" onNavigate={jest.fn()} />); }); await act(async () => { resolve(payload([rental("old", "2026-01-01")])); });
    expect(text(view.root)).not.toContain("Phong old"); expect(text(view.root)).not.toContain("Báo cáo");
  });
  it("uses fixtures only under explicit review mode", async () => {
    const oldReview = process.env.EXPO_PUBLIC_HOME_REVIEW; const oldScenario = process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO; process.env.EXPO_PUBLIC_HOME_REVIEW = "true"; process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO = "multiple"; const read = jest.fn(); let view!: TestRenderer.ReactTestRenderer;
    view = await renderHome(<HomeScreen gateway={gateway(read)} sessionKey="a" onNavigate={jest.fn()} />); expect(read).not.toHaveBeenCalled(); expect(view.root.findByProps({ accessibilityLabel: "1 trên 3 hợp đồng" })).toBeTruthy(); process.env.EXPO_PUBLIC_HOME_REVIEW = oldReview; process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO = oldScenario;
  });
});
