import { cloneGameState, gameState, type GameState, STARTING_STATE } from './gameState';

const SAVE_KEY = 'the-last-skywell-save-v1';

export type SaveSlotSummary = {
  exists: boolean;
  savedAt?: string;
  mapId?: string;
  gold?: number;
  playTimeSeconds?: number;
};

type SavePayload = {
  savedAt: string;
  state: GameState;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

class SaveManager {
  save(): SaveSlotSummary {
    const payload: SavePayload = {
      savedAt: new Date().toISOString(),
      state: cloneGameState(gameState.snapshot)
    };

    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return this.getSummary();
  }

  load(): { ok: true; summary: SaveSlotSummary } | { ok: false; reason: string } {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { ok: false, reason: 'No save file yet.' };

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed) || !isRecord(parsed.state)) return { ok: false, reason: 'Save data is unreadable.' };

      const candidate = parsed.state as GameState;
      if (candidate.version !== STARTING_STATE.version || !Array.isArray(candidate.party)) {
        return { ok: false, reason: 'Save version does not match this build.' };
      }

      gameState.replace(candidate);
      return { ok: true, summary: this.getSummary() };
    } catch {
      return { ok: false, reason: 'Save data is damaged.' };
    }
  }

  erase(): void {
    window.localStorage.removeItem(SAVE_KEY);
  }

  getSummary(): SaveSlotSummary {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { exists: false };

    try {
      const parsed = JSON.parse(raw) as SavePayload;
      return {
        exists: true,
        savedAt: parsed.savedAt,
        mapId: parsed.state.field.mapId,
        gold: parsed.state.gold,
        playTimeSeconds: parsed.state.field.playTimeSeconds
      };
    } catch {
      return { exists: false };
    }
  }
}

export const saveManager = new SaveManager();
