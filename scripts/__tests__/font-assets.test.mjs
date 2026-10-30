import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appConfig = JSON.parse(readFileSync(fileURLToPath(new URL("../../app.json", import.meta.url)), "utf8"));
const appSource = readFileSync(fileURLToPath(new URL("../../src/App.tsx", import.meta.url)), "utf8");
const fontPaths = appConfig.expo.plugins[0][1].fonts;

test("prebuild and startup register the FontAwesome face used by password reveal controls", () => {
  assert.ok(fontPaths.includes("./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf"));
  assert.match(appSource, /import FontAwesome from "@expo\/vector-icons\/FontAwesome"/);
  assert.match(appSource, /\.\.\.FontAwesome\.font/);
});
