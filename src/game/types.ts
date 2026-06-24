export type Direction = 'down' | 'up' | 'left' | 'right';

export type NpcDefinition = {
  id: string;
  name: string;
  x: number;
  y: number;
  texture: string;
  dialogue: string[];
};

export type RuntimeNpc = NpcDefinition & {
  sprite: Phaser.Physics.Arcade.Sprite;
};
