import { assign, fromPromise, raise, setup } from "xstate";
import type { ActorRefFrom } from "xstate";

import {
  BET_STEP,
  DEFAULT_BET,
  INITIAL_BALANCE,
  MAX_BET,
} from "../app/screens/slot/slotConfig.ts";
import type { ReelResult } from "../app/screens/slot/slotTypes.ts";
import { calculateWin, clampBet } from "./slotMachineHelpers.ts";

const AUTO_SPIN_DELAY_MS = 600;

export interface SpinAnimationResult {
  reels: ReelResult[];
  winningReelIndexes: number[];
}

export type SpinReels = (bet: number) => Promise<SpinAnimationResult>;

export interface SlotMachineContext {
  balance: number;
  bet: number;
  win: number;
  reels: ReelResult[];
  winningReelIndexes: number[];
  isAutoSpin: boolean;
  error: string | null;
  spinReels: SpinReels;
}

export interface SlotMachineInput {
  spinReels: SpinReels;
}

export type SlotMachineEvent =
  | { type: "SPIN" }
  | { type: "SPIN_FINISHED"; result: SpinAnimationResult }
  | { type: "SET_BET"; bet: number }
  | { type: "BET_PLUS" }
  | { type: "BET_MINUS" }
  | { type: "MAX_BET" }
  | { type: "START_AUTO_SPIN" }
  | { type: "STOP_AUTO_SPIN" }
  | { type: "ADD_CREDITS"; amount: number }
  | { type: "RESET_GAME" };

const noopSpinReels: SpinReels = async () => ({
  reels: [],
  winningReelIndexes: [],
});

export const defaultSlotMachineContext: SlotMachineContext = {
  balance: INITIAL_BALANCE,
  bet: DEFAULT_BET,
  win: 0,
  reels: [],
  winningReelIndexes: [],
  isAutoSpin: false,
  error: null,
  spinReels: noopSpinReels,
};

function createInitialContext(input: SlotMachineInput): SlotMachineContext {
  return {
    ...defaultSlotMachineContext,
    spinReels: input.spinReels,
  };
}

function getMaxAllowedBet(balance: number) {
  return Math.min(MAX_BET, balance);
}

export const slotMachine = setup({
  types: {
    context: {} as SlotMachineContext,
    events: {} as SlotMachineEvent,
    input: {} as SlotMachineInput,
  },
  actors: {
    spinReels: fromPromise<
      SpinAnimationResult,
      { bet: number; spinReels: SpinReels }
    >(async ({ input }) => input.spinReels(input.bet)),
  },
  guards: {
    canSpin: ({ context }) =>
      context.balance >= context.bet && context.balance > 0,
    hasNoBalance: ({ context }) => context.balance <= 0,
    shouldContinueAutoSpin: ({ context }) =>
      context.isAutoSpin &&
      context.balance >= context.bet &&
      context.balance > 0,
  },
  actions: {
    setInsufficientBalanceError: assign({ error: "Not enough balance" }),
    setSpinError: assign({ error: "Spin failed. Try again." }),
    startAutoSpin: assign({ isAutoSpin: true, error: null }),
    stopAutoSpin: assign({ isAutoSpin: false }),
    resetGame: assign({
      balance: INITIAL_BALANCE,
      bet: DEFAULT_BET,
      win: 0,
      reels: [],
      winningReelIndexes: [],
      isAutoSpin: false,
      error: null,
    }),
    setBet: assign({
      bet: ({ context, event }) =>
        event.type === "SET_BET"
          ? clampBet(event.bet, context.balance)
          : context.bet,
      error: null,
    }),
    increaseBet: assign({
      bet: ({ context }) => clampBet(context.bet + BET_STEP, context.balance),
      error: null,
    }),
    decreaseBet: assign({
      bet: ({ context }) => clampBet(context.bet - BET_STEP, context.balance),
      error: null,
    }),
    setMaxBet: assign({
      bet: ({ context }) =>
        clampBet(getMaxAllowedBet(context.balance), context.balance),
      error: null,
    }),
    beginSpin: assign({
      balance: ({ context }) => context.balance - context.bet,
      win: 0,
      reels: [],
      winningReelIndexes: [],
      error: null,
    }),
    setFinishedReels: assign({
      reels: ({ context, event }) =>
        event.type === "SPIN_FINISHED" ? event.result.reels : context.reels,
      winningReelIndexes: ({ context, event }) =>
        event.type === "SPIN_FINISHED"
          ? event.result.winningReelIndexes
          : context.winningReelIndexes,
    }),
    refundBet: assign({
      balance: ({ context }) => context.balance + context.bet,
    }),
    calculateWin: assign({
      win: ({ context }) => calculateWin(context.reels, context.bet).amount,
    }),
    updateBalance: assign({
      balance: ({ context }) => context.balance + context.win,
      bet: ({ context }) =>
        clampBet(context.bet, context.balance + context.win),
    }),
    addCredits: assign({
      balance: ({ context, event }) =>
        event.type === "ADD_CREDITS"
          ? context.balance + event.amount
          : context.balance,
      bet: ({ context, event }) =>
        event.type === "ADD_CREDITS"
          ? clampBet(context.bet, context.balance + event.amount)
          : context.bet,
      error: null,
    }),
  },
}).createMachine({
  id: "slotMachine",
  initial: "idle",
  context: ({ input }) => createInitialContext(input),
  on: {
    STOP_AUTO_SPIN: {
      actions: "stopAutoSpin",
    },
    RESET_GAME: {
      target: ".idle",
      actions: "resetGame",
    },
    ADD_CREDITS: {
      target: ".idle",
      actions: "addCredits",
    },
  },
  states: {
    idle: {
      always: {
        target: "gameOver",
        guard: "hasNoBalance",
      },
      on: {
        SPIN: [
          {
            target: "spinning",
            guard: "canSpin",
            actions: "beginSpin",
          },
          {
            actions: "setInsufficientBalanceError",
          },
        ],
        START_AUTO_SPIN: [
          {
            target: "autoSpinning",
            guard: "canSpin",
            actions: "startAutoSpin",
          },
          {
            actions: "setInsufficientBalanceError",
          },
        ],
        SET_BET: {
          actions: "setBet",
        },
        BET_PLUS: {
          actions: "increaseBet",
        },
        BET_MINUS: {
          actions: "decreaseBet",
        },
        MAX_BET: {
          actions: "setMaxBet",
        },
      },
    },
    spinning: {
      invoke: {
        src: "spinReels",
        input: ({ context }) => ({
          bet: context.bet,
          spinReels: context.spinReels,
        }),
        onDone: {
          actions: raise(({ event }) => ({
            type: "SPIN_FINISHED",
            result: event.output,
          })),
        },
        onError: {
          target: "idle",
          actions: ["refundBet", "setSpinError"],
        },
      },
      on: {
        SPIN_FINISHED: {
          target: "calculatingWin",
          actions: "setFinishedReels",
        },
        STOP_AUTO_SPIN: {
          actions: "stopAutoSpin",
        },
      },
    },
    calculatingWin: {
      always: {
        target: "updatingBalance",
        actions: "calculateWin",
      },
    },
    updatingBalance: {
      entry: "updateBalance",
      always: [
        {
          target: "gameOver",
          guard: "hasNoBalance",
        },
        {
          target: "autoSpinning",
          guard: "shouldContinueAutoSpin",
        },
        {
          target: "idle",
          actions: "stopAutoSpin",
        },
      ],
    },
    autoSpinning: {
      after: {
        [AUTO_SPIN_DELAY_MS]: [
          {
            target: "spinning",
            guard: "canSpin",
            actions: "beginSpin",
          },
          {
            target: "gameOver",
            guard: "hasNoBalance",
            actions: "stopAutoSpin",
          },
          {
            target: "idle",
            actions: ["stopAutoSpin", "setInsufficientBalanceError"],
          },
        ],
      },
      on: {
        SPIN: [
          {
            target: "spinning",
            guard: "canSpin",
            actions: "beginSpin",
          },
          {
            actions: "setInsufficientBalanceError",
          },
        ],
        STOP_AUTO_SPIN: {
          target: "idle",
          actions: "stopAutoSpin",
        },
      },
    },
    gameOver: {
      entry: "stopAutoSpin",
      on: {
        ADD_CREDITS: {
          target: "idle",
          actions: "addCredits",
        },
        RESET_GAME: {
          target: "idle",
          actions: "resetGame",
        },
      },
    },
  },
});

export type SlotMachineActor = ActorRefFrom<typeof slotMachine>;
