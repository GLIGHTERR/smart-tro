import * as SecureStore from "expo-secure-store";

const deviceKey = "smarttro.device-id";

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(deviceKey);
  if (existing) return existing;
  const deviceId = `smarttro-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(deviceKey, deviceId);
  return deviceId;
}
