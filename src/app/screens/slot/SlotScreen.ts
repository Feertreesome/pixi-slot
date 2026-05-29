import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { Label } from "../../ui/Label.ts";

import { SlotMachine } from "./SlotMachine.ts";

/** Screen that hosts the fruit slot machine. */
export class SlotScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  private background: Graphics;
  private headerBase: Graphics;
  private title: Label;
  private balanceLabel: Label;
  private machine: SlotMachine;

  constructor() {
    super();

    this.background = new Graphics();
    this.addChild(this.background);

    this.headerBase = new Graphics();
    this.addChild(this.headerBase);

    this.title = new Label({
      text: "FRUIT DELUXE",
      style: {
        fill: 0xffd76b,
        fontSize: 42,
        stroke: {
          color: 0x1a072f,
          width: 5,
        },
      },
    });
    this.addChild(this.title);

    this.balanceLabel = new Label({
      text: "BALANCE: 10000",
      style: {
        fill: 0xffffff,
        fontSize: 22,
        stroke: {
          color: 0x1a072f,
          width: 3,
        },
      },
    });
    this.addChild(this.balanceLabel);

    this.machine = new SlotMachine();
    this.addChild(this.machine);
  }

  /** Prepare the screen just before showing. */
  public prepare() {
    this.alpha = 1;
  }

  /** Resize the screen, fired whenever window size changes. */
  public resize(width: number, height: number) {
    this.drawBackground(width, height);

    const availableWidth = width * 0.92;
    const availableHeight = height * 0.84;
    const frameWidth = Math.min(availableWidth, availableHeight * (16 / 9));
    const frameHeight = frameWidth * (9 / 16);

    this.drawHeader(width, height);
    this.title.position.set(width * 0.5, Math.max(34, height * 0.045));
    this.title.style.fontSize = Math.max(28, Math.min(44, frameHeight * 0.08));
    this.balanceLabel.position.set(width * 0.5, this.title.y + 34);
    this.balanceLabel.style.fontSize = Math.max(
      15,
      Math.min(22, frameHeight * 0.038),
    );

    this.machine.setSize(frameWidth, frameHeight);
    this.machine.position.set(width * 0.5, height * 0.53);
    this.machine.pivot.set(
      this.machine.getContentWidth() * 0.5,
      this.machine.getContentHeight() * 0.5,
    );
  }

  /** Update child animations that use the existing navigation ticker. */
  public update(time: Ticker) {
    this.machine.update(time);
  }

  /** Show screen with the navigation lifecycle. */
  public async show(): Promise<void> {
    this.alpha = 1;
  }

  /** Hide screen with the navigation lifecycle. */
  public async hide(): Promise<void> {}

  private drawBackground(width: number, height: number) {
    this.background.clear();

    const bandHeight = height / 5;
    const colors = [0x2a0f5f, 0x3b1682, 0x5424a3, 0x6e35c1, 0x8c4ee0];

    for (let i = 0; i < colors.length; i++) {
      this.background
        .rect(0, i * bandHeight, width, bandHeight + 1)
        .fill({ color: colors[i] });
    }

    this.background
      .circle(width * 0.5, height * 0.35, Math.max(width, height) * 0.38)
      .fill({ color: 0xb268ff, alpha: 0.18 });
  }

  private drawHeader(width: number, height: number) {
    const headerWidth = Math.min(width * 0.82, 520);
    const headerHeight = Math.max(58, Math.min(76, height * 0.095));
    const x = (width - headerWidth) * 0.5;
    const y = Math.max(8, height * 0.012);

    this.headerBase
      .clear()
      .roundRect(x + 6, y + 6, headerWidth, headerHeight, 18)
      .fill({ color: 0x090116, alpha: 0.35 })
      .roundRect(x, y, headerWidth, headerHeight, 18)
      .fill({ color: 0x3b146f, alpha: 0.76 })
      .roundRect(x + 6, y + 6, headerWidth - 12, headerHeight - 12, 12)
      .fill({ color: 0xffd76b, alpha: 0.12 });
  }
}
