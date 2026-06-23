import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import type { DialogueLine, DialogueScript } from '../types/game';

export class DialogueSystem {
  private scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;
  private speakerText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private promptText?: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  start(script: DialogueScript): void {
    if (script.lines.length === 0) return;

    this.lines = script.lines;
    this.index = 0;
    this.isOpen = true;
    this.createBox();
    this.renderCurrentLine();
  }

  advance(): void {
    if (!this.isOpen) return;

    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }

    this.renderCurrentLine();
  }

  close(): void {
    this.container?.destroy(true);
    this.container = undefined;
    this.isOpen = false;
    this.lines = [];
    this.index = 0;
  }

  private createBox(): void {
    this.container?.destroy(true);

    const margin = 32;
    const boxWidth = GAME_WIDTH - margin * 2;
    const boxHeight = 156;
    const x = margin;
    const y = GAME_HEIGHT - boxHeight - 24;
    const textWidth = boxWidth - 40;

    const shadow = this.scene.add.rectangle(5, 5, boxWidth, boxHeight, 0x000000, 0.42).setOrigin(0);
    const panel = this.scene.add.rectangle(0, 0, boxWidth, boxHeight, 0x10192f, 0.96).setOrigin(0);
    panel.setStrokeStyle(3, 0xd9c879);

    this.speakerText = this.scene.add.text(20, 14, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffe58a',
      fixedWidth: textWidth
    });

    this.bodyText = this.scene.add.text(20, 50, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f6f1de',
      fixedWidth: textWidth,
      fixedHeight: 72,
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: 5
    });

    this.promptText = this.scene.add.text(boxWidth - 20, boxHeight - 22, 'E / Space', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#9fb7ff'
    }).setOrigin(1, 0.5);

    const dialogueObjects = [shadow, panel, this.speakerText, this.bodyText, this.promptText];
    dialogueObjects.forEach((object) => object.setScrollFactor(0, 0));

    this.container = this.scene.add.container(x, y, dialogueObjects);
    this.container.setScrollFactor(0, 0);
    this.container.setDepth(1000);
  }

  private renderCurrentLine(): void {
    const line = this.lines[this.index];
    this.speakerText?.setText(line.speaker);
    this.bodyText?.setText(line.text);
  }
}
