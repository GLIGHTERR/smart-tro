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
  assert.match(workflow, /EXPO_PUBLIC_UI_PILOT: "true"/);
  assert.match(workflow, /EXPO_PUBLIC_PILOT_BASE_SHA: \$\{\{ inputs\.root_sha \}\}/);
  assert.match(workflow, /EXPO_PUBLIC_WEB_BASE_URL: \/smart-tro\/qa-pilot\/\$\{\{ inputs\.pilot_sha \}\}/);
  assert.match(workflow, /test "\$\(git rev-parse origin\/master\)" = "\$ROOT_SHA"/);
  assert.match(workflow, /test "\$\(git rev-parse origin\/pr-56\)" = "\$PILOT_SHA"/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.doesNotThrow(() => verifyReviewAuthConfig());
});
