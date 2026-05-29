import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { Label } from "../../ui/Label.ts";

const LABEL_OFFSET = 44;

/** Visual marker for the single active middle-row payline. */
export class PaylineView extends Container {
  private line: Graphics;
  private glow: Graphics;
  private leftLabel: Label;
  private rightLabel: Label;
  private widthValue: number;
  private heightValue: number;
  private isWinning = false;

  constructor(width: number, height: number) {
    super();

    this.widthValue = width;
    this.heightValue = height;

    this.glow = new Graphics();
    this.addChild(this.glow);

    this.line = new Graphics();
    this.addChild(this.line);

    this.leftLabel = this.createLabel();
    this.addChild(this.leftLabel);

    this.rightLabel = this.createLabel();
    this.addChild(this.rightLabel);

    this.draw();
  }

  public setWinning(isWinning: boolean) {
    this.isWinning = isWinning;
    this.glow.alpha = isWinning ? 0.65 : 0.18;
    this.line.alpha = isWinning ? 0.95 : 0.42;
  }

  public update(time: Ticker) {
    if (!this.isWinning) return;

    const pulse = (Math.sin(time.lastTime * 0.01) + 1) * 0.5;

    this.glow.alpha = 0.35 + pulse * 0.42;
    this.line.alpha = 0.68 + pulse * 0.28;
  }

  private draw() {
    const middleY = this.heightValue * 0.5;

    this.glow
      .clear()
      .roundRect(0, middleY - 8, this.widthValue, 16, 8)
      .fill({ color: 0xffe07a, alpha: 1 });

    this.line
      .clear()
      .roundRect(0, middleY - 2, this.widthValue, 4, 2)
      .fill({ color: 0xfff0a8, alpha: 1 })
      .circle(0, middleY, 7)
      .fill({ color: 0xffd76b, alpha: 1 })
      .circle(this.widthValue, middleY, 7)
      .fill({ color: 0xffd76b, alpha: 1 });

    this.leftLabel.position.set(-LABEL_OFFSET, middleY);
    this.rightLabel.position.set(this.widthValue + LABEL_OFFSET, middleY);
    this.setWinning(this.isWinning);
  }

  private createLabel(): Label {
    return new Label({
      text: "1",
      style: {
        fill: 0xffe07a,
        fontSize: 26,
        stroke: {
          color: 0x1a072f,
          width: 4,
        },
      },
    });
  }
}
