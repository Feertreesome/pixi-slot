import type { BGM, SFX } from "./engine/audio/audio.ts";
import type { Navigation } from "./engine/navigation/navigation.ts";
import type {
  CreationResizePluginOptions,
  DeepRequired,
} from "./engine/resize/ResizePlugin.ts";

declare global {
  namespace PixiMixins {
    interface Application extends DeepRequired<CreationResizePluginOptions> {
      audio: {
        bgm: BGM;
        sfx: SFX;
        getMasterVolume: () => number;
        setMasterVolume: (volume: number) => void;
      };
      navigation: Navigation;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ApplicationOptions extends CreationResizePluginOptions {}
  }
}

export {};
