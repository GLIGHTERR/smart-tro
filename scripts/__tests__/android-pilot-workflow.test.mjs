import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/android-pilot.yml", import.meta.url), "utf8");

test("keeps the hosted Android APK build within the runner memory budget", () => {
  assert.match(workflow, /--no-daemon/);
  assert.match(workflow, /--max-workers=2/);
  assert.match(workflow, /-Dorg\.gradle\.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"/);
});

test("pilot artifact is manual-only and requires an immutable commit SHA", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /commit_sha:/);
  assert.match(workflow, /Exact lowercase 40-character commit SHA to build/);
  assert.match(workflow, /\[\[ "\$COMMIT_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(workflow, /ref: \$\{\{ needs\.validate_manual_ref\.outputs\.commit_sha \}\}/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{\{ needs\.validate_manual_ref\.outputs\.commit_sha \}\}"/);
  assert.match(workflow, /smart-tro-pilot-apk-\$\{\{ needs\.validate_manual_ref\.outputs\.commit_sha \}\}/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m);
});
