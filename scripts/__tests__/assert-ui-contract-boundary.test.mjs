import assert from "node:assert/strict";
import test from "node:test";

import { assertProductUiContractBoundary } from "../assert-ui-contract-boundary.mjs";

test("production adapters own the Ant renderer and product consumers use only the public barrel", () => {
  assert.doesNotThrow(() => assertProductUiContractBoundary());
});
