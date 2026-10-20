import { registerRootComponent } from "expo";

import App from "./src/App";
import PilotApp from "./src/pilot/PilotApp";

// The pilot is an explicitly flagged, isolated QA surface; product builds keep App.
registerRootComponent(process.env.EXPO_PUBLIC_UI_PILOT === "true" ? PilotApp : App);
