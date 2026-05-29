# Codex Rules

These rules define how Codex should work in this repository.

## Allowed Changes

Codex may change files directly related to the requested task, including:

- New screens under `src/app/screens` when a feature needs a screen.
- New UI components under `src/app/ui` when existing components are not sufficient.
- New popups under `src/app/popups` when a feature needs modal UI.
- New utilities under `src/app/utils` or `src/engine/utils` when they match the existing responsibility of that folder.
- Asset references and manifest usage when the task explicitly involves assets.
- Documentation files when the task asks for project guidance, plans, or architecture notes.

## Do Not Change Without Request

Codex should not change these areas unless the user explicitly asks:

- Project scaffolding, package manager setup, Vite setup, or TypeScript config.
- The existing engine design in `src/engine`.
- Navigation, resize, audio, or UI systems.
- Existing asset pipeline behavior.
- Public assets or raw assets.
- App startup flow in `src/main.ts` or `src/app/getEngine.ts`.

## Safety Rules

- Do not recreate the project.
- Do not replace the existing PixiJS engine wrapper.
- Do not create a parallel engine.
- Do not install new libraries unless requested.
- Do not move existing files unless requested.
- Prefer small, focused changes that are easy to review.
- Inspect existing patterns before adding code.
- Reuse existing UI components and engine services when possible.
- Keep TypeScript strict friendly.
- Avoid large files by splitting clear responsibilities into focused modules.
- Explain changed files after every task.

## Safe Workflow

1. Inspect the relevant folders and files before editing.
2. Identify existing classes, lifecycle methods, utilities, and UI components that already solve part of the task.
3. Make the smallest change that satisfies the request.
4. Keep rendering code separated from business or game rules where practical.
5. Run the most relevant validation available for the change.
6. Summarize what changed and list any tests or checks that were not run.
