import { getFontStartupState } from "../fontState";

describe("getFontStartupState", () => {
  it("waits only while the font request is still pending", () => {
    expect(getFontStartupState(false, null, false)).toBe("loading");
  });

  it("uses the approved font after it loads", () => {
    expect(getFontStartupState(true, null, false)).toBe("ready");
  });

  it("continues with the system font after a font error", () => {
    expect(getFontStartupState(false, new Error("asset unavailable"), false)).toBe("system-fallback");
  });

  it("continues with the system font when the request exceeds the startup bound", () => {
    expect(getFontStartupState(false, null, true)).toBe("system-fallback");
  });

  it("prefers a successfully loaded font over a stale error or timeout", () => {
    expect(getFontStartupState(true, new Error("stale"), true)).toBe("ready");
  });
});
