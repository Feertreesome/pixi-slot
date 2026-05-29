# Fruit Deluxe Slot

A small 2D slot machine game built with **PixiJS**, **TypeScript**, and **Vite**.

This project was created as a portfolio demo to show basic game UI architecture, PixiJS rendering, reel animation, win calculation, and responsive canvas scaling.

## Demo

Live demo: `https://pixi-slot-tau.vercel.app/`

## Tech Stack

- PixiJS
- TypeScript
- Vite
- ESLint
- Prettier

## Features

- 5-reel slot machine
- 3 visible rows
- Smooth vertical reel spin animation
- Predefined spin result generated before animation
- Reels stop smoothly on the final result
- Middle-row payline
- Win calculation for 3+ matching symbols in a row
- Winning symbol highlight
- Paytable panel
- BET, TOTAL BET, WIN UI
- Auto Spin button
- Max Bet button
- Responsive canvas layout

## Game Rules

The game checks the **middle row only**.

A win happens when there are **3 or more identical symbols in a row** on the middle line.

Examples:

```txt
🍒 🍒 🍒 🍋 🍐 = win
🍋 🍒 🍒 🍒 🍐 = win
🍋 🍐 🍒 🍒 🍒 = win
🍒 🍒 🍋 🍒 🍒 = no win
