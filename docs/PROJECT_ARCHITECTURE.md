# Project Architecture

This project is a PixiJS 8 + TypeScript game built with Vite. It uses one custom `CreationEngine` instance, PixiJS application plugins for navigation/audio/resize, app-level screens, reusable UI components, and AssetPack-generated assets.

## Application Startup

The Pixi application is created in `src/main.ts`.

1. `main.ts` imports `CreationEngine`, `LoadScreen`, `MainScreen`, and `userSettings`.
2. It creates one engine instance with `const engine = new CreationEngine()`.
3. It stores that instance through `setEngine(engine)` from `src/app/getEngine.ts`.
4. It calls `engine.init(...)` with:
   - `background: "#000000"`
   - `resizeOptions: { minWidth: 768, minHeight: 1024, letterbox: false }`
5. It initializes persisted audio settings through `userSettings.init()`.
6. It shows `LoadScreen`.
7. It shows `MainScreen`.

`src/app/getEngine.ts` is a small singleton accessor. App code calls `engine()` when it needs the current `CreationEngine`, navigation, audio, or resize behavior.

## Engine

`src/engine/engine.ts` defines `CreationEngine`, which extends PixiJS `Application`.

Before initialization, the engine replaces PixiJS's default resize plugin and registers project plugins:

- `CreationResizePlugin`
- `CreationAudioPlugin`
- `CreationNavigationPlugin`

`CreationEngine.init()` sets defaults, then calls PixiJS `Application.init()`:

- `opts.resizeTo` defaults to `window`.
- `opts.resolution` defaults to `getResolution()`.
- The Pixi canvas is appended to `document.getElementById("pixi-container")`.
- A `visibilitychange` listener pauses/resumes all sounds and calls navigation blur/focus.
- Pixi assets are initialized with `src/manifest.json` and `basePath: "assets"`.
- The `preload` bundle is loaded immediately.
- All manifest bundles are scheduled for background loading.

Do not replace this engine or create another Pixi `Application`. New gameplay should integrate through the existing engine, screen lifecycle, navigation, resize, and audio APIs.

## Screen Registration

There is no central route table or registry file. Screens are "registered" by importing the screen class and passing the class constructor to `engine.navigation.showScreen(...)`.

Current startup flow in `src/main.ts`:

- `engine.navigation.showScreen(LoadScreen)`
- `engine.navigation.showScreen(MainScreen)`

Screen classes can declare `public static assetBundles = [...]`. `Navigation.showScreen()` loads those bundles before constructing/showing the screen.

For a new screen, add a class under `src/app/screens/...`, export it, import it where navigation should switch to it, then pass the class constructor to `showScreen`.

## Navigation

`src/engine/navigation/navigation.ts` owns screen and popup lifecycle.

Important types:

- `AppScreen` is any Pixi `Container` with optional lifecycle methods.
- `AppScreenConstructor` is a zero-argument screen constructor with optional static `assetBundles`.

Supported screen lifecycle methods:

- `prepare()`
- `show()`
- `hide()`
- `pause()`
- `resume()`
- `reset()`
- `update(time)`
- `resize(width, height)`
- `blur()`
- `focus()`
- `onLoad(progress)`

`showScreen(ctor)` works as follows:

1. Disables interaction on the current screen.
2. Loads `ctor.assetBundles` if present.
3. Reports asset load progress to the current screen's `onLoad(progress)` callback.
4. Calls `onLoad(100)` on the current screen if present.
5. Hides and removes the current screen.
6. Gets the next screen from `BigPool.get(ctor)`.
7. Adds it to the navigation container.
8. Calls `prepare()`.
9. Calls `resize(width, height)` using the latest navigation size.
10. Adds `update` to the app ticker if present.
11. Calls `show()` with interaction disabled during the animation, then reenables interaction.

`presentPopup(ctor)` pauses and disables the current screen, hides any existing popup, creates the popup with `new ctor()`, and shows it through the same internal add/show path.

`dismissPopup()` hides/removes the popup, reenables the current screen, and calls `resume()`.

Navigation's root `container` is added to `app.stage` the first time a screen or popup is shown.

## Resize

Resize is handled by `src/engine/resize/ResizePlugin.ts` and `src/engine/resize/resize.ts`.

The custom resize plugin adds these fields/methods to the Pixi application through `PixiMixins`:

- `resizeTo`
- `resize()`
- `queueResize()`
- `cancelResize()`
- `resizeOptions`

`CreationEngine.init()` defaults `resizeTo` to `window`. The resize plugin listens to global `resize` events and throttles resize work with `requestAnimationFrame`.

`resize(w, h, minWidth, minHeight, letterbox)` calculates the renderer size based on:

- minimum width
- minimum height
- letterboxing mode
- current window or target element size

The renderer canvas CSS size is set to the raw target size, while `app.renderer.resize(width, height)` uses the calculated render size.

`CreationNavigationPlugin` listens to renderer `resize` events and calls:

```ts
app.navigation.resize(app.renderer.width, app.renderer.height);
```

Navigation then forwards the size to:

- current screen
- current popup
- background screen, if one is set

Screens and popups should implement `resize(width, height)` and position their children from those dimensions. Do not add separate window listeners inside screens.

## Assets

Runtime assets live under `public/assets`. Source assets live under `raw-assets`.

`src/manifest.json` is generated by AssetPack and contains bundles:

- `default`
- `main`
- `preload`

The engine initializes Pixi `Assets` with:

```ts
Assets.init({ manifest, basePath: "assets" });
```

Then it immediately loads:

```ts
Assets.loadBundle("preload");
```

Each screen can request bundles with a static field:

```ts
public static assetBundles = ["main"];
```

`Navigation.showScreen()` loads those bundles before showing the screen. `LoadScreen` uses its `onLoad(progress)` method to display progress while the next screen's assets load.

Current asset aliases include:

- `logo.svg` from the `preload` bundle.
- `logo-white.svg`, `button.png`, `rounded-rectangle.png`, and sound aliases from the `main` bundle.
- `main/sounds/sfx-hover.wav` and `main/sounds/sfx-press.wav`, which resolve to generated `.ogg`/`.mp3` runtime files.

Do not edit generated manifest or generated runtime assets by hand unless the task explicitly involves assets.

## Load Screen Transition

`src/app/screens/LoadScreen.ts` is shown first from `src/main.ts`.

`LoadScreen`:

- Declares `public static assetBundles = ["preload"]`.
- Displays a `CircularProgressBar`.
- Displays `Texture.from("logo.svg")`.
- Implements `onLoad(progress)` by assigning `progressBar.progress`.
- Implements `hide()` with a fade-out animation using `motion`.

The transition to the main screen happens because `main.ts` awaits:

```ts
await engine.navigation.showScreen(LoadScreen);
await engine.navigation.showScreen(MainScreen);
```

When `MainScreen` is requested, navigation loads `MainScreen.assetBundles` (`["main"]`) and reports that loading progress to the current `LoadScreen`. After loading completes, navigation hides `LoadScreen`, removes it, and shows `MainScreen`.

## `src/app/screens`

`src/app/screens` contains app screens shown through navigation.

Current screens:

- `LoadScreen.ts` handles preload display and progress while the next screen's bundle loads.
- `main/MainScreen.ts` is the current main screen and declares `assetBundles = ["main"]`.

`MainScreen` is a `Container` that displays a centered logo sprite. It implements `prepare`, `update`, `pause`, `resume`, `reset`, `resize`, `show`, `hide`, and `blur`, although several are currently empty hooks.

## `src/app/ui`

`src/app/ui` contains reusable UI components.

### `Button`

`src/app/ui/Button.ts` extends `FancyButton` from `@pixi/ui`.

- Uses `defaultView: "button.png"`.
- Uses nine-slice sizing with `[38, 50, 38, 50]`.
- Creates its label with the project `Label` class.
- Supports `text`, `width`, `height`, and `fontSize` options.
- Plays `main/sounds/sfx-hover.wav` on hover.
- Plays `main/sounds/sfx-press.wav` on down.
- Exposes `onPress`, `onDown`, and other `FancyButton` signals through `@pixi/ui`.

Use this for slot controls such as spin, auto spin, and max bet unless a different control is explicitly requested.

### `Label`

`src/app/ui/Label.ts` extends PixiJS `Text`.

- Defaults to `fontFamily: "Arial Rounded MT Bold"`.
- Defaults to `align: "center"`.
- Sets anchor to `0.5`.
- Accepts normal PixiJS `TextOptions`.

Use this for HUD text, counters, titles, and win labels.

### `RoundedBox`

`src/app/ui/RoundedBox.ts` extends `Container`.

- Uses `Texture.from("rounded-rectangle.png")`.
- Uses `NineSliceSprite` for scalable rounded panels.
- Supports tint color, width, height, optional shadow, shadow color, and shadow offset.
- Exposes `boxWidth` and `boxHeight` getters for the base panel size.

Use this for framed panels such as HUD backgrounds or modal/popup panels.

### `VolumeSlider`

`src/app/ui/VolumeSlider.ts` extends `Slider` from `@pixi/ui`.

- Creates its own graphics for background, fill, and handle.
- Uses `Label` for the slider message.
- Currently used by `SettingsPopup`.

## `src/app/popups`

`src/app/popups` contains modal UI shown with `engine().navigation.presentPopup(...)`.

Current popups:

- `PausePopup.ts`
- `SettingsPopup.ts`

Both create a dark interactive fullscreen background, a centered panel, and animated show/hide behavior. They blur the current screen while visible and call `engine().navigation.dismissPopup()` from their buttons.

## `src/app/utils`

`src/app/utils/userSettings.ts` stores and applies user-level volume settings.

- Uses `storage` from `src/engine/utils/storage.ts`.
- Applies persisted values to `engine().audio`.
- Stores master, BGM, and SFX volume.

Use this folder for app-level helpers that are not generic engine infrastructure.

## Safe Extension Points

These files/folders are safe to extend for normal app features:

- `src/app/screens/...` for new screens and feature containers.
- `src/app/ui/...` for reusable UI components, when existing components are insufficient.
- `src/app/popups/...` for new popups.
- `src/app/utils/...` for app-specific helpers.
- `raw-assets/...` and `public/assets/...` only when the task explicitly asks for asset work.
- `src/manifest.json` only through the asset pipeline, not by manual editing.
- `src/main.ts` only when the task explicitly requires changing startup or choosing a different initial screen.

Shared infrastructure should not be changed unless explicitly requested:

- `src/engine/engine.ts`
- `src/engine/navigation/...`
- `src/engine/resize/...`
- `src/engine/audio/...`
- `src/pixi-mixins.d.ts`
- build, TypeScript, Vite, ESLint, and package files

## Unknowns

- `scripts/` likely contains project tooling. TODO: inspect before relying on exact script behavior.
- `my-game/` is present at the repository root. TODO: clarify whether this is generated, archived, or unrelated before using it.
