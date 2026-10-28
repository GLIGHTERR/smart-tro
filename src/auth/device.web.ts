const deviceKey = "smarttro.device-id";

let memoryDeviceId: string | null = null;

function createDeviceId(): string {
  return `smarttro-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function getDeviceId(): Promise<string> {
  try {
    const existing = window.localStorage.getItem(deviceKey);
    if (existing) return existing;

    const deviceId = createDeviceId();
    window.localStorage.setItem(deviceKey, deviceId);
    return deviceId;
  } catch {
    memoryDeviceId ??= createDeviceId();
    return memoryDeviceId;
  }
}
