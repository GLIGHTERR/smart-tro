import { verifyProductBundleIsolation } from "./verify-product-bundle-isolation.mjs";

if (process.env.EXPO_PUBLIC_UI_PILOT !== "true") verifyProductBundleIsolation(process.argv[2]);
