import { animate } from "motion";
import type { ObjectTarget } from "motion/react";
import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { randomInt } from "../../../engine/utils/random.ts";
import { waitFor } from "../../../engine/utils/waitFor.ts";
import { Button } from "../../ui/Button.ts";

import {
  SLOT_BOARD_HEIGHT,
  SLOT_BOARD_WIDTH,
  SLOT_REEL_COUNT,
  SLOT_REEL_GAP,
  SLOT_REEL_STOP_DELAY_MS,
  SLOT_SYMBOL_SIZE,
  SLOT_SYMBOLS,
  SLOT_VISIBLE_ROWS,
} from "./slotConfig.ts";
import {
  PaytablePanel,
  PAYTABLE_PANEL_HEIGHT,
  PAYTABLE_PANEL_WIDTH,
} from "./PaytablePanel.ts";
import { PaylineView } from "./PaylineView.ts";
import { Reel } from "./Reel.ts";
import { SlotHud } from "./SlotHud.ts";
import type {
  ReelResult,
  SlotSymbolId,
  SpinResult,
  WinCalculationResult,
} from "./slotTypes.ts";

const INITIAL_BET = 100;
const MAX_BET = 500;
const AUTO_SPIN_DELAY_SECS = 0.35;
const FRAME_PADDING = 26;
const CONTROL_PANEL_WIDTH = 760;
const CONTROL_PANEL_HEIGHT = 280;
const PAYTABLE_GAP = 28;
const REEL_FRAME_WIDTH = SLOT_BOARD_WIDTH + FRAME_PADDING * 2;
const REEL_FRAME_HEIGHT = SLOT_BOARD_HEIGHT + FRAME_PADDING * 2;
const MACHINE_WIDTH = Math.max(
  REEL_FRAME_WIDTH + PAYTABLE_GAP + PAYTABLE_PANEL_WIDTH,
  CONTROL_PANEL_WIDTH,
);
const MACHINE_HEIGHT = Math.max(
  SLOT_BOARD_HEIGHT + CONTROL_PANEL_HEIGHT + 96,
  PAYTABLE_PANEL_HEIGHT,
);
const SYMBOL_IDS = SLOT_SYMBOLS.map((symbol) => symbol.id);

function getRandomSymbolId(): SlotSymbolId {
  return SYMBOL_IDS[randomInt(0, SYMBOL_IDS.length - 1)]!;
}

/** Coordinates reels, controls, and simple placeholder slot rules. */
export class SlotMachine extends Container {
  private frameShadow: Graphics;
  private frame: Graphics;
  private glassOverlay: Graphics;
  private reelSeparators: Graphics;
  private board: Container;
  private paylineView: PaylineView;
  private controlPanel: Graphics;
  private winHighlight: Graphics;
  private spinGlow: Graphics;
  private reels: Reel[] = [];
  private paytablePanel: PaytablePanel;
  private hud: SlotHud;
  private spinButton: Button;
  private autoSpinButton: Button;
  private maxBetButton: Button;
  private bet = INITIAL_BET;
  private win = 0;
  private currentSpinResult?: SpinResult;
  private isSpinning = false;
  private isAutoSpin = false;

  constructor() {
    super();

    this.frameShadow = new Graphics();
    this.addChild(this.frameShadow);

    this.frame = new Graphics();
    this.addChild(this.frame);

    this.glassOverlay = new Graphics();
    this.addChild(this.glassOverlay);

    this.reelSeparators = new Graphics();
    this.addChild(this.reelSeparators);

    this.board = new Container();
    this.board.position.set(FRAME_PADDING, FRAME_PADDING);
    this.addChild(this.board);

    for (let i = 0; i < SLOT_REEL_COUNT; i++) {
      const reel = new Reel(i, i * SLOT_REEL_STOP_DELAY_MS);

      reel.x = i * (SLOT_SYMBOL_SIZE + SLOT_REEL_GAP);
      this.reels.push(reel);
      this.board.addChild(reel);
    }

    this.paylineView = new PaylineView(SLOT_BOARD_WIDTH, SLOT_BOARD_HEIGHT);
    this.paylineView.position.set(FRAME_PADDING, FRAME_PADDING);
    this.addChild(this.paylineView);

    this.paytablePanel = new PaytablePanel();
    this.paytablePanel.position.set(
      (MACHINE_WIDTH - REEL_FRAME_WIDTH) * 0.5 +
        REEL_FRAME_WIDTH +
        PAYTABLE_GAP +
        PAYTABLE_PANEL_WIDTH * 0.5,
      REEL_FRAME_HEIGHT * 0.5,
    );
    this.addChild(this.paytablePanel);

    this.controlPanel = new Graphics();
    this.addChild(this.controlPanel);

    this.winHighlight = new Graphics();
    this.winHighlight.alpha = 0;
    this.addChild(this.winHighlight);

    this.hud = new SlotHud();
    this.hud.position.set(MACHINE_WIDTH * 0.5, SLOT_BOARD_HEIGHT + 126);
    this.addChild(this.hud);

    this.spinGlow = new Graphics();
    this.addChild(this.spinGlow);

    this.spinButton = new Button({
      text: "SPIN",
      width: 292,
      height: 122,
      fontSize: 40,
    });
    this.spinButton.tint = 0xd9284f;
    this.spinButton.position.set(MACHINE_WIDTH * 0.5, SLOT_BOARD_HEIGHT + 286);
    this.spinButton.onPress.connect(() => {
      void this.spin();
    });
    this.addChild(this.spinButton);

    this.autoSpinButton = new Button({
      text: "AUTO SPIN",
      width: 188,
      height: 72,
      fontSize: 21,
    });
    this.autoSpinButton.tint = 0x6d39bd;
    this.autoSpinButton.position.set(
      MACHINE_WIDTH * 0.5 - 260,
      SLOT_BOARD_HEIGHT + 286,
    );
    this.autoSpinButton.onPress.connect(() => {
      void this.toggleAutoSpin();
    });
    this.addChild(this.autoSpinButton);

    this.maxBetButton = new Button({
      text: "MAX BET",
      width: 188,
      height: 72,
      fontSize: 21,
    });
    this.maxBetButton.tint = 0x6d39bd;
    this.maxBetButton.position.set(
      MACHINE_WIDTH * 0.5 + 260,
      SLOT_BOARD_HEIGHT + 286,
    );
    this.maxBetButton.onPress.connect(() => this.setMaxBet());
    this.addChild(this.maxBetButton);

    this.drawChrome();
    this.updateHud();
  }

  public async spin(): Promise<void> {
    if (this.isSpinning) return;

    this.setSpinning(true);
    this.win = 0;
    this.paylineView.setWinning(false);
    this.clearReelHighlights();
    this.updateHud();

    // Generate the full outcome before animation starts.
    // Reels only present this predefined result; win math never depends on random animation frames.
    const spinResult = this.generateSpinResult();
    this.currentSpinResult = spinResult;
    const currentSpinResult = this.currentSpinResult;
    const predefinedMiddleSymbols = currentSpinResult.reels.map((result) =>
      this.getMiddleSymbol(result),
    );
    const predefinedWin = this.calculateWin(predefinedMiddleSymbols);

    // Start all reels together; each reel has its own stop delay, so they settle left-to-right.
    const reelResults = await Promise.all(
      this.reels.map((reel, index) =>
        reel.spinToResult(currentSpinResult.reels[index]!.symbols),
      ),
    );
    const visibleMiddleSymbols = reelResults.map((result) =>
      this.getMiddleSymbol(result),
    );
    const visualMatchesResult = visibleMiddleSymbols.every(
      (symbolId, index) => symbolId === predefinedMiddleSymbols[index],
    );

    const winResult = visualMatchesResult
      ? predefinedWin
      : this.getNoWinResult();

    this.win = winResult.amount;
    this.paylineView.setWinning(winResult.amount > 0);
    this.applyWinningHighlights(winResult.winningReelIndexes);
    if (this.win > 0) {
      await this.playWinHighlight();
    }
    this.setSpinning(false);
    this.updateHud();
  }

  public getContentWidth(): number {
    return MACHINE_WIDTH;
  }

  public getContentHeight(): number {
    return MACHINE_HEIGHT;
  }

  public setSize(width: number, height: number) {
    const boardScale = Math.min(
      width / MACHINE_WIDTH,
      height / MACHINE_HEIGHT,
      1,
    );

    this.scale.set(boardScale);
  }

  public update(time: Ticker) {
    this.paylineView.update(time);
    for (const reel of this.reels) {
      reel.update(time);
    }

    if (this.isSpinning) return;

    const pulse = (Math.sin(time.lastTime * 0.006) + 1) * 0.5;

    this.spinGlow.alpha = 0.28 + pulse * 0.22;
    this.spinGlow.scale.set(0.96 + pulse * 0.06);
  }

  private async toggleAutoSpin(): Promise<void> {
    this.isAutoSpin = !this.isAutoSpin;
    this.autoSpinButton.alpha = this.isAutoSpin ? 0.7 : 1;

    if (!this.isAutoSpin || this.isSpinning) return;

    while (this.isAutoSpin) {
      await this.spin();
      if (this.isAutoSpin) {
        await waitFor(AUTO_SPIN_DELAY_SECS);
      }
    }
  }

  private setMaxBet() {
    if (this.isSpinning) return;

    this.bet = MAX_BET;
    this.updateHud();
  }

  private setSpinning(isSpinning: boolean) {
    this.isSpinning = isSpinning;
    this.spinButton.enabled = !isSpinning;
    this.spinButton.alpha = isSpinning ? 0.55 : 1;
    this.spinGlow.alpha = isSpinning ? 0.14 : this.spinGlow.alpha;
    this.maxBetButton.enabled = !isSpinning;
    this.maxBetButton.alpha = isSpinning ? 0.55 : 1;
    this.hud.setSpinning(isSpinning);
  }

  private clearReelHighlights() {
    for (const reel of this.reels) {
      reel.clearHighlights();
    }
  }

  private applyWinningHighlights(winningReelIndexes: number[]) {
    this.clearReelHighlights();

    if (winningReelIndexes.length <= 0) return;

    for (let i = 0; i < this.reels.length; i++) {
      this.reels[i].setWinningRowHighlight(1, winningReelIndexes.includes(i));
    }
  }

  private updateHud() {
    this.hud.setBet(this.bet);
    this.hud.setTotalBet(this.bet * SLOT_REEL_COUNT);
    this.hud.setWin(this.win);
  }

  private generateSpinResult(): SpinResult {
    const reels: ReelResult[] = Array.from(
      { length: SLOT_REEL_COUNT },
      (_, i) => ({
        reelIndex: i,
        symbols: this.generateReelSymbols(),
      }),
    );
    const middleSymbols = reels.map((result) => this.getMiddleSymbol(result));
    const winResult = this.calculateWin(middleSymbols);
    const totalPayoutMultiplier =
      winResult.amount > 0 ? winResult.amount / this.bet : 0;

    return {
      reels,
      winningSymbols:
        winResult.symbolId === null
          ? []
          : Array.from({ length: winResult.count }, () => winResult.symbolId!),
      totalPayoutMultiplier,
    };
  }

  private generateReelSymbols(): SlotSymbolId[] {
    return Array.from({ length: SLOT_VISIBLE_ROWS }, () => getRandomSymbolId());
  }

  private getMiddleSymbol(result: ReelResult): SlotSymbolId {
    return result.symbols[Math.floor(result.symbols.length / 2)]!;
  }

  private calculateWin(middleSymbols: SlotSymbolId[]): WinCalculationResult {
    let bestSymbolId: SlotSymbolId | null = null;
    let bestCount = 0;
    let bestStartIndex = -1;

    let currentSymbolId = middleSymbols[0];
    let currentCount = 1;
    let currentStartIndex = 0;

    for (let i = 1; i <= middleSymbols.length; i++) {
      const symbolId = middleSymbols[i];

      if (symbolId && symbolId === currentSymbolId) {
        currentCount++;
        continue;
      }

      if (currentSymbolId && currentCount >= 3 && currentCount > bestCount) {
        bestSymbolId = currentSymbolId;
        bestCount = currentCount;
        bestStartIndex = currentStartIndex;
      }

      currentSymbolId = symbolId;
      currentCount = 1;
      currentStartIndex = i;
    }

    if (!bestSymbolId || bestCount < 3) {
      return this.getNoWinResult();
    }

    const symbolConfig = SLOT_SYMBOLS.find(
        (symbol) => symbol.id === bestSymbolId,
    );

    if (!symbolConfig) {
      return this.getNoWinResult();
    }

    return {
      amount: this.bet * symbolConfig.payoutMultiplier,
      symbolId: bestSymbolId,
      count: bestCount,
      winningReelIndexes: Array.from(
          { length: bestCount },
          (_, i) => bestStartIndex + i,
      ),
    };
  }

  private getNoWinResult(): WinCalculationResult {
    return {
      amount: 0,
      symbolId: null,
      count: 0,
      winningReelIndexes: [],
    };
  }

  private drawChrome() {
    const frameWidth = REEL_FRAME_WIDTH;
    const frameHeight = REEL_FRAME_HEIGHT;
    const frameX = (MACHINE_WIDTH - frameWidth) * 0.5;

    this.frameShadow
      .clear()
      .ellipse(
        frameX + frameWidth * 0.5,
        frameHeight + 28,
        frameWidth * 0.55,
        32,
      )
      .fill({ color: 0x05000c, alpha: 0.5 })
      .roundRect(frameX + 14, 18, frameWidth, frameHeight, 34)
      .fill({ color: 0x090116, alpha: 0.62 });

    this.frame
      .clear()
      .roundRect(frameX - 8, -8, frameWidth + 16, frameHeight + 16, 42)
      .fill({ color: 0x5f3408 })
      .roundRect(frameX, 0, frameWidth, frameHeight, 34)
      .fill({ color: 0xd39125 })
      .roundRect(frameX + 8, 8, frameWidth - 16, frameHeight - 16, 28)
      .fill({ color: 0xffdf7d })
      .roundRect(frameX + 18, 18, frameWidth - 36, frameHeight - 36, 20)
      .fill({ color: 0x1b0735 })
      .roundRect(frameX + 28, 28, frameWidth - 56, frameHeight - 56, 14)
      .fill({ color: 0x2a0a4e });

    this.glassOverlay
      .clear()
      .roundRect(frameX + 28, 30, frameWidth - 56, frameHeight * 0.34, 16)
      .fill({ color: 0xffffff, alpha: 0.085 })
      .roundRect(frameX + 28, frameHeight - 62, frameWidth - 56, 34, 12)
      .fill({ color: 0x05000c, alpha: 0.2 });

    this.reelSeparators.clear();
    for (let i = 1; i < SLOT_REEL_COUNT; i++) {
      const separatorX =
        frameX +
        FRAME_PADDING +
        i * SLOT_SYMBOL_SIZE +
        (i - 0.5) * SLOT_REEL_GAP;

      this.reelSeparators
        .roundRect(
          separatorX - 7,
          FRAME_PADDING - 4,
          14,
          SLOT_BOARD_HEIGHT + 8,
          7,
        )
        .fill({ color: 0x05000c, alpha: 0.78 })
        .roundRect(
          separatorX - 2,
          FRAME_PADDING + 8,
          4,
          SLOT_BOARD_HEIGHT - 16,
          2,
        )
        .fill({ color: 0xffd76b, alpha: 0.58 });
    }

    this.board.x = frameX + FRAME_PADDING;
    this.paylineView.x = frameX + FRAME_PADDING;

    const panelX = (MACHINE_WIDTH - CONTROL_PANEL_WIDTH) * 0.5;
    const panelY = SLOT_BOARD_HEIGHT + 74;

    this.controlPanel
      .clear()
      .roundRect(
        panelX + 8,
        panelY + 10,
        CONTROL_PANEL_WIDTH,
        CONTROL_PANEL_HEIGHT,
        28,
      )
      .fill({ color: 0x090116, alpha: 0.5 })
      .roundRect(panelX, panelY, CONTROL_PANEL_WIDTH, CONTROL_PANEL_HEIGHT, 28)
      .fill({ color: 0x9b6318 })
      .roundRect(
        panelX + 8,
        panelY + 8,
        CONTROL_PANEL_WIDTH - 16,
        CONTROL_PANEL_HEIGHT - 16,
        20,
      )
      .fill({ color: 0xffc947 });

    this.winHighlight
      .clear()
      .roundRect(frameX - 10, -10, frameWidth + 20, frameHeight + 20, 40)
      .fill({ color: 0xfff2a8, alpha: 0.82 });

    this.spinGlow
      .clear()
      .circle(0, 0, 112)
      .fill({ color: 0xff305f, alpha: 0.48 });
    this.spinGlow.position.copyFrom(this.spinButton.position);
  }

  private async playWinHighlight() {
    this.winHighlight.alpha = 0;
    await animate(
      this.winHighlight,
      { alpha: [0, 0.78, 0] } as ObjectTarget<Graphics>,
      { duration: 0.55, ease: "easeOut" },
    );
  }
}
