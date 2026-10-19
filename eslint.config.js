const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  { ignores: ["node_modules", ".expo", "coverage", "dist"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/ui/pilot/renderer.tsx"],
    rules: { "no-restricted-imports": ["error", { patterns: ["@ant-design/react-native", "@ant-design/react-native/*"] }] },
  },
]);
