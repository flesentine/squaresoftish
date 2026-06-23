import type { SaveState } from '../types/game';

const SAVE_KEY = 'the-last-skywell-save-v1';

export function createNewSave(): SaveState {
  return {
    version: 1,
    playerName: 'Rowan',
    mapId: 'vael-field',
    position: { x: 240, y: 260 },
    facing: 'down',
    party: [
      {
        id: 'rowan',
        name: 'Rowan',
        level: 1,
        xp: 0,
        hp: 90,
        maxHp: 90,
        mp: 18,
        maxMp: 18,
        attack: 15,
        defense: 6,
        skills: ['sky_spark']
      },
      {
        id: 'lyra',
        name: 'Lyra',
        level: 1,
        xp: 0,
        hp: 68,
        maxHp: 68,
        mp: 26,
        maxMp: 26,
        attack: 10,
        defense: 4,
        skills: ['sky_spark']
      },
      {
        id: 'bronn',
        name: 'Bronn',
        level: 1,
        xp: 0,
        hp: 110,
        maxHp: 110,
        mp: 8,
        maxMp: 8,
        attack: 18,
        defense: 8,
        skills: []
      }
    ],
    inventory: [
      { itemId: 'potion', quantity: 3 },
      { itemId: 'ether_seed', quantity: 1 }
    ],
    gold: 20,
    flags: {},
    updatedAt: new Date().toISOString()
  };
}

export class SaveSystem {
  static key = SAVE_KEY;

  static save(state: SaveState): void {
    const copy: SaveState = {
      ...state,
      updatedAt: new Date().toISOString(),
      party: state.party.map((hero) => ({ ...hero, skills: [...hero.skills] })),
      inventory: state.inventory.map((stack) => ({ ...stack })),
      flags: { ...state.flags },
      position: { ...state.position }
    };

    window.localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
  }

  static load(): SaveState | null {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SaveState;
    } catch (error) {
      console.warn('Save file could not be parsed.', error);
      return null;
    }
  }

  static clear(): void {
    window.localStorage.removeItem(SAVE_KEY);
  }
}
