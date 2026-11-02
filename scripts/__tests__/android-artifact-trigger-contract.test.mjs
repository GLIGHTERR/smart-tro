import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preview = readFileSync(new URL("../../.eas/workflows/android-preview.yml", import.meta.url), "utf8");
const product = readFileSync(new URL("../../.github/workflows/android-product.yml", import.meta.url), "utf8");
const pilot = readFileSync(new URL("../../.github/workflows/android-pilot.yml", import.meta.url), "utf8");
const automatedTests = readFileSync(new URL("../../.github/workflows/test.yml", import.meta.url), "utf8");
const pages = readFileSync(new URL("../../.github/workflows/deploy-preview.yml", import.meta.url), "utf8");

test("all Android artifact workflows are manual-only", () => {
  for (const workflow of [preview, product, pilot]) {
    assert.match(workflow, /^on:\n(?:  #.*\n)*  workflow_dispatch:/m);
    assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m);
  }
});

test("the EAS manual path records the requested immutable ref", () => {
  assert.match(preview, /commit_sha:/);
  assert.match(preview, /required: true/);
});

test("normal tests and Pages deployment remain automatic", () => {
  assert.match(automatedTests, /^  pull_request:/m);
  assert.match(automatedTests, /^  push:/m);
  assert.match(pages, /^  push:/m);
});
