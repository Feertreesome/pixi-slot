export type SlotSymbolId =
  | "strawberry"
  | "orange"
  | "banana"
  | "blueberry"
  | "lemon"
  | "pear"
  | "plum"
  | "cherry";

export interface SlotSymbolConfig {
  id: SlotSymbolId;
  label: string;
  emoji: string;
  tint: number;
  payoutMultiplier: number;
}

export interface ReelResult {
  reelIndex: number;
  symbols: SlotSymbolId[];
}

export interface SpinResult {
  reels: ReelResult[];
  winningSymbols: SlotSymbolId[];
  totalPayoutMultiplier: number;
}

export type WinCalculationResult = {
  amount: number;
  symbolId: SlotSymbolId | null;
  count: number;
  winningReelIndexes: number[];
};
