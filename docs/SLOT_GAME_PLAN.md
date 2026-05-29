# Slot Game Plan

This document describes the exact integration plan for adding a slot machine screen to this project. It must use the existing `CreationEngine`, navigation, resize, audio, asset loading, and UI patterns.

The first placeholder screen has been added. Do not add reels, slot HUD, symbol views, or gameplay logic until the implementation task explicitly asks for them.

## Target Files

The slot feature lives under `src/app/screens/slot`:

- `src/app/screens/slot/SlotScreen.ts` - done, currently a minimal placeholder screen.
- `src/app/screens/slot/SlotMachine.ts` - planned.
- `src/app/screens/slot/Reel.ts` - planned.
- `src/app/screens/slot/SymbolView.ts` - planned.
- `src/app/screens/slot/SlotHud.ts` - planned.
- `src/app/screens/slot/slotConfig.ts` - planned.
- `src/app/screens/slot/slotTypes.ts` - planned.

## Existing Project Integration Points

The slot screen should integrate with:

- `CreationEngine` from `src/engine/engine.ts`.
- `engine().navigation.showScreen(...)` from `src/engine/navigation/navigation.ts`.
- Screen lifecycle hooks already used by `LoadScreen` and `MainScreen`.
- `resize(width, height)` forwarding from the navigation plugin.
- `Button`, `Label`, and `RoundedBox` from `src/app/ui`.
- Static `assetBundles` on screen classes.
- Existing `engine().audio.sfx.play(...)` and `engine().audio.bgm.play(...)` if sound is added.

Do not modify:

- `src/engine/engine.ts`
- `src/engine/navigation/...`
- `src/engine/resize/...`
- `src/engine/audio/...`
- `src/pixi-mixins.d.ts`
- package dependencies

## Target Features

- 5 reels.
- 3 visible rows.
- Fruit symbols.
- Spin button.
- Auto spin.
- Max bet.
- Win calculation.

## Screen Integration

`SlotScreen.ts` extends `Container`, matching `LoadScreen` and `MainScreen`.

Current placeholder behavior:

- Renders a purple full-screen background.
- Renders title text: `Fruit Slot`.
- Renders centered temporary label: `Slot screen works`.
- Uses `prepare()`, `show()`, `hide()`, and `resize(width, height)` lifecycle hooks.
- Does not declare an asset bundle because it only uses `Texture.WHITE` and `Label`.
- Does not include reels, HUD controls, win logic, or slot assets yet.

Recommended lifecycle for the full implementation:

- `public static assetBundles = ["main"]` for the first implementation if it only uses existing UI assets and generated placeholder graphics.
- `constructor()` creates `SlotMachine` and `SlotHud`.
- `prepare()` resets transient state before showing if needed.
- `show()` fades or reveals the screen using `motion`, following current screen animation style.
- `hide()` stops auto spin and any active presentation animation.
- `pause()` stops input and auto spin when a popup is shown.
- `resume()` restores input if the screen is still active.
- `reset()` clears transient state if the screen may be reused from `BigPool`.
- `update(time)` forwards ticker updates to `SlotMachine`.
- `resize(width, height)` lays out the machine and HUD from navigation-provided dimensions.
- `blur()` pauses auto spin or input when the document loses focus.

The screen should not add its own window resize listeners. Resize must come from navigation.

## Navigation Integration

This project does not have a central screen registry. To show the slot screen, import `SlotScreen` where the app should switch to it and call:

```ts
await engine.navigation.showScreen(SlotScreen);
```

Current navigation entry point:

- `src/main.ts` imports `SlotScreen`.
- Startup shows `LoadScreen`, then `SlotScreen`.

Future navigation entry point depends on the requested product flow:

- Replace startup `MainScreen` in `src/main.ts` only if the user asks the slot to become the initial screen.
- Add a button on `MainScreen` that calls `engine().navigation.showScreen(SlotScreen)` if the user asks for a menu-to-slot flow.
- Do not change startup flow while only building isolated slot files.

## Asset Integration

First implementation can avoid new asset pipeline work by using:

- Existing `Button`, `Label`, and `RoundedBox` assets from the `main` bundle.
- Text, simple `Graphics`, or reusable generated textures for fruit placeholders.

If final fruit art or slot sounds are requested later:

1. Add source files under the correct `raw-assets` bundle folder.
2. Run the existing asset pipeline.
3. Let it regenerate `public/assets` and `src/manifest.json`.
4. Add a dedicated bundle only if the feature needs one and the pipeline supports it.
5. Set `SlotScreen.assetBundles` to include the needed bundle names.

Do not manually edit generated spritesheet JSON or `src/manifest.json` unless explicitly requested and understood.

## UI Integration

`SlotHud.ts` should reuse existing UI components:

- Use `Button` for spin, auto spin, and max bet controls.
- Use `Label` for balance, bet, win, and status text.
- Use `RoundedBox` for HUD/panel backgrounds if a framed panel is needed.

Button events should use `Button.onPress.connect(...)`, matching the popups.

HUD should expose typed callbacks or signals to `SlotScreen`/`SlotMachine` rather than directly owning reel logic.

## File Responsibilities

### `slotTypes.ts`

Own shared types only:

- symbol identifiers
- reel indexes
- spin state
- spin result
- win line/result
- bet state
- HUD view state

### `slotConfig.ts`

Own static values only:

- reel count: `5`
- row count: `3`
- symbol size and spacing
- fruit symbol definitions
- payout table
- bet steps and max bet
- spin timing
- layout constants

### `SymbolView.ts`

Own rendering for one symbol:

- Display a fruit symbol.
- Reuse its display objects.
- Provide a method such as `setSymbol(symbolId)`.
- Do not calculate wins or own reel state.

### `Reel.ts`

Own one reel:

- Maintain a fixed pool of visible `SymbolView` instances.
- Animate symbol positions during spins.
- Stop on a provided final symbol set.
- Avoid allocating display objects in `update`.

### `SlotMachine.ts`

Own slot gameplay coordination:

- Create 5 reels.
- Start and stop spins.
- Generate or accept spin results.
- Calculate wins through a separate function/module if logic grows.
- Track whether spinning is active.
- Expose state changes to `SlotScreen` or `SlotHud`.

### `SlotHud.ts`

Own player controls and labels:

- Spin button.
- Auto spin control.
- Max bet button.
- Bet display.
- Balance display.
- Win display.
- Disabled/enabled visual state where supported.

### `SlotScreen.ts`

Own top-level composition:

- Instantiate `SlotMachine` and `SlotHud`.
- Wire HUD callbacks to machine actions.
- Handle lifecycle, resize, pause/resume, and blur.
- Keep screen-level state small.

## Implementation Phases

### Phase 1: Documentation and Design - Done

- Keep this document updated with integration decisions.
- Initial architecture and integration docs were added.
- The first implementation uses startup navigation to show `SlotScreen` after `LoadScreen`.
- Placeholder graphics are currently used.

### Phase 2: Slot Folder and Static Screen - Partially Done

- Done: created `src/app/screens/slot`.
- Done: added `SlotScreen.ts`.
- Done: implemented static layout only.
- Done: used existing `Label`.
- Not done: `Button` and `RoundedBox` are not used yet because the placeholder has no controls or panels.
- Not done: `assetBundles = ["main"]` is not needed yet because the placeholder uses no bundled textures.
- Do not modify engine internals.

### Phase 3: Navigation Hook - Done For Temporary Startup Route

- Done: added the smallest navigation change requested by the user.
- Done: changed `src/main.ts` to show `SlotScreen` after `LoadScreen`.
- For menu flow, add a `Button` in `MainScreen` that calls `engine().navigation.showScreen(SlotScreen)`.
- Do not create a route registry unless explicitly requested.

### Phase 4: Spin Animation

- Implement update-driven reel motion.
- Pre-create symbol views.
- Avoid allocations in ticker/update loops.
- Stop reels in sequence.
- Block overlapping spins.

### Phase 5: Game Rules

- Add bet state, max bet, balance changes, and win calculation.
- Keep payout config in `slotConfig.ts`.
- Keep TypeScript types in `slotTypes.ts`.
- Keep win logic separate from Pixi rendering code if it grows beyond simple checks.

### Phase 6: Auto Spin

- Add auto spin state in `SlotScreen` or `SlotMachine`.
- Stop auto spin on pause, blur, insufficient balance, or user cancellation.
- Ensure auto spin cannot start multiple overlapping spins.

### Phase 7: Assets and Sound

- Add final fruit art and slot sound only when requested.
- Use the existing asset pipeline.
- Play sounds through `engine().audio`.
- Keep slot-specific audio aliases in config if added.

### Phase 8: Validation

- Run TypeScript and build checks.
- Check resize behavior at portrait and landscape dimensions.
- Confirm no engine, navigation, resize, audio, package, or generated asset changes were made unless explicitly requested.

## Constraints

- Do not create a parallel engine.
- Do not replace navigation.
- Do not rewrite resize, audio, or UI systems.
- Do not install new libraries unless requested.
- Do not move existing files unless requested.
- Do not add reels, HUD, symbols, config, or slot logic until the user asks for implementation.
- Keep files small and responsibilities clear.
