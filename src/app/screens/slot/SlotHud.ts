import { Container } from "pixi.js";

import { Label } from "../../ui/Label.ts";
import { RoundedBox } from "../../ui/RoundedBox.ts";

const HUD_WIDTH = 700;
const HUD_HEIGHT = 106;
const BOX_WIDTH = 206;
const BOX_HEIGHT = 72;
const WIN_BOX_WIDTH = 228;

/** UI-only display for slot bet and win values. */
export class SlotHud extends Container {
  private panel: RoundedBox;
  private betBox: RoundedBox;
  private totalBetBox: RoundedBox;
  private winBox: RoundedBox;
  private betLabel: Label;
  private totalBetLabel: Label;
  private winLabel: Label;

  constructor() {
    super();

    this.panel = new RoundedBox({
      width: HUD_WIDTH,
      height: HUD_HEIGHT,
      color: 0x9b6318,
      shadow: false,
    });
    this.addChild(this.panel);

    this.betBox = this.createValueBox(BOX_WIDTH, 0x2b0d4f);
    this.betBox.position.set(-242, 0);
    this.addChild(this.betBox);

    this.totalBetBox = this.createValueBox(BOX_WIDTH, 0x2b0d4f);
    this.totalBetBox.position.set(0, 0);
    this.addChild(this.totalBetBox);

    this.winBox = this.createValueBox(WIN_BOX_WIDTH, 0x5c143d);
    this.winBox.position.set(248, 0);
    this.addChild(this.winBox);

    this.betLabel = this.createValueLabel("BET: 100");
    this.betLabel.position.copyFrom(this.betBox.position);
    this.addChild(this.betLabel);

    this.totalBetLabel = this.createValueLabel("TOTAL BET: 500");
    this.totalBetLabel.position.copyFrom(this.totalBetBox.position);
    this.addChild(this.totalBetLabel);

    this.winLabel = this.createValueLabel("WIN: 0", true);
    this.winLabel.position.copyFrom(this.winBox.position);
    this.addChild(this.winLabel);
  }

  public setBet(value: number) {
    this.betLabel.text = `BET: ${value}`;
  }

  public setTotalBet(value: number) {
    this.totalBetLabel.text = `TOTAL BET: ${value}`;
  }

  public setWin(value: number) {
    this.winLabel.text = `WIN: ${value}`;
  }

  public setSpinning(isSpinning: boolean) {
    this.alpha = isSpinning ? 0.86 : 1;
  }

  private createValueBox(width: number, color: number): RoundedBox {
    return new RoundedBox({
      width,
      height: BOX_HEIGHT,
      color,
      shadow: false,
    });
  }

  private createValueLabel(text: string, isWin = false): Label {
    return new Label({
      text,
      style: {
        fill: isWin ? 0xfff0a8 : 0xffffff,
        fontSize: isWin ? 30 : 23,
        stroke: {
          color: isWin ? 0x7d1234 : 0x16042a,
          width: 4,
        },
      },
    });
  }
}
