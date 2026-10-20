import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/android-pilot.yml", import.meta.url), "utf8");

test("keeps the hosted Android APK build within the runner memory budget", () => {
  assert.match(workflow, /--no-daemon/);
  assert.match(workflow, /--max-workers=2/);
  assert.match(workflow, /-Dorg\.gradle\.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"/);
});
