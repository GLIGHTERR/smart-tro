import { createConfiguredAuthGateway, type AuthGateway } from "./gateway";
import { createMockAuthGateway } from "./mockGateway";

export function createRuntimeAuthGateway(getDeviceId: () => Promise<string>, useMock = process.env.EXPO_PUBLIC_AUTH_USE_MOCK === "true"): AuthGateway {
  return useMock ? createMockAuthGateway() : createConfiguredAuthGateway(getDeviceId);
}
