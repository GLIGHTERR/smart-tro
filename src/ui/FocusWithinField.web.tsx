import type { PropsWithChildren } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

type FocusWithinFieldProps = PropsWithChildren<{ style: StyleProp<ViewStyle>; testID: string }>;
const focusWithinStyleId = "auth-field-focus-within";
const webDataSet = { dataSet: { focusWithin: "auth-field" } };

if (typeof document !== "undefined" && !document.getElementById(focusWithinStyleId)) {
  const stylesheet = document.createElement("style");
  stylesheet.id = focusWithinStyleId;
  stylesheet.textContent = '[data-focus-within="auth-field"]:focus-within { border-color: #000000; border-radius: 24px; border-width: 1px; } [data-focus-within="auth-field"] button:focus { outline: 0 solid transparent; }';
  document.head.append(stylesheet);
}

// dataSet is forwarded by React Native Web and lets CSS include descendant focus.
export function FocusWithinField({ children, style, testID }: FocusWithinFieldProps) {
  return <View {...(webDataSet as unknown as ViewProps)} style={style} testID={testID}>{children}</View>;
}
