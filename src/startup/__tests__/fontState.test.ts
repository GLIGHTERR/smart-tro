import { getFontStartupDiagnostic, getFontStartupState } from "../fontState";

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

describe("getFontStartupDiagnostic", () => {
  it("does not emit diagnostics outside debug mode", () => {
    expect(getFontStartupDiagnostic(new Error("private asset path"), true, false)).toBeNull();
  });

  it("uses a sanitized error code in debug mode", () => {
    expect(getFontStartupDiagnostic(new Error("private asset path"), false, true)).toBe("[startup] font-load-error");
  });

  it("identifies a debug timeout without exposing runtime details", () => {
    expect(getFontStartupDiagnostic(null, true, true)).toBe("[startup] font-load-timeout");
  });

  it("stays silent while the font request is healthy", () => {
    expect(getFontStartupDiagnostic(null, false, true)).toBeNull();
  });
});
