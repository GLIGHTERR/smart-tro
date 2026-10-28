import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getResponsiveToastDimensions, NEUTRAL_TOAST_WRAPPER_STYLE, SUCCESS_TOAST_DURATION_MS, SuccessToastAdapter } from "../SuccessToastAdapter";

jest.mock("@ant-design/react-native", () => ({ Toast: { show: jest.fn(() => 42), remove: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: jest.fn() }));

const toast = jest.requireMock("@ant-design/react-native").Toast;
const mockSafeAreaInsets = useSafeAreaInsets as jest.Mock;

describe("SuccessToastAdapter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSafeAreaInsets.mockReturnValue({ bottom: 0, left: 0, right: 0, top: 0 });
  });
  afterEach(() => jest.useRealTimers());

  it("consumes each event once, announces politely, and expires after the UC-05 duration", () => {
    const onConsume = jest.fn();
    const event = { id: "profile-save-1", message: "Đã cập nhật thông tin cá nhân." };
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<SuccessToastAdapter event={event} onConsume={onConsume} />); });
    expect(toast.show).toHaveBeenCalledWith(expect.objectContaining({ duration: 0, mask: false, position: "bottom", styles: { innerWrap: NEUTRAL_TOAST_WRAPPER_STYLE, textToast: NEUTRAL_TOAST_WRAPPER_STYLE } }));
    let content!: TestRenderer.ReactTestRenderer;
    act(() => { content = TestRenderer.create(toast.show.mock.calls[0][0].content); });
    const toastContent = content.root.findByProps({ role: "status" });
    expect(toastContent.props.accessibilityLiveRegion).toBe("polite");
    expect(toastContent.props.pointerEvents).toBe("none");
    expect(content.root.findByType(Text).props.children).toBe(event.message);
    expect(onConsume).toHaveBeenCalledWith(event.id);
    act(() => { renderer.update(<SuccessToastAdapter event={event} onConsume={onConsume} />); });
    expect(onConsume).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(SUCCESS_TOAST_DURATION_MS); });
    expect(toast.remove).toHaveBeenCalledWith(42);
    act(() => content.unmount());
  });

  it("does not replay a consumed event after navigation clears it, but accepts a later save event", () => {
    const onConsume = jest.fn();
    const first = { id: "profile-save-1", message: "Đã cập nhật thông tin cá nhân." };
    const second = { id: "profile-save-2", message: "Đã cập nhật thông tin cá nhân." };
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<SuccessToastAdapter event={first} onConsume={onConsume} />); });
    act(() => { renderer.update(<SuccessToastAdapter onConsume={onConsume} />); });
    act(() => { renderer.update(<SuccessToastAdapter event={first} onConsume={onConsume} />); });
    expect(onConsume).toHaveBeenCalledTimes(1);
    act(() => { renderer.update(<SuccessToastAdapter event={second} onConsume={onConsume} />); });
    expect(onConsume).toHaveBeenLastCalledWith(second.id);
    expect(toast.show).toHaveBeenCalledTimes(2);
  });

  it("uses a readable, safe-area-aware width for narrow and typical Web or Android viewports", () => {
    const event = { id: "profile-save-1", message: "Đã cập nhật thông tin cá nhân." };
    const onConsume = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => { renderer = TestRenderer.create(<SuccessToastAdapter event={event} onConsume={onConsume} />); });
    let content!: TestRenderer.ReactTestRenderer;
    act(() => { content = TestRenderer.create(toast.show.mock.calls[0][0].content); });
    expect(content.root.findByType(Text).props.children).toBe(event.message);
    expect(getResponsiveToastDimensions(320, { left: 12, right: 12 })).toEqual({ minWidth: 256, width: 256 });
    act(() => { content.unmount(); renderer.unmount(); });

    act(() => { renderer = TestRenderer.create(<SuccessToastAdapter event={{ ...event, id: "profile-save-2", message: "Một thông báo thành công dài vẫn được xuống dòng dễ đọc trên mọi kích thước màn hình." }} onConsume={onConsume} />); });
    act(() => { content = TestRenderer.create(toast.show.mock.calls[1][0].content); });
    expect(content.root.findByType(Text).props.children).toContain("dễ đọc");
    expect(getResponsiveToastDimensions(768, { left: 24, right: 24 })).toEqual({ minWidth: 280, width: 480 });
    act(() => { content.unmount(); renderer.unmount(); });
  });

  it("neutralizes Ant Design's text wrapper so the SmartTro content is the only decorated surface", () => {
    expect(NEUTRAL_TOAST_WRAPPER_STYLE).toMatchObject({
      backgroundColor: "transparent",
      borderRadius: 0,
      borderWidth: 0,
      elevation: 0,
      minWidth: 0,
      padding: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      shadowColor: "transparent",
      shadowOpacity: 0,
      shadowRadius: 0,
    });
  });
});
