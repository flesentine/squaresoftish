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

    const boxWidth = GAME_WIDTH - 80;
    const boxHeight = 132;
    const x = 40;
    const y = GAME_HEIGHT - boxHeight - 32;

    const panel = this.scene.add.rectangle(x, y, boxWidth, boxHeight, 0x10192f, 0.96).setOrigin(0);
    panel.setStrokeStyle(3, 0xd9c879);

    this.speakerText = this.scene.add.text(x + 20, y + 14, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffe58a'
    });

    this.bodyText = this.scene.add.text(x + 20, y + 48, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f6f1de',
      wordWrap: { width: boxWidth - 40 }
    });

    this.promptText = this.scene.add.text(x + boxWidth - 132, y + boxHeight - 28, 'E / Space', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fb7ff'
    });

    this.container = this.scene.add.container(0, 0, [panel, this.speakerText, this.bodyText, this.promptText]);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);
  }

  private renderCurrentLine(): void {
    const line = this.lines[this.index];
    this.speakerText?.setText(line.speaker);
    this.bodyText?.setText(line.text);
  }
}
