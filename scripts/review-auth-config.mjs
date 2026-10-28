import { readFileSync } from "node:fs";

const apiBaseUrlPattern = /^\s*EXPO_PUBLIC_API_BASE_URL:\s*["']?https:\/\/.+?["']?\s*$/m;
const mockGatewayPattern = /^\s*EXPO_PUBLIC_AUTH_USE_MOCK:\s*["']?true["']?\s*$/mi;
const publicPilotPattern = /(?:EXPO_PUBLIC_UI_PILOT|qa-pilot\/|pilot-dist)/;

export function assertReviewAuthConfig(workflow) {
  if (!apiBaseUrlPattern.test(workflow)) {
    throw new Error("Review deployment must configure an HTTPS EXPO_PUBLIC_API_BASE_URL.");
  }
  if (mockGatewayPattern.test(workflow)) {
    throw new Error("Review deployment must not enable EXPO_PUBLIC_AUTH_USE_MOCK.");
  }
}

export function assertNoPublicPilotPreview(workflow) {
  if (publicPilotPattern.test(workflow)) {
    throw new Error("Pages deployment must not publish a public pilot preview.");
  }
}

export function verifyReviewAuthConfig() {
  const workflow = readFileSync(new URL("../.github/workflows/deploy-preview.yml", import.meta.url), "utf8");
  assertReviewAuthConfig(workflow);
  assertNoPublicPilotPreview(workflow);
}

verifyReviewAuthConfig();
