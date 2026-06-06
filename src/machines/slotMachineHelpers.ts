import {
  MAX_BET,
  MIN_BET,
  SLOT_MIDDLE_ROW_INDEX,
  SLOT_REEL_COUNT,
  SLOT_SYMBOLS,
  SLOT_VISIBLE_ROWS,
} from "../app/screens/slot/slotConfig.ts";
import type {
  ReelResult,
  SlotSymbolId,
  WinCalculationResult,
} from "../app/screens/slot/slotTypes.ts";

export function generateReels(getSymbolId: () => SlotSymbolId): ReelResult[] {
  return Array.from({ length: SLOT_REEL_COUNT }, (_, reelIndex) => ({
    reelIndex,
    symbols: Array.from({ length: SLOT_VISIBLE_ROWS }, getSymbolId),
  }));
}

export function getPayoutMultiplier(symbolId: SlotSymbolId): number {
  return (
    SLOT_SYMBOLS.find((symbol) => symbol.id === symbolId)?.payoutMultiplier ?? 0
  );
}

export function clampBet(value: number, balance: number): number {
  const maxAllowedBet = Math.min(MAX_BET, balance);

  if (maxAllowedBet < MIN_BET) return MIN_BET;

  return Math.min(Math.max(value, MIN_BET), maxAllowedBet);
}

export function calculateWin(
  reels: ReelResult[],
  bet: number,
): WinCalculationResult {
  if (reels.length <= 0) return getNoWinResult();

  const middleSymbols = reels.map(
    (result) => result.symbols[SLOT_MIDDLE_ROW_INDEX],
  );
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

  if (!bestSymbolId || bestCount < 3) return getNoWinResult();

  return {
    amount: bet * getPayoutMultiplier(bestSymbolId),
    symbolId: bestSymbolId,
    count: bestCount,
    winningReelIndexes: Array.from(
      { length: bestCount },
      (_, i) => bestStartIndex + i,
    ),
  };
}

function getNoWinResult(): WinCalculationResult {
  return {
    amount: 0,
    symbolId: null,
    count: 0,
    winningReelIndexes: [],
  };
}
