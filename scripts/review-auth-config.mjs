import { readFileSync } from "node:fs";

const apiBaseUrlPattern = /^\s*EXPO_PUBLIC_API_BASE_URL:\s*["']?https:\/\/.+?["']?\s*$/m;
const mockGatewayPattern = /^\s*EXPO_PUBLIC_AUTH_USE_MOCK:\s*["']?true["']?\s*$/mi;

export function assertReviewAuthConfig(workflow) {
  if (!apiBaseUrlPattern.test(workflow)) {
    throw new Error("Review deployment must configure an HTTPS EXPO_PUBLIC_API_BASE_URL.");
  }
  if (mockGatewayPattern.test(workflow)) {
    throw new Error("Review deployment must not enable EXPO_PUBLIC_AUTH_USE_MOCK.");
  }
}

export function verifyReviewAuthConfig() {
  assertReviewAuthConfig(readFileSync(new URL("../.github/workflows/deploy-preview.yml", import.meta.url), "utf8"));
}

verifyReviewAuthConfig();
