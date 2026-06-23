import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { createNewSave, SaveSystem } from '../systems/save';

export class TitleScene extends Phaser.Scene {
  private choiceIndex = 0;
  private choices = ['New Game', 'Load Game'];
  private choiceText: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#07111f');

    this.add.text(GAME_WIDTH / 2, 90, 'THE LAST SKYWELL', {
      fontFamily: 'monospace',
      fontSize: '54px',
      color: '#ffe58a',
      stroke: '#1b2440',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 152, 'Phaser 3 + TypeScript starter', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#9fb7ff'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 210, 'A ruined sky-tech shrine is waking beneath Vael.', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f6f1de'
    }).setOrigin(0.5);

    this.choiceText = this.choices.map((choice, index) => {
      return this.add.text(GAME_WIDTH / 2, 300 + index * 42, choice, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff'
      }).setOrigin(0.5);
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 72, 'Arrow keys + Enter', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8090b8'
    }).setOrigin(0.5);

    this.updateChoices();

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-UP', () => this.moveChoice(-1));
    keyboard?.on('keydown-W', () => this.moveChoice(-1));
    keyboard?.on('keydown-DOWN', () => this.moveChoice(1));
    keyboard?.on('keydown-S', () => this.moveChoice(1));
    keyboard?.on('keydown-ENTER', () => this.confirm());
    keyboard?.on('keydown-SPACE', () => this.confirm());
  }

  private moveChoice(delta: number): void {
    this.choiceIndex = Phaser.Math.Wrap(this.choiceIndex + delta, 0, this.choices.length);
    this.updateChoices();
  }

  private updateChoices(): void {
    this.choiceText.forEach((text, index) => {
      const selected = index === this.choiceIndex;
      text.setText(`${selected ? '▶ ' : '  '}${this.choices[index]}`);
      text.setColor(selected ? '#ffe58a' : '#ffffff');
    });
  }

  private confirm(): void {
    if (this.choiceIndex === 0) {
      this.registry.set('gameState', createNewSave());
      this.scene.start('FieldScene');
      return;
    }

    const loaded = SaveSystem.load();
    if (loaded) {
      this.registry.set('gameState', loaded);
      this.scene.start('FieldScene');
      return;
    }

    this.flashMessage('No save file yet. Start a new game.');
  }

  private flashMessage(message: string): void {
    const text = this.add.text(GAME_WIDTH / 2, 430, message, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ff8f8f'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 900,
      duration: 450,
      onComplete: () => text.destroy()
    });
  }
}
