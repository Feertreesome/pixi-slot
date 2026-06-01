import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";

import { Label } from "../../ui/Label.ts";
import { RoundedBox } from "../../ui/RoundedBox.ts";

const HUD_WIDTH = 700;
const HUD_HEIGHT = 106;
const BOX_WIDTH = 206;
const BOX_HEIGHT = 72;
const WIN_BOX_WIDTH = 228;
const MOBILE_HUD_HEIGHT = 82;
const MOBILE_BOX_GAP = 6;
const WIN_COUNT_DURATION_MS = 650;
const WIN_PULSE_DURATION_MS = 1200;

/** UI-only display for slot bet and win values. */
export class SlotHud extends Container {
  private panel: RoundedBox;
  private betBox: RoundedBox;
  private balanceBox: RoundedBox;
  private winBox: RoundedBox;
  private betLabel: Label;
  private balanceLabel: Label;
  private winLabel: Label;
  private displayedWin?: number;
  private winFeedbackStartTime?: number;
  private winFeedbackAmount = 0;

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

    this.balanceBox = this.createValueBox(BOX_WIDTH, 0x2b0d4f);
    this.balanceBox.position.set(0, 0);
    this.addChild(this.balanceBox);

    this.winBox = this.createValueBox(WIN_BOX_WIDTH, 0x5c143d);
    this.winBox.position.set(248, 0);
    this.addChild(this.winBox);

    this.betLabel = this.createValueLabel("BET: 100");
    this.betLabel.position.copyFrom(this.betBox.position);
    this.addChild(this.betLabel);

    this.balanceLabel = this.createValueLabel("BALANCE: 10000");
    this.balanceLabel.position.copyFrom(this.balanceBox.position);
    this.addChild(this.balanceLabel);

    this.winLabel = this.createValueLabel("WIN: 0", true);
    this.winLabel.position.copyFrom(this.winBox.position);
    this.addChild(this.winLabel);
  }

  public setBet(value: number) {
    this.betLabel.text = `BET: ${value}`;
  }

  public setBalance(value: number) {
    this.balanceLabel.text = `BALANCE: ${value}`;
  }

  public setWin(value: number) {
    if (this.displayedWin === value) return;

    this.displayedWin = value;
    this.winLabel.text = `WIN: ${value}`;
  }

  public startWinFeedback(amount: number, startTime: number) {
    this.winFeedbackAmount = amount;
    this.winFeedbackStartTime = startTime;
    this.setWin(0);
  }

  public clearWinFeedback() {
    this.winFeedbackStartTime = undefined;
    this.winFeedbackAmount = 0;
    this.winLabel.scale.set(1);
  }

  public update(time: Ticker) {
    if (this.winFeedbackStartTime === undefined) return;

    const elapsed = time.lastTime - this.winFeedbackStartTime;
    const countProgress = Math.min(elapsed / WIN_COUNT_DURATION_MS, 1);
    const easedCountProgress = 1 - Math.pow(1 - countProgress, 3);

    this.setWin(Math.round(this.winFeedbackAmount * easedCountProgress));

    if (elapsed < WIN_PULSE_DURATION_MS) {
      const pulse = (Math.sin(elapsed * 0.018) + 1) * 0.5;
      this.winLabel.scale.set(1 + pulse * 0.09);
      return;
    }

    this.setWin(this.winFeedbackAmount);
    this.winLabel.scale.set(1);
    this.winFeedbackStartTime = undefined;
  }

  public setSpinning(isSpinning: boolean) {
    this.alpha = isSpinning ? 0.86 : 1;
  }

  public layoutDesktop() {
    this.panel.setSize(HUD_WIDTH, HUD_HEIGHT);
    this.betBox.setSize(BOX_WIDTH, BOX_HEIGHT);
    this.balanceBox.setSize(BOX_WIDTH, BOX_HEIGHT);
    this.winBox.setSize(WIN_BOX_WIDTH, BOX_HEIGHT);
    this.betBox.position.set(-242, 0);
    this.balanceBox.position.set(0, 0);
    this.winBox.position.set(248, 0);
    this.layoutLabels(23, 30);
  }

  public layoutMobile(width: number) {
    const boxWidth = (width - MOBILE_BOX_GAP * 4) / 3;
    const boxOffset = boxWidth + MOBILE_BOX_GAP;

    this.panel.setSize(width, MOBILE_HUD_HEIGHT);
    this.betBox.setSize(boxWidth, BOX_HEIGHT);
    this.balanceBox.setSize(boxWidth, BOX_HEIGHT);
    this.winBox.setSize(boxWidth, BOX_HEIGHT);
    this.betBox.position.set(-boxOffset, 0);
    this.balanceBox.position.set(0, 0);
    this.winBox.position.set(boxOffset, 0);
    this.layoutLabels(18, 22);
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

  private layoutLabels(fontSize: number, winFontSize: number) {
    this.betLabel.position.copyFrom(this.betBox.position);
    this.balanceLabel.position.copyFrom(this.balanceBox.position);
    this.winLabel.position.copyFrom(this.winBox.position);
    this.betLabel.style.fontSize = fontSize;
    this.balanceLabel.style.fontSize = fontSize;
    this.winLabel.style.fontSize = winFontSize;
  }
}
