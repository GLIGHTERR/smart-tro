import React from "react";
import { ActivityIndicator as NativeActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

export function Provider({ children, ...props }: any) { return <View {...props}>{children}</View>; }
export function Button({ children, ...props }: any) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled: props.disabled }} {...props}><Text>{children}</Text></Pressable>; }
export function InputItem({ children, onChange, ...props }: any) { return <View><>{children}</><TextInput {...props} onChangeText={onChange} /></View>; }
export function Modal({ children, ...props }: any) { return props.visible ? <View {...props}><Text>{props.title}</Text>{children}</View> : null; }
export function ActivityIndicator(props: any) { return <NativeActivityIndicator {...props} />; }
export function NoticeBar({ children }: any) { return <View>{children}</View>; }
export const Toast = { show: jest.fn(() => 42), remove: jest.fn() };
