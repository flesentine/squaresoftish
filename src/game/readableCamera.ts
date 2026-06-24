import Phaser from 'phaser';

type FieldSceneLike = Phaser.Scene & {
  areaId?: string;
  spawnId?: string;
  player?: Phaser.Physics.Arcade.Sprite;
  blockers?: Phaser.Physics.Arcade.StaticGroup;
};

export function keepFieldUiReadable(scene: Phaser.Scene): void {
  const camera = scene.cameras.main;
  camera.setZoom(1);

  const fieldScene = scene as FieldSceneLike;

  if (fieldScene.areaId === 'forest') {
    fieldScene.blockers?.clear(true, true);
  }

  if (fieldScene.areaId === 'forest' && fieldScene.spawnId === 'fromVael' && fieldScene.player && fieldScene.player.x < 170) {
    fieldScene.player.setPosition(4.5 * 32, 10.5 * 32);
  }
}
