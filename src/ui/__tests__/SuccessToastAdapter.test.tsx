import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { SUCCESS_TOAST_DURATION_MS, SuccessToastAdapter } from "../SuccessToastAdapter";

describe("SuccessToastAdapter", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("consumes each event once, announces politely, and expires after the UC-05 duration", () => {
    const onConsume = jest.fn();
    const event = { id: "profile-save-1", message: "Đã cập nhật thông tin cá nhân." };
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<SuccessToastAdapter event={event} onConsume={onConsume} />); });
    const toast = renderer.root.findByProps({ role: "status" });
    expect(toast.props.accessibilityLiveRegion).toBe("polite");
    expect(toast.props.pointerEvents).toBe("none");
    expect(renderer.root.findByType(Text).props.children).toBe(event.message);
    expect(onConsume).toHaveBeenCalledWith(event.id);
    act(() => { renderer.update(<SuccessToastAdapter event={event} onConsume={onConsume} />); });
    expect(onConsume).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(SUCCESS_TOAST_DURATION_MS); });
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);
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
  });
});
