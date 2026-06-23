# The Last Skywell — Phaser 3 + TypeScript Starter

A runnable Phaser 3 + TypeScript + Vite project for a 1993-inspired science-fantasy JRPG prototype.

## Run it

```bash
npm install
npm run dev
```

Open the local Vite URL, usually `http://localhost:5173`.

## Build it

```bash
npm run build
npm run preview
```

## Controls

- Move: Arrow keys or WASD
- Interact / advance dialogue: E or Space
- Menu: M or Escape
- Battle command selection: Up / Down + Enter

## What is included

- Phaser 3 pinned to the Phaser 3 line: `3.90.0`
- Vite + TypeScript setup
- Scene structure:
  - `BootScene`
  - `TitleScene`
  - `FieldScene`
  - `BattleScene`
  - `MenuScene`
- Systems:
  - Dialogue
  - Save/load using browser localStorage
  - Inventory helper
  - Combat helper
  - Flags helper
  - Audio placeholder
- JSON game data:
  - Items
  - Enemies
  - Skills
  - Dialogue
- Placeholder procedural pixel textures, so it runs without external art files

## Next build steps

1. Replace procedural rectangles with real sprite sheets in `assets/sprites`.
2. Add a Tiled or LDtk exported JSON map in `assets/maps`.
3. Replace the hardcoded field layout in `FieldScene.ts` with map loading.
4. Expand `BattleScene.ts` into the real ATB-lite system.
5. Add Chapter 1 quest flags and map transitions.
