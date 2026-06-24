import Phaser from 'phaser';
import type { Direction } from '../types/game';

export type FieldAreaKey = 'town' | 'overworld' | 'dungeon';

export interface BattleConfig {
  enemyId?: string;
}

export interface SceneTransitionPayload {
  fromScene?: string;
  targetScene?: string;
  areaKey?: FieldAreaKey;
  mapKey?: FieldAreaKey;
  spawnId?: string;
  playerX?: number;
  playerY?: number;
  facing?: Direction;
  returnScene?: string;
  returnAreaKey?: FieldAreaKey;
  returnSpawnId?: string;
  battleConfig?: BattleConfig;
  enemyId?: string;
}

export interface SceneTransitionOptions {
  duration?: number;
  color?: number;
}

const TRANSITION_LOCK_KEY = 'sceneTransitionInProgress';
const DEFAULT_FADE_DURATION = 350;
const DEFAULT_FADE_COLOR = 0x000000;

export function isFieldAreaKey(value: unknown): value is FieldAreaKey {
  return value === 'town' || value === 'overworld' || value === 'dungeon';
}

export function isSceneTransitioning(scene: Phaser.Scene): boolean {
  return Boolean(scene.registry.get(TRANSITION_LOCK_KEY));
}

export function clearSceneTransitionLock(scene: Phaser.Scene): void {
  scene.registry.set(TRANSITION_LOCK_KEY, false);
}

export function fadeInScene(scene: Phaser.Scene, options: SceneTransitionOptions = {}): void {
  clearSceneTransitionLock(scene);
  const { red, green, blue } = colorToRgb(options.color ?? DEFAULT_FADE_COLOR);
  scene.cameras.main.fadeIn(options.duration ?? DEFAULT_FADE_DURATION, red, green, blue);
}

export function fadeToScene(
  scene: Phaser.Scene,
  targetSceneKey: string,
  data: SceneTransitionPayload = {},
  options: SceneTransitionOptions = {}
): boolean {
  if (isSceneTransitioning(scene)) return false;

  scene.registry.set(TRANSITION_LOCK_KEY, true);

  const duration = options.duration ?? DEFAULT_FADE_DURATION;
  const { red, green, blue } = colorToRgb(options.color ?? DEFAULT_FADE_COLOR);
  const payload: SceneTransitionPayload = {
    ...data,
    fromScene: data.fromScene ?? scene.scene.key,
    targetScene: targetSceneKey
  };

  scene.cameras.main.once('camerafadeoutcomplete', () => {
    clearSceneTransitionLock(scene);
    scene.scene.start(targetSceneKey, payload);
  });

  scene.cameras.main.fadeOut(duration, red, green, blue);
  return true;
}

function colorToRgb(color: number): { red: number; green: number; blue: number } {
  return {
    red: (color >> 16) & 255,
    green: (color >> 8) & 255,
    blue: color & 255
  };
}
