import { Container, Graphics } from "pixi.js";

import { Label } from "../../ui/Label.ts";

import { SLOT_SYMBOL_SIZE, SLOT_SYMBOLS } from "./slotConfig.ts";
import type { SlotSymbolConfig, SlotSymbolId } from "./slotTypes.ts";

const DEFAULT_SYMBOL_ID: SlotSymbolId = "cherry";

function getSymbolConfig(symbolId: SlotSymbolId): SlotSymbolConfig {
  return SLOT_SYMBOLS.find((symbol) => symbol.id === symbolId)!;
}

/** Reusable display object for one slot symbol tile. */
export class SymbolView extends Container {
  private highlight: Graphics;
  private cell: Graphics;
  private divider: Graphics;
  private symbolLabel: Label;
  private symbolId: SlotSymbolId = DEFAULT_SYMBOL_ID;
  private tileWidth = SLOT_SYMBOL_SIZE;
  private tileHeight = SLOT_SYMBOL_SIZE;
  private isHighlighted = false;
  private isDimmed = false;

  constructor(symbolId: SlotSymbolId = DEFAULT_SYMBOL_ID) {
    super();

    this.highlight = new Graphics();
    this.addChild(this.highlight);

    this.cell = new Graphics();
    this.addChild(this.cell);

    this.divider = new Graphics();
    this.addChild(this.divider);

    this.symbolLabel = new Label({
      style: {
        fill: 0xffffff,
        fontSize: 62,
        stroke: {
          color: 0x240f47,
          width: 5,
        },
      },
    });
    this.addChild(this.symbolLabel);

    this.setSymbol(symbolId);
    this.setSize(this.tileWidth, this.tileHeight);
  }

  public setSymbol(symbolId: SlotSymbolId) {
    this.symbolId = symbolId;

    const symbol = getSymbolConfig(symbolId);
    this.symbolLabel.text = symbol.emoji;
    this.drawTile(symbol);
  }

  public setHighlighted(value: boolean) {
    this.isHighlighted = value;
    this.updateState();
  }

  public setDimmed(value: boolean) {
    this.isDimmed = value;
    this.updateState();
  }

  public updateHighlight(timeMs: number) {
    if (!this.isHighlighted) return;

    const pulse = (Math.sin(timeMs * 0.012) + 1) * 0.5;

    this.highlight.alpha = 0.42 + pulse * 0.36;
    this.symbolLabel.scale.set(1.08 + pulse * 0.08);
  }

  public setSize(width: number, height: number) {
    this.tileWidth = width;
    this.tileHeight = height;
    this.symbolLabel.position.set(width * 0.5, height * 0.5);
    this.symbolLabel.style.fontSize = Math.floor(
      Math.min(width, height) * 0.68,
    );
    this.drawTile(getSymbolConfig(this.symbolId));
  }

  private drawTile(symbol: SlotSymbolConfig) {
    this.highlight
      .clear()
      .roundRect(8, 8, this.tileWidth - 16, this.tileHeight - 16, 18)
      .fill({ color: 0xfff0a8, alpha: 1 });

    this.cell
      .clear()
      .rect(0, 0, this.tileWidth, this.tileHeight)
      .fill({ color: symbol.tint, alpha: 0.12 })
      .rect(8, 8, this.tileWidth - 16, this.tileHeight * 0.22)
      .fill({ color: 0xffffff, alpha: 0.14 });

    this.divider
      .clear()
      .rect(10, this.tileHeight - 2, this.tileWidth - 20, 2)
      .fill({ color: 0xffffff, alpha: 0.12 });

    this.updateState();
  }

  private updateState() {
    this.highlight.visible = this.isHighlighted;
    this.highlight.alpha = this.isHighlighted ? 0.58 : 0;
    this.alpha = this.isDimmed ? 0.45 : 1;
    this.symbolLabel.scale.set(this.isHighlighted ? 1.13 : 1);
  }
}
