# Codex Instructions — Squaresoftish / The Last Skywell

This is a Phaser 3 + TypeScript 16-bit JRPG inspired by early-1990s console RPGs.

## Rules

- Keep the game playable after every change.
- Use TypeScript.
- Use Phaser 3.
- Keep systems data-driven where practical.
- Use bitmap/pixel-art PNG assets only.
- Do not use vector-style art for final in-game visuals.
- Preserve nearest-neighbor pixel rendering.
- Do not rewrite the whole project unless explicitly asked.
- Keep changes small and focused.

## Build Commands

Before finishing code changes, run:

npm install
npm run build

## Game Build Order

1. Project boots cleanly.
2. Top-down movement.
3. Tilemap loading.
4. Collision.
5. Camera follow.
6. NPC dialogue.
7. Scene transitions.
8. ATB-lite battle system.
9. Inventory/menu.
10. Save/load.
11. Chapter 1 content.
12. Polish, audio, balancing, and content expansion.

## Art Direction

- Final game assets should be bitmap/pixel-art PNGs.
- No vector-style final in-game art.
- Internal resolution: 320x180 or 320x240.
- Tile size: 16x16.
- Character sprites: 24x32 or 32x32.
- Use nearest-neighbor scaling.
- UI should use pixel panels, pixel fonts, and bitmap icons.

## Coding Style

- Prefer small focused files.
- Avoid giant scene files when systems can be separated.
- Use clear names.
- Do not add large dependencies unless needed.
- Keep the project buildable after each commit.
