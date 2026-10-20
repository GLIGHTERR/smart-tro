const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
if (process.env.EXPO_PUBLIC_UI_PILOT === "true") {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (context.originModulePath.endsWith("/index.ts") && moduleName === "./src/App") {
      return context.resolveRequest(context, "./src/pilot/PilotApp", platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}
module.exports = config;
