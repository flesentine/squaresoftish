import type { SaveState } from '../types/game';

export class FlagsSystem {
  static has(state: SaveState, flag: string): boolean {
    return Boolean(state.flags[flag]);
  }

  static set(state: SaveState, flag: string, value = true): void {
    state.flags[flag] = value;
  }
}
