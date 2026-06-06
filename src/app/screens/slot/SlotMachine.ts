import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { randomInt } from "../../../engine/utils/random.ts";
import type {
  SlotMachineActor,
  SpinAnimationResult,
} from "../../../machines/slotMachine.ts";
import {
  calculateWin,
  generateReels,
} from "../../../machines/slotMachineHelpers.ts";
import { Button } from "../../ui/Button.ts";
import { Label } from "../../ui/Label.ts";

import {
  REFILL_AMOUNT,
  SLOT_BOARD_HEIGHT,
  SLOT_BOARD_WIDTH,
  MOBILE_MARGIN,
  SLOT_MIDDLE_ROW_INDEX,
  SLOT_REEL_COUNT,
  SLOT_REEL_GAP,
  SLOT_REEL_STOP_DELAY_MS,
  SLOT_SYMBOL_SIZE,
  SLOT_SYMBOLS,
} from "./slotConfig.ts";
import {
  PaytablePanel,
  PAYTABLE_PANEL_HEIGHT,
  PAYTABLE_PANEL_WIDTH,
} from "./PaytablePanel.ts";
import { PaylineView } from "./PaylineView.ts";
import { Reel } from "./Reel.ts";
import { SlotHud } from "./SlotHud.ts";
import type { ReelResult, SlotSymbolId, SpinResult } from "./slotTypes.ts";

const FRAME_PADDING = 26;
const CONTROL_PANEL_HEIGHT = 300;
const PAYTABLE_GAP = 28;
const SPIN_BUTTON_WIDTH = 292;
const SPIN_BUTTON_HEIGHT = 122;
const SPIN_BUTTON_RADIUS = 30;
const SMALL_CONTROL_BUTTON_TINT = 0xffc947;
const WIN_FRAME_FLASH_DURATION_MS = 550;
const MOBILE_REEL_WIDTH_RATIO = 0.95;
const REEL_FRAME_WIDTH = SLOT_BOARD_WIDTH + FRAME_PADDING * 2;
const REEL_FRAME_HEIGHT = SLOT_BOARD_HEIGHT + FRAME_PADDING * 2;
const CONTROL_PANEL_WIDTH = REEL_FRAME_WIDTH;
const DESKTOP_REEL_CENTER_X = REEL_FRAME_WIDTH * 0.5;
const DESKTOP_CONTENT_RIGHT_X =
  REEL_FRAME_WIDTH + PAYTABLE_GAP + PAYTABLE_PANEL_WIDTH;
const MACHINE_WIDTH =
  Math.max(
    DESKTOP_REEL_CENTER_X,
    DESKTOP_CONTENT_RIGHT_X - DESKTOP_REEL_CENTER_X,
  ) * 2;
const DESKTOP_CENTER_X = MACHINE_WIDTH * 0.5;
const DESKTOP_FRAME_X = DESKTOP_CENTER_X - REEL_FRAME_WIDTH * 0.5;
const MACHINE_HEIGHT = Math.max(
  SLOT_BOARD_HEIGHT + CONTROL_PANEL_HEIGHT + 96,
  PAYTABLE_PANEL_HEIGHT,
);
const SYMBOL_IDS = SLOT_SYMBOLS.map((symbol) => symbol.id);
type ActorSubscription = ReturnType<SlotMachineActor["subscribe"]>;

export const SLOT_MACHINE_DESKTOP_MAX_WIDTH = MACHINE_WIDTH;

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
  private decreaseBetButtonLayout: Container;
  private increaseBetButtonLayout: Container;
  private addCreditsButtonLayout: Container;
  private spinButton: Button;
  private autoSpinButton: Button;
  private maxBetButton: Button;
  private decreaseBetButton: Button;
  private increaseBetButton: Button;
  private addCreditsButton: Button;
  private statusLabel: Label;
  private currentSpinResult?: SpinResult;
  private slotSubscription?: ActorSubscription;
  private resolvedReels?: ReelResult[];
  private winFeedbackStartTime?: number;

  constructor(
    private readonly slotActor: SlotMachineActor,
    private readonly onBalanceChanged?: (balance: number) => void,
  ) {
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
    this.hud.position.set(DESKTOP_CENTER_X, SLOT_BOARD_HEIGHT + 126);
    this.addChild(this.hud);

    this.spinGlow = new Graphics();
    this.spinGlow.eventMode = "none";
    this.addChild(this.spinGlow);

    this.spinButtonLayout = new Container();
    this.addChild(this.spinButtonLayout);

    this.spinButton = new Button({
      text: "SPIN",
      width: SPIN_BUTTON_WIDTH,
      height: SPIN_BUTTON_HEIGHT,
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
    this.autoSpinButton.tint = SMALL_CONTROL_BUTTON_TINT;
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
    this.maxBetButton.tint = SMALL_CONTROL_BUTTON_TINT;
    this.maxBetButton.onPress.connect(() =>
      this.slotActor.send({ type: "MAX_BET" }),
    );
    this.maxBetButtonLayout.addChild(this.maxBetButton);

    this.decreaseBetButtonLayout = new Container();
    this.addChild(this.decreaseBetButtonLayout);

    this.decreaseBetButton = new Button({
      text: "BET -",
      width: 128,
      height: 72,
      fontSize: 21,
    });
    this.decreaseBetButton.tint = SMALL_CONTROL_BUTTON_TINT;
    this.decreaseBetButton.onPress.connect(() =>
      this.slotActor.send({ type: "BET_MINUS" }),
    );
    this.decreaseBetButtonLayout.addChild(this.decreaseBetButton);

    this.increaseBetButtonLayout = new Container();
    this.addChild(this.increaseBetButtonLayout);

    this.increaseBetButton = new Button({
      text: "BET +",
      width: 128,
      height: 72,
      fontSize: 21,
    });
    this.increaseBetButton.tint = SMALL_CONTROL_BUTTON_TINT;
    this.increaseBetButton.onPress.connect(() =>
      this.slotActor.send({ type: "BET_PLUS" }),
    );
    this.increaseBetButtonLayout.addChild(this.increaseBetButton);

    this.addCreditsButtonLayout = new Container();
    this.addChild(this.addCreditsButtonLayout);

    this.addCreditsButton = new Button({
      text: "ADD CREDITS",
      width: 292,
      height: 92,
      fontSize: 27,
    });
    this.addCreditsButton.tint = 0x4f9d55;
    this.addCreditsButton.onPress.connect(() => this.addCredits(REFILL_AMOUNT));
    this.addCreditsButtonLayout.addChild(this.addCreditsButton);

    this.statusLabel = new Label({
      style: {
        fill: 0xffffff,
        fontSize: 20,
        stroke: {
          color: 0x1a072f,
          width: 4,
        },
      },
    });
    this.statusLabel.eventMode = "none";
    this.statusLabel.visible = false;
    this.addChild(this.statusLabel);

    this.drawChrome();
    this.layoutDesktop(MACHINE_WIDTH, MACHINE_HEIGHT);
    this.slotSubscription = this.slotActor.subscribe(() =>
      this.applyActorState(),
    );
    this.applyActorState();
  }

  public async spin(): Promise<void> {
    this.slotActor.send({ type: "SPIN" });
  }

  public async runSpinAnimation(spinBet: number): Promise<SpinAnimationResult> {
    this.clearWinFeedback();
    this.hideBalancePrompt();

    // Generate the full outcome before animation starts.
    // Reels only present this predefined result; win math never depends on random animation frames.
    const spinResult = this.generateSpinResult(spinBet);
    this.currentSpinResult = spinResult;
    const currentSpinResult = this.currentSpinResult;
    const predefinedMiddleSymbols = currentSpinResult.reels.map((result) =>
      this.getMiddleSymbol(result),
    );
    const predefinedWin = calculateWin(currentSpinResult.reels, spinBet);

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
    const result = visualMatchesResult
      ? {
          reels: reelResults,
          winningReelIndexes: predefinedWin.winningReelIndexes,
        }
      : {
          reels: [],
          winningReelIndexes: [],
        };

    return result;
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
    this.paytablePanel.visible = true;
    this.paylineView.setLabelsVisible(true);
    this.hud.layoutDesktop();
    this.hud.position.set(DESKTOP_CENTER_X, SLOT_BOARD_HEIGHT + 126);
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
      DESKTOP_CENTER_X,
      SLOT_BOARD_HEIGHT + 306,
    );
    this.autoSpinButtonLayout.scale.set(1);
    this.autoSpinButtonLayout.position.set(
      DESKTOP_CENTER_X - 118,
      SLOT_BOARD_HEIGHT + 198,
    );
    this.maxBetButtonLayout.scale.set(1);
    this.maxBetButtonLayout.position.set(
      DESKTOP_CENTER_X + 118,
      SLOT_BOARD_HEIGHT + 198,
    );
    this.decreaseBetButtonLayout.scale.set(1);
    this.decreaseBetButtonLayout.position.set(
      DESKTOP_CENTER_X - 230,
      SLOT_BOARD_HEIGHT + 306,
    );
    this.increaseBetButtonLayout.scale.set(1);
    this.increaseBetButtonLayout.position.set(
      DESKTOP_CENTER_X + 230,
      SLOT_BOARD_HEIGHT + 306,
    );
    this.addCreditsButtonLayout.scale.set(1);
    this.addCreditsButtonLayout.position.copyFrom(
      this.spinButtonLayout.position,
    );
    this.statusLabel.position.set(DESKTOP_CENTER_X, SLOT_BOARD_HEIGHT + 242);
    this.statusLabel.style.fontSize = 20;
    this.spinGlow.position.copyFrom(this.spinButtonLayout.position);
  }

  public layoutMobile(width: number, height: number) {
    const reelWidth = width * MOBILE_REEL_WIDTH_RATIO;
    const controlsWidth = width - MOBILE_MARGIN;
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
    const betButtonScale = Math.min(1, (controlsWidth - layoutGap) / (128 * 2));
    const betButtonHalfHeight = 36 * betButtonScale;
    const hudY = reelHeight + layoutGap + 41;
    const spinY = hudY + 41 + layoutGap + spinButtonHalfHeight;
    const betButtonY =
      spinY + spinButtonHalfHeight + layoutGap + betButtonHalfHeight;
    const secondaryButtonY =
      betButtonY + betButtonHalfHeight + layoutGap + secondaryButtonHalfHeight;

    this.scale.set(1);
    this.pivot.set(0);
    this.reelArea.scale.set(reelScale);
    this.reelArea.position.set((width - REEL_FRAME_WIDTH * reelScale) * 0.5, 0);
    this.controlPanel.visible = false;
    this.paytablePanel.visible = false;
    this.paylineView.setLabelsVisible(false);
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
    this.decreaseBetButtonLayout.scale.set(betButtonScale);
    this.decreaseBetButtonLayout.position.set(
      width * 0.5 - controlsWidth * 0.24,
      betButtonY,
    );
    this.increaseBetButtonLayout.scale.set(betButtonScale);
    this.increaseBetButtonLayout.position.set(
      width * 0.5 + controlsWidth * 0.24,
      betButtonY,
    );
    this.addCreditsButtonLayout.scale.set(spinButtonScale);
    this.addCreditsButtonLayout.position.copyFrom(
      this.spinButtonLayout.position,
    );
    this.statusLabel.position.set(
      width * 0.5,
      spinY - spinButtonHalfHeight - 10,
    );
    this.statusLabel.style.fontSize = 16;
    this.spinGlow.position.copyFrom(this.spinButtonLayout.position);
  }

  public update(time: Ticker) {
    this.hud.update(time);
    this.updateWinHighlight(time.lastTime);
    this.paylineView.update(time);
    for (const reel of this.reels) {
      reel.update(time);
    }

    if (this.isActorSpinning()) return;

    const pulse = (Math.sin(time.lastTime * 0.006) + 1) * 0.5;

    this.spinGlow.alpha = 0.28 + pulse * 0.22;
    this.spinGlow.scale.set(1);
  }

  public override destroy(options?: Parameters<Container["destroy"]>[0]) {
    this.slotSubscription?.unsubscribe();
    super.destroy(options);
  }

  private toggleAutoSpin() {
    if (this.getContext().isAutoSpin) {
      this.slotActor.send({ type: "STOP_AUTO_SPIN" });
      return;
    }

    this.slotActor.send({ type: "START_AUTO_SPIN" });
  }

  private canSpin(): boolean {
    const { balance, bet, isAutoSpin } = this.getContext();

    return !isAutoSpin && !this.isSpinBusy() && balance >= bet && balance > 0;
  }

  private addCredits(amount: number) {
    if (this.isSpinBusy()) return;

    this.slotActor.send({ type: "ADD_CREDITS", amount });
    this.hideBalancePrompt();
  }

  private updateControlsEnabled() {
    const snapshot = this.slotActor.getSnapshot();
    const { balance, isAutoSpin } = snapshot.context;
    const isBusy = this.isSpinBusy();
    const isAutoSpinningState = snapshot.matches("autoSpinning");
    const isGameOver = snapshot.matches("gameOver");
    const canChangeMoney = !isBusy && !isAutoSpinningState && balance > 0;
    const canToggleAutoSpin = balance > 0 && (!isBusy || isAutoSpin);
    const needsCredits = balance <= 0;
    const showCredits = isGameOver || (needsCredits && !isBusy);

    this.setButtonEnabled(this.spinButton, this.canSpin());
    this.setButtonEnabled(this.autoSpinButton, canToggleAutoSpin);
    this.setButtonEnabled(this.maxBetButton, canChangeMoney);
    this.setButtonEnabled(this.decreaseBetButton, canChangeMoney);
    this.setButtonEnabled(this.increaseBetButton, canChangeMoney);
    this.setButtonEnabled(this.addCreditsButton, !isBusy && showCredits);
    this.spinButtonLayout.visible = !showCredits;
    this.spinGlow.visible = !showCredits;
    this.addCreditsButtonLayout.visible = showCredits;
  }

  private setButtonEnabled(button: Button, enabled: boolean) {
    button.enabled = enabled;
    button.alpha = enabled ? 1 : 0.55;
  }

  private showBalancePrompt() {
    const { balance } = this.getContext();

    this.statusLabel.text =
      balance <= 0
        ? `Balance is empty. Add ${REFILL_AMOUNT} credits?`
        : "Not enough balance";
    this.statusLabel.visible = true;
    this.updateControlsEnabled();
  }

  private hideBalancePrompt() {
    this.statusLabel.visible = false;
  }

  private stopAutoSpin() {
    this.slotActor.send({ type: "STOP_AUTO_SPIN" });
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
    this.hud.startWinFeedback(this.getContext().win, startTime);
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

  private updateMoneyUi() {
    const { balance, bet, win } = this.getContext();

    this.hud.setBet(bet);
    this.hud.setBalance(balance);
    this.hud.setWin(win);
    this.onBalanceChanged?.(balance);
  }

  private applyActorState() {
    const snapshot = this.slotActor.getSnapshot();
    const isSpinning = snapshot.matches("spinning");
    const isGameOver = snapshot.matches("gameOver");

    this.updateMoneyUi();
    this.updateAutoSpinButton();
    this.hud.setSpinning(isSpinning);
    if (isSpinning) {
      this.spinGlow.alpha = 0.14;
    }
    if (!isSpinning && snapshot.context.reels !== this.resolvedReels) {
      this.resolvedReels = snapshot.context.reels;
      this.applyResolvedSpinFeedback();
    }
    if (snapshot.context.error) {
      this.statusLabel.text = snapshot.context.error;
      this.statusLabel.visible = true;
    } else if (isGameOver) {
      this.statusLabel.text = `Game over. Add ${REFILL_AMOUNT} credits?`;
      this.statusLabel.visible = true;
    } else if (!snapshot.matches("gameOver")) {
      this.statusLabel.visible = false;
    }
    this.updateControlsEnabled();
  }

  private updateAutoSpinButton() {
    const { isAutoSpin } = this.getContext();

    this.autoSpinButton.setText(isAutoSpin ? "STOP AUTO" : "AUTO SPIN");
    this.autoSpinButton.alpha = isAutoSpin ? 0.78 : 1;
  }

  private getContext() {
    return this.slotActor.getSnapshot().context;
  }

  private isActorSpinning() {
    return this.slotActor.getSnapshot().matches("spinning");
  }

  private isSpinBusy() {
    const snapshot = this.slotActor.getSnapshot();

    return (
      snapshot.matches("spinning") ||
      snapshot.matches("calculatingWin") ||
      snapshot.matches("updatingBalance")
    );
  }

  private applyResolvedSpinFeedback() {
    const { balance, reels, win, winningReelIndexes } = this.getContext();

    if (reels.length <= 0) {
      this.clearWinFeedback();
    } else if (win > 0) {
      this.paylineView.setWinning(true);
      this.applyWinningHighlights(winningReelIndexes);
      this.startWinFeedback();
    } else {
      this.clearWinFeedback();
    }

    if (balance <= 0) {
      this.showBalancePrompt();
    }
  }

  private generateSpinResult(spinBet: number): SpinResult {
    const reels = generateReels(getRandomSymbolId);
    const winResult = calculateWin(reels, spinBet);
    const totalPayoutMultiplier =
      winResult.amount > 0 ? winResult.amount / spinBet : 0;

    return {
      reels,
      winningSymbols:
        winResult.symbolId === null
          ? []
          : Array.from({ length: winResult.count }, () => winResult.symbolId!),
      totalPayoutMultiplier,
    };
  }

  private getMiddleSymbol(result: ReelResult): SlotSymbolId {
    return result.symbols[SLOT_MIDDLE_ROW_INDEX]!;
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
      .roundRect(
        -SPIN_BUTTON_WIDTH * 0.5,
        -SPIN_BUTTON_HEIGHT * 0.5,
        SPIN_BUTTON_WIDTH,
        SPIN_BUTTON_HEIGHT,
        SPIN_BUTTON_RADIUS,
      )
      .fill({ color: 0xff305f, alpha: 0.48 });
    this.spinGlow.position.copyFrom(this.spinButtonLayout.position);
  }
}
