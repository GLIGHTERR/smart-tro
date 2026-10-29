import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../assert-product-auth-config.mjs", import.meta.url));

function run(env) {
  return spawnSync(process.execPath, [script], { env: { ...process.env, ...env }, encoding: "utf8" });
}

test("accepts the explicit isolated fixture gateway", () => {
  assert.equal(run({ EXPO_PUBLIC_AUTH_USE_MOCK: "true", EXPO_PUBLIC_API_BASE_URL: "" }).status, 0);
});

test("rejects a product build without an authorized auth gateway", () => {
  const result = run({ EXPO_PUBLIC_AUTH_USE_MOCK: "", EXPO_PUBLIC_API_BASE_URL: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires an explicitly authorized auth gateway/);
});

test("rejects a fixture build that also supplies an API URL", () => {
  const result = run({ EXPO_PUBLIC_AUTH_USE_MOCK: "true", EXPO_PUBLIC_API_BASE_URL: "https:\/\/api.example" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not configure EXPO_PUBLIC_API_BASE_URL/);
});
