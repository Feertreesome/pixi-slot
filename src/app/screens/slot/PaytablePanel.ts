import { Container } from "pixi.js";

import { Label } from "../../ui/Label.ts";
import { RoundedBox } from "../../ui/RoundedBox.ts";

import { SLOT_SYMBOLS } from "./slotConfig.ts";

export const PAYTABLE_PANEL_WIDTH = 270;
export const PAYTABLE_PANEL_HEIGHT = 430;

/** Static rules and payout display for the slot screen. */
export class PaytablePanel extends Container {
  private panel: RoundedBox;
  private title: Label;
  private rows: Label[] = [];
  private rules: Label[] = [];

  constructor() {
    super();

    this.panel = new RoundedBox({
      width: PAYTABLE_PANEL_WIDTH,
      height: PAYTABLE_PANEL_HEIGHT,
      color: 0x34105f,
      shadowColor: 0x12051f,
      shadowOffset: 10,
    });
    this.addChild(this.panel);

    this.title = new Label({
      text: "PAYTABLE",
      style: {
        fill: 0xffd76b,
        fontSize: 34,
        stroke: {
          color: 0x18072f,
          width: 4,
        },
      },
    });
    this.title.y = -PAYTABLE_PANEL_HEIGHT * 0.5 + 42;
    this.addChild(this.title);

    for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
      const symbol = SLOT_SYMBOLS[i];
      const row = new Label({
        text: `${symbol.emoji}  x${symbol.payoutMultiplier}`,
        style: {
          fill: 0xffffff,
          fontSize: 24,
        },
      });

      row.anchor.x = 0;
      row.position.set(-92, -PAYTABLE_PANEL_HEIGHT * 0.5 + 88 + i * 30);
      this.rows.push(row);
      this.addChild(row);
    }

    this.addRule("Win: 3+ same symbols from left", 0);
    this.addRule("Middle row only", 1);
  }

  private addRule(text: string, index: number) {
    const rule = new Label({
      text,
      style: {
        fill: 0xffe49a,
        fontSize: 17,
        wordWrap: true,
        wordWrapWidth: PAYTABLE_PANEL_WIDTH - 42,
      },
    });

    rule.position.set(0, PAYTABLE_PANEL_HEIGHT * 0.5 - 70 + index * 30);
    this.rules.push(rule);
    this.addChild(rule);
  }
}
