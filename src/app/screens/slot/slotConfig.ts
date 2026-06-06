import type { SlotSymbolConfig } from "./slotTypes.ts";

export const SLOT_REEL_COUNT = 5;
export const SLOT_VISIBLE_ROWS = 3;
export const SLOT_MIDDLE_ROW_INDEX = Math.floor(SLOT_VISIBLE_ROWS / 2);
export const MOBILE_WIDTH = 768;
export const MOBILE_MARGIN = 16;

export const INITIAL_BALANCE = 10000;
export const DEFAULT_BET = 100;
export const MIN_BET = 5;
export const BET_STEP = 5;
export const MAX_BET = 500;
export const REFILL_AMOUNT = 1000;

export const SLOT_SYMBOL_SIZE = 120;
export const SLOT_REEL_GAP = 16;
export const SLOT_BOARD_WIDTH =
  SLOT_REEL_COUNT * SLOT_SYMBOL_SIZE + (SLOT_REEL_COUNT - 1) * SLOT_REEL_GAP;
export const SLOT_BOARD_HEIGHT = SLOT_VISIBLE_ROWS * SLOT_SYMBOL_SIZE;

export const SLOT_SPIN_DURATION_MS = 1200;
export const SLOT_REEL_STOP_DELAY_MS = 160;

export const SLOT_SYMBOLS: SlotSymbolConfig[] = [
  {
    id: "banana",
    label: "Banana",
    emoji: "🍌",
    tint: 0xffd84d,
    payoutMultiplier: 4,
  },
  {
    id: "lemon",
    label: "Lemon",
    emoji: "🍋",
    tint: 0xf7e65a,
    payoutMultiplier: 4,
  },
  {
    id: "orange",
    label: "Orange",
    emoji: "🍊",
    tint: 0xff8a1f,
    payoutMultiplier: 5,
  },
  {
    id: "pear",
    label: "Pear",
    emoji: "🍐",
    tint: 0x9bd256,
    payoutMultiplier: 5,
  },
  {
    id: "plum",
    label: "Plum",
    emoji: "🟣",
    tint: 0x8b4cc2,
    payoutMultiplier: 6,
  },
  {
    id: "blueberry",
    label: "Blueberry",
    emoji: "🫐",
    tint: 0x4f6fd8,
    payoutMultiplier: 7,
  },
  {
    id: "strawberry",
    label: "Strawberry",
    emoji: "🍓",
    tint: 0xf04468,
    payoutMultiplier: 8,
  },
  {
    id: "cherry",
    label: "Cherry",
    emoji: "🍒",
    tint: 0xd9284f,
    payoutMultiplier: 10,
  },
];
