const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const env = {
  apiBaseUrl: apiBaseUrl?.replace(/\/$/, "") ?? ""
};

export function requireApiBaseUrl(): string {
  if (!env.apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required to contact the API.");
  }
  return env.apiBaseUrl;
}
