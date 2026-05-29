# Style Guide

This guide documents preferred coding style for this PixiJS + TypeScript project.

## TypeScript Style

- Keep TypeScript strict friendly.
- Prefer explicit public APIs and clear private fields.
- Use `type` imports for type-only imports.
- Keep configuration and shared types in dedicated files when they are used across classes.
- Avoid `any` unless there is a narrow interop reason.
- Prefer small classes and focused functions.
- Avoid large files; split responsibilities when a file becomes hard to scan.
- Keep imports local and consistent with existing relative import style.

## PixiJS Style

- Build visual objects as PixiJS containers, sprites, text, and reusable UI components.
- Follow existing screen lifecycle methods: `prepare`, `show`, `hide`, `update`, `resize`, `pause`, `resume`, `reset`, `blur`, and `focus` when needed.
- Use `Texture.from(...)` or existing asset references consistently with current code.
- Use `engine().navigation` for screen and popup flow.
- Use `engine().audio` for sound effects and music when audio is needed.
- Keep resize behavior explicit and deterministic.
- Avoid reaching around the navigation system to add or remove screens directly.

## Naming Conventions

- Use PascalCase for classes and PixiJS display object components.
- Use camelCase for variables, methods, and object properties.
- Use UPPER_SNAKE_CASE only for true constants that are static and global in meaning.
- Name files after their primary class or module responsibility.
- Use `*Config.ts` for configuration modules.
- Use `*Types.ts` or `slotTypes.ts` style names for shared type modules, following local feature naming.

## Class Responsibilities

- Screens own lifecycle, top-level composition, and responsive layout.
- Feature containers own feature coordination and child display objects.
- UI components own reusable controls and visual interaction details.
- Config files own tunable values and static definitions.
- Type files own shared interfaces, type aliases, and enums.
- Utility files own pure or narrowly scoped helper behavior.
- Game rule logic should be kept separate from rendering code when practical.

## Comments Style

- Use comments to clarify lifecycle behavior, non-obvious math, state transitions, or external constraints.
- Do not comment code that is already self-explanatory.
- Keep comments short and factual.
- Prefer meaningful names over explanatory comments.
- Update or remove comments when behavior changes.

## Performance Rules

- Reuse display objects.
- Avoid allocations in ticker/update loops.
- Avoid recreating textures every frame.
- Keep rendering code separated from game logic.
- Pre-create commonly reused containers, sprites, labels, and arrays where practical.
- Update existing display objects instead of destroying and recreating them during animation.
- Keep per-frame work predictable and minimal.
- Avoid layout recalculation in `update` unless the layout is actually changing.
