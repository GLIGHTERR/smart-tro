import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/android-product.yml", import.meta.url), "utf8");
const testWorkflow = readFileSync(new URL("../../.github/workflows/test.yml", import.meta.url), "utf8");
const smoke = readFileSync(new URL("../gli178/product_smoke.py", import.meta.url), "utf8");

test("product artifact is manual-only, exact-SHA pinned, and explicitly non-pilot", () => {
  assert.match(workflow, /name: Android product artifact/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /commit_sha:/);
  assert.match(workflow, /Exact lowercase 40-character commit SHA to build/);
  assert.match(workflow, /\[\[ "\$COMMIT_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(workflow, /ref: \$\{\{ needs\.validate_manual_ref\.outputs\.commit_sha \}\}/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{\{ needs\.validate_manual_ref\.outputs\.commit_sha \}\}"/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m);
  assert.match(workflow, /EXPO_PUBLIC_UI_PILOT: "false"/);
  assert.match(workflow, /EXPO_PUBLIC_HOME_REVIEW: "false"/);
  assert.match(workflow, /EXPO_PUBLIC_ACCOUNT_REVIEW: "false"/);
  assert.match(workflow, /EXPO_PUBLIC_AUTH_USE_MOCK: "true"/);
  assert.match(workflow, /node scripts\/assert-product-auth-config\.mjs/);
  assert.match(workflow, /Verify APK binds the authorized fixture auth gateway/);
  assert.match(workflow, /assets\/index\.android\.bundle.*preview-access-token/);
  assert.match(workflow, /smart-tro-product-apk-\$\{\{ needs\.validate_manual_ref\.outputs\.commit_sha \}\}/);
  assert.match(workflow, /retention-days: 14/);
  assert.doesNotMatch(workflow, /android-pilot|smart-tro-pilot/);
});

test("two product emulator attempts retain a complete immutable Field-state matrix", () => {
  assert.match(workflow, /attempt: \[1, 2\]/);
  assert.match(workflow, /scripts\/gli178\/product_smoke\.py/);
  assert.match(workflow, /smart-tro-product-android-evidence/);
  assert.match(smoke, /PILOT_MARKERS/);
  assert.match(smoke, /Auth", "Đăng ký/);
  assert.match(smoke, /unauthenticated product entry/);
  assert.match(smoke, /def hierarchy\(retries=2\)/);
  assert.match(smoke, /except \(ET\.ParseError, subprocess\.CalledProcessError\)/);
  assert.match(smoke, /assert_product_provenance/);
  assert.match(smoke, /Unauthenticated product entry must not expose authenticated review content/);
  assert.match(workflow, /GLI178_EXPECTED_COMMIT="\$\(git rev-parse HEAD\)" python3 scripts\/gli178\/product_smoke\.py/);
  assert.match(workflow, /android-product-smoke\/provenance\.json/);
  assert.match(testWorkflow, /python3 -m unittest scripts\.gli178\.test_product_smoke/);
});
