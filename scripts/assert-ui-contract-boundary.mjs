import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourceRoot = new URL("../src/", import.meta.url);
const productionAdapters = ["ui/contracts.tsx", "ui/SuccessToastAdapter.tsx"];
const publicConsumers = ["screens/AccountScreen.tsx", "screens/EditPersonalInformationScreen.tsx", "navigation/RootNavigator.tsx"];

function read(relativePath) {
  return readFileSync(new URL(relativePath, sourceRoot), "utf8");
}

export function assertProductUiContractBoundary() {
  for (const adapter of productionAdapters) {
    if (!read(adapter).includes("@ant-design/react-native")) throw new Error(`${adapter} must render through @ant-design/react-native.`);
  }
  if (read("ui/index.ts").includes("pilot/")) throw new Error("The public UI barrel must not export pilot APIs.");
  for (const consumer of publicConsumers) {
    const content = read(consumer);
    if (!content.includes('from "@/ui"')) throw new Error(`${consumer} must consume the public UI contracts.`);
    if (content.includes("@ant-design/react-native") || content.includes("ui/pilot/")) throw new Error(`${consumer} bypasses the public UI contracts.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) assertProductUiContractBoundary();
