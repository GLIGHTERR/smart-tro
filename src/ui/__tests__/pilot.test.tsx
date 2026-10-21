import React from "react";
import { AccessibilityInfo, Platform, Pressable, TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { PilotAlert, PilotButton, PilotDialog, PilotField, PilotProvider, PilotToast, PILOT_TOAST_DURATION_MS } from "../pilot/renderer";

const mockViewNode = { querySelector: jest.fn() };

jest.mock("react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const native = jest.requireActual<typeof import("react-native")>("react-native");
  const View = React.forwardRef((props: any, ref) => {
    React.useImperativeHandle(ref, () => mockViewNode);
    return <native.View {...props} />;
  });
  View.displayName = "MockView";
  const Modal = ({ visible, children, ...props }: any) => visible ? <native.View {...props}>{children}</native.View> : null;
  const result = Object.defineProperties({}, Object.getOwnPropertyDescriptors(native));
  Object.defineProperty(result, "View", { configurable: true, value: View });
  Object.defineProperty(result, "Modal", { configurable: true, value: Modal });
  return result;
});

jest.mock("@ant-design/react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, TextInput, View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Provider: ({ children }: any) => <View>{children}</View>,
    Button: ({ children, ...props }: any) => <Pressable {...props}>{children}</Pressable>,
    InputItem: ({ onChange, children, type, ...props }: any) => <TextInput {...props} keyboardType={type} onChangeText={onChange} />,
    NoticeBar: ({ children }: any) => <View>{children}</View>,
    Modal: ({ visible, children, ...props }: any) => visible ? <View {...props}>{children}</View> : null,
    Toast: { show: jest.fn(() => 42), remove: jest.fn() },
  };
});

const toast = jest.requireMock("@ant-design/react-native").Toast;

describe("G1 UI pilot adapter", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => { jest.useRealTimers(); });

  it("passes enabled/disabled press and controlled field validation without discarding input", () => {
    const press = jest.fn();
    const change = jest.fn();
    let view!: TestRenderer.ReactTestRenderer;
    act(() => { view = TestRenderer.create(<PilotProvider><PilotButton testID="save_action" label="Save" onPress={press} /><PilotButton label="Busy" disabled onPress={press} /><PilotField testID="name_input" label="Name" value="An" onChange={change} keyboardType="email-address" error="Invalid" /><PilotAlert message="Failed" /></PilotProvider>); });
    const buttons = view.root.findAllByType(Pressable);
    expect(buttons[1]!.props.disabled).toBe(true);
    expect(buttons[0]!.props.testID).toBe("save_action");
    act(() => buttons[0]!.props.onPress());
    expect(press).toHaveBeenCalledTimes(1);
    const input = view.root.findByType(TextInput);
    expect(input.props.value).toBe("An");
    expect(input.props.accessibilityLabel).toBe("Name");
    expect(input.props.testID).toBe("name_input");
    expect(input.props.keyboardType).toBe("email-address");
    act(() => input.props.onChangeText("Anh"));
    expect(change).toHaveBeenCalledWith("Anh");
    expect(view.root.findByProps({ accessibilityRole: "alert" })).toBeTruthy();
    expect(view.root.findByProps({ accessibilityLiveRegion: "polite" })).toBeTruthy();
    act(() => { view.update(<PilotField label="Name" value="Anh" onChange={change} />); });
    expect(view.root.findByType(TextInput).props.value).toBe("Anh");
    expect(view.root.findAllByProps({ accessibilityLiveRegion: "polite" })).toHaveLength(0);
  });

  it("deduplicates and consumes one-shot events, survives clearing the caller and cancels old timers", () => {
    const consume = jest.fn();
    const first = { id: "save-1", message: "Saved" };
    const next = { id: "save-2", message: "Saved again" };
    let view!: TestRenderer.ReactTestRenderer;
    act(() => { view = TestRenderer.create(<PilotToast event={first} onConsume={consume} />); });
    expect(consume).toHaveBeenCalledWith("save-1");
    expect(toast.show).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith("Saved");
    expect(toast.show.mock.calls[0][0]).toMatchObject({ duration: 0, mask: false });
    let content!: TestRenderer.ReactTestRenderer;
    act(() => { content = TestRenderer.create(toast.show.mock.calls[0][0].content); });
    expect(content.root.findByProps({ role: "status" }).props.accessibilityLiveRegion).toBe("polite");
    act(() => content.unmount());
    act(() => { view.update(<PilotToast onConsume={consume} />); });
    act(() => { view.update(<PilotToast event={first} onConsume={consume} />); });
    expect(toast.show).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(PILOT_TOAST_DURATION_MS - 1); });
    expect(toast.remove).not.toHaveBeenCalled();
    act(() => { view.update(<PilotToast event={next} onConsume={consume} />); });
    expect(toast.remove).toHaveBeenCalledTimes(1);
    expect(toast.show).toHaveBeenCalledTimes(2);
    act(() => { jest.advanceTimersByTime(PILOT_TOAST_DURATION_MS); });
    expect(toast.remove).toHaveBeenCalledTimes(2);
    act(() => { view.unmount(); });
    expect(toast.remove).toHaveBeenCalledTimes(2);
  });

  it("uses the live region without a duplicate explicit announcement on web", () => {
    const platform = jest.replaceProperty(Platform, "OS", "web");
    const consume = jest.fn();
    let view!: TestRenderer.ReactTestRenderer;
    act(() => { view = TestRenderer.create(<PilotToast event={{ id: "web", message: "Saved" }} onConsume={consume} />); });
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    act(() => view.unmount());
    platform.restore();
  });

  it("uses the native Android Back callback and close action", () => {
    const close = jest.fn();
    let view!: TestRenderer.ReactTestRenderer;
    act(() => { view = TestRenderer.create(<PilotDialog visible title="Dialog" message="Message" closeTestID="close_dialog" onClose={close} />); });
    expect(view.root.findByProps({ role: "dialog" }).props.accessibilityLabel).toBe("Dialog");
    expect(view.root.findByProps({ animationType: "fade" }).props.transparent).toBe(true);
    expect(view.root.findByType(Pressable).props.testID).toBe("close_dialog");
    act(() => view.root.findByProps({ animationType: "fade" }).props.onRequestClose());
    expect(close).toHaveBeenCalledTimes(1);
    act(() => view.root.findByType(Pressable).props.onPress());
    expect(close).toHaveBeenCalledTimes(2);
    act(() => { view.update(<PilotDialog visible={false} title="Dialog" message="Message" onClose={close} />); });
    expect(view.root.findAllByProps({ role: "dialog" })).toHaveLength(0);
  });

  it("moves web focus into the dialog, traps Tab, closes on Escape and restores focus", () => {
    const platform = jest.replaceProperty(Platform, "OS", "web");
    const previousFocus = jest.fn();
    const focus = jest.fn();
    mockViewNode.querySelector.mockReturnValue({ focus });
    let handler!: (event: { key: string; preventDefault: () => void }) => void;
    const fakeDocument = {
      activeElement: { focus: previousFocus },
      addEventListener: jest.fn((_name, callback) => { handler = callback; }),
      removeEventListener: jest.fn(),
    };
    const originalDocument = global.document;
    Object.defineProperty(global, "document", { configurable: true, value: fakeDocument });
    const close = jest.fn();
    let view!: TestRenderer.ReactTestRenderer;
    act(() => {
      view = TestRenderer.create(<PilotDialog visible title="Dialog" message="Message" onClose={close} />);
    });
    expect(focus).toHaveBeenCalled();
    expect(view.root.findByProps({ role: "dialog" }).props.accessibilityViewIsModal).toBe(true);
    const preventDefault = jest.fn();
    act(() => handler({ key: "Tab", preventDefault }));
    expect(focus).toHaveBeenCalledTimes(2);
    act(() => handler({ key: "Escape", preventDefault }));
    expect(close).toHaveBeenCalledTimes(1);
    act(() => handler({ key: "ArrowDown", preventDefault }));
    expect(preventDefault).toHaveBeenCalledTimes(2);
    act(() => { view.update(<PilotDialog visible={false} title="Dialog" message="Message" onClose={close} />); });
    expect(view.root.findAllByProps({ role: "dialog" })).toHaveLength(0);
    expect(previousFocus).toHaveBeenCalledTimes(1);
    act(() => view.unmount());
    expect(fakeDocument.removeEventListener).toHaveBeenCalledWith("keydown", handler);
    Object.defineProperty(global, "document", { configurable: true, value: originalDocument });
    platform.restore();
  });
});
