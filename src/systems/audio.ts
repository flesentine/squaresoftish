import Phaser from 'phaser';

export class AudioSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playConfirm(): void {
    // Placeholder for future UI SFX.
    this.scene.sound.unlock();
  }

  playBattleStart(): void {
    // Placeholder for future battle sting.
    this.scene.sound.unlock();
  }
}
