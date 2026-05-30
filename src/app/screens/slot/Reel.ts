import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { randomInt } from "../../../engine/utils/random.ts";

import {
  SLOT_MIDDLE_ROW_INDEX,
  SLOT_REEL_STOP_DELAY_MS,
  SLOT_SPIN_DURATION_MS,
  SLOT_SYMBOL_SIZE,
  SLOT_SYMBOLS,
  SLOT_VISIBLE_ROWS,
} from "./slotConfig.ts";
import { SymbolView } from "./SymbolView.ts";
import type { ReelResult, SlotSymbolId } from "./slotTypes.ts";

const BUFFER_SYMBOLS = 2;
const TOTAL_SYMBOLS = SLOT_VISIBLE_ROWS + BUFFER_SYMBOLS;
const BASE_STRIP_RANDOM_SYMBOLS = 18;
const EXTRA_RANDOM_SYMBOLS_PER_REEL = 4;
const SYMBOL_IDS = SLOT_SYMBOLS.map((symbol) => symbol.id);

function waitForAnimationFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame((time) => resolve(time));
  });
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function getRandomSymbolId(): SlotSymbolId {
  return SYMBOL_IDS[randomInt(0, SYMBOL_IDS.length - 1)]!;
}

function getRandomVisibleSymbols(): SlotSymbolId[] {
  return Array.from({ length: SLOT_VISIBLE_ROWS }, () => getRandomSymbolId());
}

/** One slot reel with a reusable, masked strip of symbol views. */
export class Reel extends Container {
  private panel: Graphics;
  private maskShape: Graphics;
  private symbolContainer: Container;
  private overlay: Graphics;
  private symbols: SymbolView[] = [];
  private renderedSymbolIds: Array<SlotSymbolId | undefined> = [];
  private visibleSymbolIds: SlotSymbolId[] = [];
  private reelIndex: number;
  private symbolWidth = SLOT_SYMBOL_SIZE;
  private symbolHeight = SLOT_SYMBOL_SIZE;
  private stopDelayMs: number;
  private isSpinning = false;

  constructor(
    reelIndex = 0,
    stopDelayMs = reelIndex * SLOT_REEL_STOP_DELAY_MS,
  ) {
    super();

    this.reelIndex = reelIndex;
    this.stopDelayMs = stopDelayMs;

    this.panel = new Graphics();
    this.panel.eventMode = "none";
    this.addChild(this.panel);

    this.symbolContainer = new Container();
    this.addChild(this.symbolContainer);

    this.maskShape = new Graphics();
    this.maskShape.eventMode = "none";
    this.addChild(this.maskShape);
    this.symbolContainer.mask = this.maskShape;

    this.overlay = new Graphics();
    this.overlay.eventMode = "none";
    this.addChild(this.overlay);

    this.visibleSymbolIds = getRandomVisibleSymbols();

    // Reels keep a small object pool; each frame only repositions/relabels views.
    // Creating SymbolView objects during a spin would add GC pressure and stutter.
    for (let i = 0; i < TOTAL_SYMBOLS; i++) {
      const symbol = new SymbolView(getRandomSymbolId());

      this.symbols.push(symbol);
      this.renderedSymbolIds.push(undefined);
      this.symbolContainer.addChild(symbol);
    }

    this.setSize(SLOT_SYMBOL_SIZE, SLOT_SYMBOL_SIZE * SLOT_VISIBLE_ROWS);
    this.renderByOffset(this.visibleSymbolIds, 0);
  }

  public async spin(): Promise<ReelResult> {
    return this.spinToResult(getRandomVisibleSymbols());
  }

  public async spinToResult(finalSymbols: SlotSymbolId[]): Promise<ReelResult> {
    if (this.isSpinning) {
      return this.getResult();
    }

    this.isSpinning = true;

    this.visibleSymbolIds = Array.from(
      { length: SLOT_VISIBLE_ROWS },
      (_, i) => finalSymbols[i] ?? getRandomSymbolId(),
    );

    // The predefined result is part of the strip from the start. Animation is
    // presentation only, and it stops exactly when finalSymbols occupy rows 0-2.
    const spinStrip = this.createSpinStrip(this.visibleSymbolIds);
    const targetOffset =
      (spinStrip.length - SLOT_VISIBLE_ROWS) * this.symbolHeight;
    const duration = SLOT_SPIN_DURATION_MS + this.stopDelayMs;
    const startTime = performance.now();

    while (performance.now() - startTime < duration) {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const scrollOffset = lerp(0, targetOffset, easeOutQuart(progress));

      this.renderByOffset(spinStrip, scrollOffset);

      await waitForAnimationFrame();
    }

    this.renderByOffset(spinStrip, targetOffset);
    this.isSpinning = false;

    return this.getResult();
  }

  public setSymbols(symbolIds: SlotSymbolId[]) {
    this.visibleSymbolIds = Array.from(
      { length: SLOT_VISIBLE_ROWS },
      (_, i) => symbolIds[i] ?? getRandomSymbolId(),
    );
    this.renderByOffset(this.visibleSymbolIds, 0);
  }

  public setWinningRowHighlight(rowIndex: number, isHighlighted: boolean) {
    for (let i = 0; i < SLOT_VISIBLE_ROWS; i++) {
      const symbol = this.symbols[i];

      if (!symbol) continue;

      const shouldHighlight = isHighlighted && i === rowIndex;

      symbol.setHighlighted(shouldHighlight);
      symbol.setDimmed(!shouldHighlight);
    }
  }

  public clearHighlights() {
    for (const symbol of this.symbols) {
      symbol.setHighlighted(false);
      symbol.setDimmed(false);
    }
  }

  public update(time: Ticker) {
    for (const symbol of this.symbols) {
      symbol.updateHighlight(time.lastTime);
    }
  }

  public getMiddleSymbol(): SlotSymbolId {
    return this.visibleSymbolIds[SLOT_MIDDLE_ROW_INDEX]!;
  }

  public setSize(width: number, height: number) {
    this.symbolWidth = width;
    this.symbolHeight = height / SLOT_VISIBLE_ROWS;

    this.drawReelPanel();

    this.maskShape
      .clear()
      .rect(0, 0, this.symbolWidth, this.symbolHeight * SLOT_VISIBLE_ROWS)
      .fill({ color: 0xffffff });

    for (const symbol of this.symbols) {
      symbol.setSize(this.symbolWidth, this.symbolHeight);
    }

    if (!this.isSpinning) {
      this.renderByOffset(this.visibleSymbolIds, 0);
    }
  }

  private drawReelPanel() {
    const height = this.symbolHeight * SLOT_VISIBLE_ROWS;

    this.panel
      .clear()
      .rect(0, 0, this.symbolWidth, height)
      .fill({ color: 0x080112 })
      .rect(4, 0, this.symbolWidth - 8, height)
      .fill({ color: 0x18052d })
      .rect(10, 0, this.symbolWidth - 20, height)
      .fill({ color: 0x2b0a4f });

    this.overlay
      .clear()
      .rect(0, 0, this.symbolWidth, 42)
      .fill({ color: 0x020006, alpha: 0.5 })
      .rect(0, height - 42, this.symbolWidth, 42)
      .fill({ color: 0x020006, alpha: 0.5 })
      .rect(0, 0, 16, height)
      .fill({ color: 0x020006, alpha: 0.34 })
      .rect(this.symbolWidth - 16, 0, 16, height)
      .fill({ color: 0x020006, alpha: 0.34 })
      .rect(14, 0, this.symbolWidth * 0.28, height)
      .fill({ color: 0xffffff, alpha: 0.055 })
      .rect(0, 0, this.symbolWidth, 2)
      .fill({ color: 0xffffff, alpha: 0.2 });
  }

  private createSpinStrip(finalSymbols: SlotSymbolId[]): SlotSymbolId[] {
    const randomSymbolCount =
      BASE_STRIP_RANDOM_SYMBOLS +
      this.reelIndex * EXTRA_RANDOM_SYMBOLS_PER_REEL;
    const randomSymbols = Array.from({ length: randomSymbolCount }, () =>
      getRandomSymbolId(),
    );

    return [...randomSymbols, ...finalSymbols];
  }

  private renderByOffset(spinStrip: SlotSymbolId[], scrollOffset: number) {
    const maxIndex = Math.max(0, spinStrip.length - SLOT_VISIBLE_ROWS);
    const baseIndex = Math.min(
      Math.floor(scrollOffset / this.symbolHeight),
      maxIndex,
    );
    const localY = -(scrollOffset % this.symbolHeight);

    for (let i = 0; i < this.symbols.length; i++) {
      const stripIndex = baseIndex + i;
      const symbolId = spinStrip[stripIndex] ?? getRandomSymbolId();
      const symbol = this.symbols[i];

      if (this.renderedSymbolIds[i] !== symbolId) {
        symbol.setSymbol(symbolId);
        this.renderedSymbolIds[i] = symbolId;
      }

      symbol.position.set(0, localY + i * this.symbolHeight);
    }

    if (baseIndex === maxIndex && localY === 0) {
      for (let i = 0; i < SLOT_VISIBLE_ROWS; i++) {
        const symbol = this.symbols[i];

        symbol.position.set(0, i * this.symbolHeight);
      }
    }
  }

  private getResult(): ReelResult {
    return {
      reelIndex: this.reelIndex,
      symbols: [...this.visibleSymbolIds],
    };
  }
}
