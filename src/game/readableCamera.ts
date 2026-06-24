import Phaser from 'phaser';

export function keepFieldUiReadable(scene: Phaser.Scene): void {
  const camera = scene.cameras.main;
  camera.setZoom(1);
}
