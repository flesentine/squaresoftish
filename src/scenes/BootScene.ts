import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createRectTexture('player', 18, 24, 0x4fb7ff, 0xffffff);
    this.createRectTexture('npc', 18, 24, 0xf5c05a, 0x5a351a);
    this.createRectTexture('chest', 22, 16, 0x9a5a2f, 0xe3b15f);
    this.createRectTexture('shrine', 28, 36, 0x6cc7c8, 0xd7ffff);
    this.createRectTexture('monster', 42, 34, 0x6b3fa0, 0xf3c7ff);
    this.createRectTexture('spark', 8, 8, 0xfff1a8);

    this.scene.start('TitleScene');
  }

  private createRectTexture(key: string, width: number, height: number, fill: number, stroke?: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(fill, 1);
    graphics.fillRect(0, 0, width, height);

    if (stroke !== undefined) {
      graphics.lineStyle(2, stroke, 1);
      graphics.strokeRect(1, 1, width - 2, height - 2);
    }

    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
}
