import { createRuntimeAuthGateway } from "../runtimeGateway";

describe("runtime auth gateway", () => {
  const getDeviceId = jest.fn(async () => "device-1");

  it("uses the approved in-process fixture gateway when explicitly enabled", async () => {
    const gateway = createRuntimeAuthGateway(getDeviceId, true);

    await expect(gateway.requestOtp("fixture@example.test")).resolves.toMatchObject({ attemptId: "preview-1" });
    expect(getDeviceId).not.toHaveBeenCalled();
  });

  it("fails closed through the configured gateway when the fixture is disabled and no API is present", async () => {
    const gateway = createRuntimeAuthGateway(getDeviceId, false);

    await expect(gateway.requestOtp("fixture@example.test")).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
  });

  it("derives the gateway choice from the explicit build flag by default", async () => {
    const prior = process.env.EXPO_PUBLIC_AUTH_USE_MOCK;
    try {
      process.env.EXPO_PUBLIC_AUTH_USE_MOCK = "true";
      await expect(createRuntimeAuthGateway(getDeviceId).requestOtp("fixture@example.test")).resolves.toMatchObject({ attemptId: "preview-1" });
      process.env.EXPO_PUBLIC_AUTH_USE_MOCK = "false";
      await expect(createRuntimeAuthGateway(getDeviceId).requestOtp("fixture@example.test")).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    } finally {
      if (prior === undefined) delete process.env.EXPO_PUBLIC_AUTH_USE_MOCK;
      else process.env.EXPO_PUBLIC_AUTH_USE_MOCK = prior;
    }
  });
});
