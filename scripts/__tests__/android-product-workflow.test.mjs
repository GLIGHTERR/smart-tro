import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/android-product.yml", import.meta.url), "utf8");
const testWorkflow = readFileSync(new URL("../../.github/workflows/test.yml", import.meta.url), "utf8");
const smoke = readFileSync(new URL("../gli178/product_smoke.py", import.meta.url), "utf8");

test("product fallback is isolated, exact-SHA pinned, and explicitly non-pilot", () => {
  assert.match(workflow, /name: Android product artifact/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| inputs\.ref \|\| github\.sha \}\}/);
  assert.match(workflow, /EXPO_PUBLIC_UI_PILOT: "false"/);
  assert.match(workflow, /smart-tro-product-apk-\$\{\{ github\.event\.pull_request\.head\.sha \|\| inputs\.ref \|\| github\.sha \}\}/);
  assert.match(workflow, /retention-days: 14/);
  assert.doesNotMatch(workflow, /android-pilot|smart-tro-pilot/);
});

test("two product emulator attempts retain a complete immutable Field-state matrix", () => {
  assert.match(workflow, /attempt: \[1, 2\]/);
  assert.match(workflow, /scripts\/gli178\/product_smoke\.py/);
  assert.match(workflow, /smart-tro-product-android-evidence/);
  assert.match(smoke, /PILOT_MARKERS/);
  assert.match(smoke, /Home", "Account", "Edit Profile/);
  assert.match(smoke, /Chỉnh sửa thông tin cá nhân/);
  assert.match(smoke, /def hierarchy\(retries=2\)/);
  assert.match(smoke, /except \(ET\.ParseError, subprocess\.CalledProcessError\)/);
  assert.match(smoke, /assert_product_provenance/);
  assert.match(smoke, /edit_profile_matrix/);
  assert.match(smoke, /Full name focus state/);
  assert.match(smoke, /Họ và tên là bắt buộc\./);
  assert.match(smoke, /validSaveActivated": False/);
  assert.match(workflow, /GLI178_EXPECTED_COMMIT="\$\(git rev-parse HEAD\)" python3 scripts\/gli178\/product_smoke\.py/);
  assert.match(workflow, /android-product-smoke\/provenance\.json/);
  assert.match(testWorkflow, /python3 -m unittest scripts\.gli178\.test_product_smoke/);
});
