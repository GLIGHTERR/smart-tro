const config = require("./app.json");

// The QA export lives below Pages without changing the production site's base path.
config.expo.experiments = { ...(config.expo.experiments ?? {}), baseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "/smart-tro" };

module.exports = config;
