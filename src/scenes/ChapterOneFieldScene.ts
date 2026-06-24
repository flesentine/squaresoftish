import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { keepFieldUiReadable } from '../game/readableCamera';
import { audioManager } from '../systems/audio';

export class ChapterOneFieldScene extends GameScene {
  private menuKey!: Phaser.Input.Keyboard.Key;

  create(): void {
    super.create();
    keepFieldUiReadable(this);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable.');
    this.menuKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  update(): void {
    super.update();

    if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
      audioManager.unlock();
      audioManager.playSfx('menu');
      this.scene.launch('MenuScene');
      this.scene.pause('GameScene');
    }
  }
}
