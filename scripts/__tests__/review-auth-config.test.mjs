import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { assertReviewAuthConfig, verifyReviewAuthConfig } from "../review-auth-config.mjs";

const configuredReviewWorkflow = `
env:
  EXPO_PUBLIC_API_BASE_URL: "https://smart-platform-renter-api.onrender.com"
  EXPO_PUBLIC_AUTH_USE_MOCK: "false"
`;

test("accepts a configured API gateway with mock authentication disabled", () => {
  assert.doesNotThrow(() => assertReviewAuthConfig(configuredReviewWorkflow));
});

test("rejects a review workflow that enables the mock gateway", () => {
  assert.throws(
    () => assertReviewAuthConfig(configuredReviewWorkflow.replace('"false"', '"true"')),
    /must not enable EXPO_PUBLIC_AUTH_USE_MOCK/
  );
});

test("rejects a review workflow without a configured HTTPS API URL", () => {
  assert.throws(
    () => assertReviewAuthConfig("EXPO_PUBLIC_AUTH_USE_MOCK: \"false\""),
    /must configure an HTTPS EXPO_PUBLIC_API_BASE_URL/
  );
});

test("accepts the Pages deployment workflow", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/deploy-preview.yml", import.meta.url), "utf8");
  assert.doesNotThrow(() => assertReviewAuthConfig(workflow));
  assert.doesNotMatch(workflow, /EXPO_PUBLIC_UI_PILOT/);
  assert.doesNotMatch(workflow, /qa-pilot/);
  assert.doesNotThrow(() => verifyReviewAuthConfig());
});
