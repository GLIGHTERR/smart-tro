const useMock = process.env.EXPO_PUBLIC_AUTH_USE_MOCK === "true";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!useMock && !/^https:\/\/.+/.test(apiBaseUrl ?? "")) {
  throw new Error("Android product build requires an explicitly authorized auth gateway: EXPO_PUBLIC_AUTH_USE_MOCK=true or an HTTPS EXPO_PUBLIC_API_BASE_URL.");
}

if (useMock && apiBaseUrl) {
  throw new Error("Android product fixture builds must not configure EXPO_PUBLIC_API_BASE_URL.");
}
