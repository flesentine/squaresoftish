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

  if (fieldScene.areaId !== 'forest') return;

  fieldScene.blockers?.clear(true, true);

  if (fieldScene.player) {
    const body = fieldScene.player.body as Phaser.Physics.Arcade.Body | undefined;
    body?.setSize(10, 10);
    body?.setOffset(11, 18);
    if (body) {
      body.checkCollision.none = true;
    }

    if (fieldScene.spawnId === 'fromVael' && fieldScene.player.x < 210) {
      fieldScene.player.setPosition(5.5 * 32, 10.5 * 32);
    }
  }
}
