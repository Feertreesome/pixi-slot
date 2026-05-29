import { setEngine } from "./app/getEngine.ts";
import { LoadScreen } from "./app/screens/LoadScreen.ts";
import { SlotScreen } from "./app/screens/slot/SlotScreen.ts";
import { userSettings } from "./app/utils/userSettings.ts";
import { CreationEngine } from "./engine/engine.ts";

/**
 * Importing these modules will automatically register there plugins with the engine.
 */
import "@pixi/sound";
// import "@esotericsoftware/spine-pixi-v8";

// Create a new creation engine instance
const engine = new CreationEngine();
setEngine(engine);

(async () => {
  // Initialize the creation engine instance
  await engine.init({
    background: "#000000",
    resizeOptions: { minWidth: 768, minHeight: 1024, letterbox: false },
  });

  // Initialize the user settings
  userSettings.init();

  // Show the load screen
  await engine.navigation.showScreen(LoadScreen);
  // Show the slot screen once the load screen is dismissed
  await engine.navigation.showScreen(SlotScreen);
})();
