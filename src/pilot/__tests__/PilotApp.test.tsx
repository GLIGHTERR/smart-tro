import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { PilotAlert, PilotButton, PilotDialog, PilotField, PilotToast } from "@/ui";
import PilotApp, { PilotHome } from "../PilotApp";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({ NavigationContainer: ({ children }: any) => children }));
jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ component: Component }: any) => <Component navigation={{ navigate: mockNavigate, goBack: mockGoBack }} />,
  }),
}));
jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaProvider: ({ children }: any) => <View>{children}</View>, SafeAreaView: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/ui", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text, View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    PilotProvider: ({ children }: any) => <View>{children}</View>,
    PilotButton: ({ label }: any) => <Text>{label}</Text>,
    PilotField: () => null,
    PilotAlert: ({ message }: any) => <Text>{message}</Text>,
    PilotDialog: () => null,
    PilotToast: () => null,
  };
});

it("keeps validation, persistent alerts, dialog and toast-navigation as separate contracts", () => {
  let view!: TestRenderer.ReactTestRenderer;
  act(() => { view = TestRenderer.create(<PilotApp />); });
  const button = (label: string) => view.root.findAllByType(PilotButton).find((item) => item.props.label === label)!;
  expect(button("Disabled").props.disabled).toBe(true);
  expect(view.root.findAllByType(PilotAlert)).toHaveLength(0);
  act(() => button("Validate").props.onPress());
  expect(view.root.findByType(PilotField).props.error).toBe("Name is required");
  expect(view.root.findAllByType(PilotAlert)).toHaveLength(0);
  act(() => view.root.findByType(PilotField).props.onChange("  "));
  expect(view.root.findByType(PilotField).props.error).toBe("Name is required");
  act(() => view.root.findByType(PilotField).props.onChange("Anh"));
  expect(view.root.findByType(PilotField).props.error).toBeUndefined();
  act(() => button("Show persistent alert").props.onPress());
  expect(view.root.findByType(PilotAlert).props.message).toContain("service is temporarily unavailable");
  act(() => button("Dismiss persistent alert").props.onPress());
  expect(view.root.findAllByType(PilotAlert)).toHaveLength(0);
  act(() => button("Open dialog").props.onPress());
  expect(view.root.findByType(PilotDialog).props.visible).toBe(true);
  act(() => view.root.findByType(PilotDialog).props.onClose());
  expect(view.root.findByType(PilotDialog).props.visible).toBe(false);
  act(() => button("Show toast").props.onPress());
  expect(view.root.findByType(PilotToast).props.event.message).toBe("Saved");
  act(() => button("Show toast and navigate").props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith("Next");
  expect(view.root.findByType(PilotToast).props.event.message).toBe("Saved while navigating");
  expect(view.root.findByType(PilotField).props.value).toBe("Anh");
  act(() => button("Go back").props.onPress());
  expect(mockGoBack).toHaveBeenCalledTimes(1);
  const firstId = view.root.findByType(PilotToast).props.event.id;
  act(() => button("Show toast").props.onPress());
  const secondId = view.root.findByType(PilotToast).props.event.id;
  expect(secondId).not.toBe(firstId);
  act(() => view.root.findByType(PilotToast).props.onConsume(firstId));
  expect(view.root.findByType(PilotToast).props.event.id).toBe(secondId);
  act(() => view.root.findByType(PilotToast).props.onConsume(secondId));
  expect(view.root.findByType(PilotToast).props.event).toBeUndefined();
  act(() => button("Show long toast").props.onPress());
  expect(view.root.findByType(PilotToast).props.event.message.length).toBeGreaterThan(200);
  act(() => button("Disabled").props.onPress());
});

it("rejects a home screen mounted without the toast provider", () => {
  expect(() => act(() => { TestRenderer.create(<PilotHome navigation={{ navigate: mockNavigate } as any} route={{} as any} />); })).toThrow("Pilot toast provider is required");
});
