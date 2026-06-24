# Squaresoftish ATB-Lite Combat

A Phaser 3 + TypeScript top-down RPG prototype with:

- WASD / arrow-key movement
- Map loading from a simple tile array
- Collision against tree/wall tiles
- Camera follow
- NPCs with collision bodies
- Interaction prompt when the player gets close
- Dialogue boxes with speaker names and multiple lines
- ATB-lite battle test with three heroes and two enemies
- Attack, Skill, Item, Guard, and Run commands
- HP / MP / ATB bars, Wait mode, damage numbers, victory, defeat, and escape states

## Controls

### Field

- Move: `WASD` or arrow keys
- Talk / advance dialogue: `E`, `Space`, or `Enter`
- Start combat test: `B`

### Battle

- Move menu / target cursor: arrow keys
- Confirm: `Enter` or `Space`
- Back: `Esc`

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

- `src/scenes/GameScene.ts` - player, collision, NPC interaction, dialogue UI, battle trigger
- `src/scenes/BattleScene.ts` - ATB-lite combat, commands, skills, items, enemy AI, battle UI
- `src/game/map.ts` - tile map and tile size
- `src/game/npcs.ts` - NPC positions and dialogue lines

## Git push

```bash
git add .
git commit -m "Add ATB-lite combat"
git push origin main
```
