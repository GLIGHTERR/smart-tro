describe("web device id", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("persists a stable non-secret id in localStorage", async () => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value)
      }
    });
    jest.spyOn(Date, "now").mockReturnValue(1234);
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    const { getDeviceId } = jest.requireActual<typeof import("../device.web")>("../device.web");

    const first = await getDeviceId();
    const second = await getDeviceId();

    expect(first).toBe("smarttro-1234-i");
    expect(second).toBe(first);
    expect(window.localStorage.getItem("smarttro.device-id")).toBe(first);
  });

  it("falls back to a stable in-memory id when storage is unavailable", async () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("storage disabled");
      }
    });
    jest.spyOn(Date, "now").mockReturnValue(5678);
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const { getDeviceId } = jest.requireActual<typeof import("../device.web")>("../device.web");

    const first = await getDeviceId();
    const second = await getDeviceId();

    expect(first).toBe("smarttro-5678-9");
    expect(second).toBe(first);
  });
});
