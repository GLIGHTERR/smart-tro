export const FONT_STARTUP_TIMEOUT_MS = 5000;

export type FontStartupState = "loading" | "ready" | "system-fallback";

export function getFontStartupState(fontsLoaded: boolean, fontError: Error | null, timedOut: boolean): FontStartupState {
  if (fontsLoaded) return "ready";
  if (fontError || timedOut) return "system-fallback";
  return "loading";
}

export function getFontStartupDiagnostic(fontError: Error | null, timedOut: boolean, isDebug: boolean): string | null {
  if (!isDebug) return null;
  if (fontError) return "[startup] font-load-error";
  if (timedOut) return "[startup] font-load-timeout";
  return null;
}
