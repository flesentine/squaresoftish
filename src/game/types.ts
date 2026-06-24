export type Direction = 'down' | 'up' | 'left' | 'right';

export type DialogueLine = {
  speaker?: string;
  portrait?: string;
  text: string;
  setFlags?: string[];
};

export type NpcDefinition = {
  id: string;
  name: string;
  x: number;
  y: number;
  texture: string;
  dialogue: DialogueLine[];
};

export type RuntimeNpc = NpcDefinition & {
  sprite: Phaser.Physics.Arcade.Sprite;
};
