import { animate } from "motion";
import type { ObjectTarget } from "motion/react";
import type { Ticker } from "pixi.js";
import { Container, Sprite, Texture } from "pixi.js";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  private fileIcon: Sprite;

  constructor() {
    super();

    this.fileIcon = new Sprite({
      texture: Texture.from("logo.svg"),
      anchor: 0.5,
    });
    this.addChild(this.fileIcon);
  }

  /** Prepare the screen just before showing */
  public prepare() {}

  /** Update the screen */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {}

  /** Pause gameplay - automatically fired when a popup is presented */
  public async pause() {}

  /** Resume gameplay */
  public async resume() {}

  /** Fully reset */
  public reset() {}

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    const iconScale =
      (Math.min(width, height) * 0.76) / this.fileIcon.texture.width;

    this.fileIcon.scale.set(Math.min(iconScale, 0.86));
    this.fileIcon.position.set(width * 0.5, height * 0.5);
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    this.fileIcon.alpha = 0;
    await animate(this.fileIcon, { alpha: 1 } as ObjectTarget<Sprite>, {
      duration: 0.35,
      ease: "linear",
    });
  }

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {}
}
