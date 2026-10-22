import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assertProductBundleIsolated, verifyProductBundleIsolation } from "../verify-product-bundle-isolation.mjs";

test("rejects pilot copy and vendor markers from the product bundle", () => {
  for (const marker of [
    "G1 UI pilot",
    "QA preview only - no API",
    "Show toast and navigate",
    "Pilot toast provider is required",
    "@ant-design/react-native"
  ]) {
    assert.throws(() => assertProductBundleIsolated(`product ${marker}`), /Product bundle contains pilot or vendor markers/);
  }
});

test("accepts ordinary product bundle content and keeps the entry free of static pilot imports", () => {
  assert.doesNotThrow(() => assertProductBundleIsolated("product App and Auth only"));
  const entry = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(entry, /import PilotApp/);
  assert.match(entry, /registerRootComponent\(App\)/);
});

test("checks every nonempty JavaScript bundle and rejects empty exports", () => {
  const output = mkdtempSync(join(tmpdir(), "smart-tro-product-bundle-"));
  mkdirSync(join(output, "nested"));
  writeFileSync(join(output, "empty.js"), "");
  writeFileSync(join(output, "ignored.txt"), "G1 UI pilot");
  writeFileSync(join(output, "nested", "index.js"), "product App only");
  assert.doesNotThrow(() => verifyProductBundleIsolation(output));

  const noBundles = mkdtempSync(join(tmpdir(), "smart-tro-empty-bundle-"));
  assert.throws(() => verifyProductBundleIsolation(noBundles), /No JavaScript bundles found/);
});
