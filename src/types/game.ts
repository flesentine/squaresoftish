export type Direction = 'down' | 'up' | 'left' | 'right';

export interface ItemData {
  id: string;
  name: string;
  description: string;
  kind: 'consumable' | 'key' | 'material';
  hpRestore?: number;
  mpRestore?: number;
}

export interface SkillData {
  id: string;
  name: string;
  mpCost: number;
  power: number;
  target: 'enemy' | 'ally';
  description: string;
}

export interface EnemyData {
  id: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  xp: number;
  gold: number;
}

export interface HeroState {
  id: string;
  name: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  skills: string[];
}

export interface InventoryStack {
  itemId: string;
  quantity: number;
}

export interface SaveState {
  version: number;
  playerName: string;
  mapId: string;
  position: { x: number; y: number };
  facing: Direction;
  party: HeroState[];
  inventory: InventoryStack[];
  gold: number;
  flags: Record<string, boolean>;
  updatedAt: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface DialogueScript {
  id: string;
  lines: DialogueLine[];
}
