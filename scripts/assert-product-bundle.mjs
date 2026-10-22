import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const forbiddenProductBundleMarkers = Object.freeze([
  "G1 UI pilot",
  "InputItem",
  "Pilot toast provider is required",
  "@ant-design/react-native",
]);

function findJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return findJavaScriptFiles(path);
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
  });
}

export function assertProductBundleIsIsolated(bundleDirectory) {
  const files = findJavaScriptFiles(resolve(bundleDirectory));
  if (files.length === 0) throw new Error(`No JavaScript bundle files found in ${bundleDirectory}.`);

  const matches = files.flatMap((file) => {
    const content = readFileSync(file, "utf8");
    return forbiddenProductBundleMarkers
      .filter((marker) => content.includes(marker))
      .map((marker) => `${file}: ${marker}`);
  });

  if (matches.length > 0) {
    throw new Error(`Normal product bundle includes pilot or vendor payload:\n${matches.join("\n")}`);
  }
}

/* node:coverage ignore next -- exercised by the CI command, outside the node:test process. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assertProductBundleIsIsolated(process.argv[2] ?? "dist");
}
