import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import Svg from "react-native-svg";

import { HomeScreen } from "../HomeScreen";

jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));

function text(root: ReactTestInstance) {
  return root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join("|");
}

function press(root: ReactTestInstance, label: string) {
  const target = root.findAllByType(Pressable).find((node) => text(node) === label);
  if (!target) throw new Error(`Missing button ${label}`);
  act(() => target.props.onPress());
}

describe("HomeScreen", () => {
  const priorScenario = process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO;

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO = priorScenario;
  });

  it("keeps navigation available while loading, then renders the five-action empty state", () => {
    process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO = "none";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<HomeScreen onNavigate={jest.fn()} sessionKey="renter-a" />); });
    expect(renderer.root.findByProps({ accessibilityLabel: "Đang tải hợp đồng" })).toBeTruthy();
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Hợp đồng|Tin nhắn|Tài khoản|D.S.Trọ|T.Toán");
    expect(text(renderer.root)).not.toContain("Báo cáo");
    expect(text(renderer.root)).not.toContain("Làm mới");
    act(() => renderer.unmount());
  });

  it("renders a sorted contract carousel, accessible pagination, and every approved navigation mapping", () => {
    process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO = "multiple";
    const onNavigate = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<HomeScreen onNavigate={onNavigate} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(renderer.root.findByProps({ accessibilityLabel: "1 trên 3 hợp đồng" })).toBeTruthy();
    expect(text(renderer.root)).toContain("Báo cáo");
    expect(renderer.root.findAllByType(Svg)).toHaveLength(6);
    expect(renderer.root.findByProps({ accessibilityLabel: "Nguyễn Văn A" }).props.style).toMatchObject({ fontFamily: "BeVietnamPro_600SemiBold" });
    expect(renderer.root.findByProps({ children: "Phòng 102 - Trọ Xuân Hạ" }).props.style).toMatchObject({ fontFamily: "BeVietnamPro_600SemiBold" });
    expect(StyleSheet.flatten(renderer.root.findByProps({ children: "Hợp đồng" }).props.style)).toMatchObject({ fontFamily: "BeVietnamPro_400Regular" });
    expect(text(renderer.root)).not.toContain("Làm mới");
    press(renderer.root, "Hợp đồng");
    press(renderer.root, "Tin nhắn");
    press(renderer.root, "Tài khoản");
    press(renderer.root, "D.S.Trọ");
    press(renderer.root, "T.Toán");
    press(renderer.root, "Báo cáo");
    expect(onNavigate.mock.calls.map(([destination]) => destination)).toEqual([
      "UC-07 — Hợp đồng điện tử của tôi", "UC-15 — Tin nhắn", "UC-04 — Tài khoản/Cá nhân",
      "UC-10 — Danh sách phòng available", "Thanh Toán", "UC-18 — Danh sách báo cáo sự cố",
    ]);
    process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO = "none";
    act(() => { renderer.update(<HomeScreen onNavigate={onNavigate} sessionKey="renter-b" />); });
    expect(renderer.root.findByProps({ accessibilityLabel: "Đang tải hợp đồng" })).toBeTruthy();
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).not.toContain("Báo cáo");
    act(() => renderer.unmount());
  });

  it("shows inline retry and a non-blocking offline toast without replacing the shell", () => {
    process.env.EXPO_PUBLIC_HOME_REVIEW_SCENARIO = "error";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<HomeScreen onNavigate={jest.fn()} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Chưa thể tải tóm tắt hợp đồng.");
    expect(text(renderer.root)).toContain("Bạn đang ngoại tuyến. Vui lòng thử lại.");
    expect(text(renderer.root)).toContain("Hợp đồng|Tin nhắn|Tài khoản|D.S.Trọ|T.Toán");
    press(renderer.root, "Thử lại");
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Bạn đang ngoại tuyến. Vui lòng thử lại.");
    act(() => renderer.unmount());
  });
});
