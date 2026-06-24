# Squaresoftish NPC Dialogue

A Phaser 3 + TypeScript top-down RPG prototype with:

- WASD / arrow-key movement
- Map loading from a simple tile array
- Collision against tree/wall tiles
- Camera follow
- NPCs with collision bodies
- Interaction prompt when the player gets close
- Dialogue boxes with speaker names and multiple lines

## Controls

- Move: `WASD` or arrow keys
- Talk / advance dialogue: `E`, `Space`, or `Enter`

## Install and run

```bash
nvm use 22 || true
npm install
npm run dev
```

Then open the local URL Vite prints in your terminal.

## Build

```bash
npm run build
```

## Files to look at

- `src/scenes/GameScene.ts` - player, collision, NPC interaction, dialogue UI
- `src/game/map.ts` - tile map and tile size
- `src/game/npcs.ts` - NPC positions and dialogue lines

## Git push

```bash
git add .
git commit -m "Add NPC interactions and dialogue boxes"
git push origin main
```
