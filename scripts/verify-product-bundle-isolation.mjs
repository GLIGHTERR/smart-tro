import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const forbiddenMarkers = [
  "G1 UI pilot",
  "QA preview only - no API",
  "Show toast and navigate",
  "Pilot toast provider is required",
  "@ant-design/react-native"
];

function javascriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...javascriptFiles(path));
    if (entry.isFile() && path.endsWith(".js") && statSync(path).size > 0) files.push(path);
  }
  return files;
}

export function assertProductBundleIsolated(bundleContents) {
  const leaked = forbiddenMarkers.filter((marker) => bundleContents.includes(marker));
  if (leaked.length > 0) {
    throw new Error(`Product bundle contains pilot or vendor markers: ${leaked.join(", ")}`);
  }
}

export function verifyProductBundleIsolation(directory = "dist") {
  const files = javascriptFiles(directory);
  if (files.length === 0) throw new Error(`No JavaScript bundles found in ${directory}.`);
  assertProductBundleIsolated(files.map((path) => readFileSync(path, "utf8")).join("\n"));
}
