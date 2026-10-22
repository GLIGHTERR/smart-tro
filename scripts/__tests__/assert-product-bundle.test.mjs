import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertProductBundleIsIsolated,
  forbiddenProductBundleMarkers,
} from "../assert-product-bundle.mjs";

async function withBundleDirectory(callback) {
  const directory = mkdtempSync(join(tmpdir(), "smart-tro-bundle-"));
  try {
    return await callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("accepts a normal bundle with no pilot or vendor payload", async () => {
  await withBundleDirectory((directory) => {
    mkdirSync(join(directory, "_expo", "static"), { recursive: true });
    writeFileSync(join(directory, "_expo", "static", "app.js"), "console.log('product');");

    assert.doesNotThrow(() => assertProductBundleIsIsolated(directory));
  });
});

test("rejects every pilot and vendor marker in normal JavaScript bundles", async () => {
  for (const marker of forbiddenProductBundleMarkers) {
    await withBundleDirectory((directory) => {
      writeFileSync(join(directory, "app.js"), `const marker = ${JSON.stringify(marker)};`);

      assert.throws(
        () => assertProductBundleIsIsolated(directory),
        new RegExp(`app\\.js: ${marker.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`)
      );
    });
  }
});

test("rejects a bundle directory with no JavaScript assets", async () => {
  await withBundleDirectory((directory) => {
    writeFileSync(join(directory, "index.html"), "<main>product</main>");

    assert.throws(() => assertProductBundleIsIsolated(directory), /No JavaScript bundle files/);
  });
});
