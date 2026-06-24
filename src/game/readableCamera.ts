import Phaser from 'phaser';

type FieldSceneLike = Phaser.Scene & {
  areaId?: string;
  spawnId?: string;
  player?: Phaser.Physics.Arcade.Sprite;
};

export function keepFieldUiReadable(scene: Phaser.Scene): void {
  const camera = scene.cameras.main;
  camera.setZoom(1);

  const fieldScene = scene as FieldSceneLike;
  if (fieldScene.areaId === 'forest' && fieldScene.spawnId === 'fromVael' && fieldScene.player && fieldScene.player.x < 110) {
    fieldScene.player.setPosition(4.5 * 32, 10.5 * 32);
  }
}
