import type { PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type FocusWithinFieldProps = PropsWithChildren<{ style: StyleProp<ViewStyle>; testID: string }>;

// Native keeps the existing explicit child focus state in AuthField.
export function FocusWithinField({ children, style, testID }: FocusWithinFieldProps) {
  return <View style={style} testID={testID}>{children}</View>;
}
