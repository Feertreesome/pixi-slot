import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { randomInt } from "../../../engine/utils/random.ts";
import { waitFor } from "../../../engine/utils/waitFor.ts";
import { Button } from "../../ui/Button.ts";

import {
  SLOT_BOARD_HEIGHT,
  SLOT_BOARD_WIDTH,
  MOBILE_MARGIN,
  SLOT_MIDDLE_ROW_INDEX,
  SLOT_REEL_COUNT,
  SLOT_REEL_GAP,
  SLOT_REEL_STOP_DELAY_MS,
  SLOT_SYMBOL_SIZE,
  SLOT_SYMBOLS,
  SLOT_VISIBLE_ROWS,
} from "./slotConfig.ts";
import {
  PaytablePanel,
  MOBILE_PAYTABLE_HEIGHT,
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
const WIN_FRAME_FLASH_DURATION_MS = 550;
const MOBILE_REEL_WIDTH_RATIO = 0.95;
const REEL_FRAME_WIDTH = SLOT_BOARD_WIDTH + FRAME_PADDING * 2;
const REEL_FRAME_HEIGHT = SLOT_BOARD_HEIGHT + FRAME_PADDING * 2;
const MACHINE_WIDTH = Math.max(
  REEL_FRAME_WIDTH + PAYTABLE_GAP + PAYTABLE_PANEL_WIDTH,
  CONTROL_PANEL_WIDTH,
);
const DESKTOP_FRAME_X = (MACHINE_WIDTH - REEL_FRAME_WIDTH) * 0.5;
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
  private reelArea: Container;
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
  private spinButtonLayout: Container;
  private autoSpinButtonLayout: Container;
  private maxBetButtonLayout: Container;
  private spinButton: Button;
  private autoSpinButton: Button;
  private maxBetButton: Button;
  private bet = INITIAL_BET;
  private win = 0;
  private currentSpinResult?: SpinResult;
  private isSpinning = false;
  private isAutoSpin = false;
  private winFeedbackStartTime?: number;

  constructor() {
    super();

    this.reelArea = new Container();
    this.addChild(this.reelArea);

    this.frameShadow = new Graphics();
    this.frameShadow.eventMode = "none";
    this.reelArea.addChild(this.frameShadow);

    this.frame = new Graphics();
    this.frame.eventMode = "none";
    this.reelArea.addChild(this.frame);

    this.glassOverlay = new Graphics();
    this.glassOverlay.eventMode = "none";
    this.reelArea.addChild(this.glassOverlay);

    this.reelSeparators = new Graphics();
    this.reelSeparators.eventMode = "none";
    this.reelArea.addChild(this.reelSeparators);

    this.board = new Container();
    this.board.position.set(FRAME_PADDING, FRAME_PADDING);
    this.reelArea.addChild(this.board);

    for (let i = 0; i < SLOT_REEL_COUNT; i++) {
      const reel = new Reel(i, i * SLOT_REEL_STOP_DELAY_MS);

      reel.x = i * (SLOT_SYMBOL_SIZE + SLOT_REEL_GAP);
      this.reels.push(reel);
      this.board.addChild(reel);
    }

    this.paylineView = new PaylineView(SLOT_BOARD_WIDTH, SLOT_BOARD_HEIGHT);
    this.paylineView.position.set(FRAME_PADDING, FRAME_PADDING);
    this.reelArea.addChild(this.paylineView);

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
    this.controlPanel.eventMode = "none";
    this.addChild(this.controlPanel);

    this.winHighlight = new Graphics();
    this.winHighlight.eventMode = "none";
    this.winHighlight.alpha = 0;
    this.reelArea.addChild(this.winHighlight);

    this.hud = new SlotHud();
    this.hud.position.set(MACHINE_WIDTH * 0.5, SLOT_BOARD_HEIGHT + 126);
    this.addChild(this.hud);

    this.spinGlow = new Graphics();
    this.spinGlow.eventMode = "none";
    this.addChild(this.spinGlow);

    this.spinButtonLayout = new Container();
    this.addChild(this.spinButtonLayout);

    this.spinButton = new Button({
      text: "SPIN",
      width: 292,
      height: 122,
      fontSize: 40,
    });
    this.spinButton.tint = 0xd9284f;
    this.spinButton.onPress.connect(() => {
      void this.spin();
    });
    this.spinButtonLayout.addChild(this.spinButton);

    this.autoSpinButtonLayout = new Container();
    this.addChild(this.autoSpinButtonLayout);

    this.autoSpinButton = new Button({
      text: "AUTO SPIN",
      width: 188,
      height: 72,
      fontSize: 21,
    });
    this.autoSpinButton.tint = 0x6d39bd;
    this.autoSpinButton.onPress.connect(() => {
      void this.toggleAutoSpin();
    });
    this.autoSpinButtonLayout.addChild(this.autoSpinButton);

    this.maxBetButtonLayout = new Container();
    this.addChild(this.maxBetButtonLayout);

    this.maxBetButton = new Button({
      text: "MAX BET",
      width: 188,
      height: 72,
      fontSize: 21,
    });
    this.maxBetButton.tint = 0x6d39bd;
    this.maxBetButton.onPress.connect(() => this.setMaxBet());
    this.maxBetButtonLayout.addChild(this.maxBetButton);

    this.drawChrome();
    this.layoutDesktop(MACHINE_WIDTH, MACHINE_HEIGHT);
    this.updateHud();
  }

  public async spin(): Promise<void> {
    if (this.isSpinning) return;

    this.setSpinning(true);
    this.win = 0;
    this.clearWinFeedback();
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
    this.setSpinning(false);
    this.updateHud();

    if (this.win > 0) {
      this.paylineView.setWinning(true);
      this.applyWinningHighlights(winResult.winningReelIndexes);
      this.startWinFeedback();
    } else {
      this.clearWinFeedback();
    }
  }

  public getContentWidth(): number {
    return MACHINE_WIDTH;
  }

  public getContentHeight(): number {
    return MACHINE_HEIGHT;
  }

  public layoutDesktop(width: number, height: number) {
    const boardScale = Math.min(
      width / MACHINE_WIDTH,
      height / MACHINE_HEIGHT,
      1,
    );

    this.scale.set(boardScale);
    this.reelArea.scale.set(1);
    this.reelArea.position.set(DESKTOP_FRAME_X, 0);
    this.controlPanel.visible = true;
    this.hud.layoutDesktop();
    this.hud.position.set(MACHINE_WIDTH * 0.5, SLOT_BOARD_HEIGHT + 126);
    this.paytablePanel.layoutDesktop();
    this.paytablePanel.scale.set(1);
    this.paytablePanel.position.set(
      DESKTOP_FRAME_X +
        REEL_FRAME_WIDTH +
        PAYTABLE_GAP +
        PAYTABLE_PANEL_WIDTH * 0.5,
      REEL_FRAME_HEIGHT * 0.5,
    );
    this.spinButtonLayout.scale.set(1);
    this.spinButtonLayout.position.set(
      MACHINE_WIDTH * 0.5,
      SLOT_BOARD_HEIGHT + 286,
    );
    this.autoSpinButtonLayout.scale.set(1);
    this.autoSpinButtonLayout.position.set(
      MACHINE_WIDTH * 0.5 - 260,
      SLOT_BOARD_HEIGHT + 286,
    );
    this.maxBetButtonLayout.scale.set(1);
    this.maxBetButtonLayout.position.set(
      MACHINE_WIDTH * 0.5 + 260,
      SLOT_BOARD_HEIGHT + 286,
    );
    this.spinGlow.position.copyFrom(this.spinButtonLayout.position);
  }

  public layoutMobile(width: number, height: number) {
    const reelWidth = width * MOBILE_REEL_WIDTH_RATIO;
    const controlsWidth = width - MOBILE_MARGIN;
    const paytableWidth = width - MOBILE_MARGIN * 2;
    const reelScale = reelWidth / REEL_FRAME_WIDTH;
    const reelHeight = REEL_FRAME_HEIGHT * reelScale;
    const layoutGap = height < 760 ? 8 : MOBILE_MARGIN;
    const spinButtonScale = Math.min(1, controlsWidth / 340);
    const spinButtonHalfHeight = 61 * spinButtonScale;
    const secondaryButtonScale = Math.min(
      1,
      (controlsWidth - layoutGap) / (188 * 2),
    );
    const secondaryButtonHalfHeight = 36 * secondaryButtonScale;
    const hudY = reelHeight + layoutGap + 41;
    const spinY = hudY + 41 + layoutGap + spinButtonHalfHeight;
    const secondaryButtonY =
      spinY + spinButtonHalfHeight + layoutGap + secondaryButtonHalfHeight;
    const paytableY =
      secondaryButtonY +
      secondaryButtonHalfHeight +
      layoutGap +
      MOBILE_PAYTABLE_HEIGHT * 0.5;

    this.scale.set(1);
    this.pivot.set(0);
    this.reelArea.scale.set(reelScale);
    this.reelArea.position.set((width - REEL_FRAME_WIDTH * reelScale) * 0.5, 0);
    this.controlPanel.visible = false;
    this.hud.layoutMobile(controlsWidth);
    this.hud.position.set(width * 0.5, hudY);
    this.spinButtonLayout.scale.set(spinButtonScale);
    this.spinButtonLayout.position.set(width * 0.5, spinY);
    this.autoSpinButtonLayout.scale.set(secondaryButtonScale);
    this.autoSpinButtonLayout.position.set(
      width * 0.5 - controlsWidth * 0.26,
      secondaryButtonY,
    );
    this.maxBetButtonLayout.scale.set(secondaryButtonScale);
    this.maxBetButtonLayout.position.set(
      width * 0.5 + controlsWidth * 0.26,
      secondaryButtonY,
    );
    this.paytablePanel.layoutMobile(paytableWidth);
    this.paytablePanel.scale.set(1);
    this.paytablePanel.position.set(width * 0.5, paytableY);
    this.spinGlow.position.copyFrom(this.spinButtonLayout.position);
  }

  public update(time: Ticker) {
    this.hud.update(time);
    this.updateWinHighlight(time.lastTime);
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
      this.reels[i].setWinningRowHighlight(
        SLOT_MIDDLE_ROW_INDEX,
        winningReelIndexes.includes(i),
      );
    }
  }

  private startWinFeedback() {
    const startTime = performance.now();

    this.winFeedbackStartTime = startTime;
    this.hud.startWinFeedback(this.win, startTime);
  }

  private clearWinFeedback() {
    this.winFeedbackStartTime = undefined;
    this.winHighlight.alpha = 0;
    this.hud.clearWinFeedback();
    this.paylineView.setWinning(false);
    this.clearReelHighlights();
  }

  private updateWinHighlight(timeMs: number) {
    if (this.winFeedbackStartTime === undefined) return;

    const progress =
      (timeMs - this.winFeedbackStartTime) / WIN_FRAME_FLASH_DURATION_MS;

    if (progress >= 1) {
      this.winFeedbackStartTime = undefined;
      this.winHighlight.alpha = 0;
      return;
    }

    this.winHighlight.alpha = Math.sin(progress * Math.PI) * 0.78;
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
    return result.symbols[SLOT_MIDDLE_ROW_INDEX]!;
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

    this.frameShadow
      .clear()
      .ellipse(frameWidth * 0.5, frameHeight + 28, frameWidth * 0.55, 32)
      .fill({ color: 0x05000c, alpha: 0.5 })
      .roundRect(14, 18, frameWidth, frameHeight, 34)
      .fill({ color: 0x090116, alpha: 0.62 });

    this.frame
      .clear()
      .roundRect(-8, -8, frameWidth + 16, frameHeight + 16, 42)
      .fill({ color: 0x5f3408 })
      .roundRect(0, 0, frameWidth, frameHeight, 34)
      .fill({ color: 0xd39125 })
      .roundRect(8, 8, frameWidth - 16, frameHeight - 16, 28)
      .fill({ color: 0xffdf7d })
      .roundRect(18, 18, frameWidth - 36, frameHeight - 36, 20)
      .fill({ color: 0x1b0735 })
      .roundRect(28, 28, frameWidth - 56, frameHeight - 56, 14)
      .fill({ color: 0x2a0a4e });

    this.glassOverlay
      .clear()
      .roundRect(28, 30, frameWidth - 56, frameHeight * 0.34, 16)
      .fill({ color: 0xffffff, alpha: 0.085 })
      .roundRect(28, frameHeight - 62, frameWidth - 56, 34, 12)
      .fill({ color: 0x05000c, alpha: 0.2 });

    this.reelSeparators.clear();
    for (let i = 1; i < SLOT_REEL_COUNT; i++) {
      const separatorX =
        FRAME_PADDING + i * SLOT_SYMBOL_SIZE + (i - 0.5) * SLOT_REEL_GAP;

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

    this.board.x = FRAME_PADDING;
    this.paylineView.x = FRAME_PADDING;

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
      .roundRect(-10, -10, frameWidth + 20, frameHeight + 20, 40)
      .fill({ color: 0xfff2a8, alpha: 0.82 });

    this.spinGlow
      .clear()
      .circle(0, 0, 112)
      .fill({ color: 0xff305f, alpha: 0.48 });
    this.spinGlow.position.copyFrom(this.spinButtonLayout.position);
  }
}
