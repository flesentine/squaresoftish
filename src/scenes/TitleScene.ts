import Phaser from 'phaser';
import { audioManager } from '../systems/audio';
import { gameState } from '../systems/gameState';
import { saveManager } from '../systems/save';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;
const OPTIONS = ['New Game', 'Continue', 'Controls'] as const;

type TitleOption = (typeof OPTIONS)[number];

export class TitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private detailText!: Phaser.GameObjects.Text;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyConfirm!: Phaser.Input.Keyboard.Key;
  private keyConfirmAlt!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    audioManager.playMusic('title');
    this.createControls();
    this.createBackdrop();
    this.createTitle();
    this.createMenu();
    this.renderMenu();
    this.cameras.main.fadeIn(500, 4, 6, 14);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyUp)) this.moveSelection(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keyDown)) this.moveSelection(1);

    if (Phaser.Input.Keyboard.JustDown(this.keyConfirm) || Phaser.Input.Keyboard.JustDown(this.keyConfirmAlt)) {
      this.confirmSelection();
    }
  }

  private createControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable.');

    this.keyUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyConfirm = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyConfirmAlt = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private createBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x080b17, 1).setOrigin(0);

    for (let i = 0; i < 56; i += 1) {
      const x = (i * 97) % GAME_WIDTH;
      const y = (i * 53) % GAME_HEIGHT;
      const alpha = 0.18 + ((i % 5) * 0.05);
      this.add.rectangle(x, y, 2, 2, 0xdce8ff, alpha).setOrigin(0.5);
    }

    this.add.rectangle(22, 22, GAME_WIDTH - 44, GAME_HEIGHT - 44, 0x101424, 0.72).setOrigin(0).setStrokeStyle(2, 0xffd07a, 1);
    this.add.rectangle(42, 196, GAME_WIDTH - 84, 106, 0x0c1020, 0.92).setOrigin(0).setStrokeStyle(1, 0x42506f, 1);

    const skywell = this.add.circle(GAME_WIDTH / 2, 84, 36, 0x4fc3ff, 0.2).setStrokeStyle(2, 0x9ee8ff, 0.7);
    this.tweens.add({
      targets: skywell,
      alpha: 0.45,
      scale: 1.12,
      duration: 1400,
      yoyo: true,
      repeat: -1
    });
  }

  private createTitle(): void {
    this.add.text(GAME_WIDTH / 2, 52, 'THE LAST', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#fff1ad'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 92, 'SKYWELL', {
      fontFamily: 'monospace',
      fontSize: '42px',
      color: '#ffe39b'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 132, 'A 1993-style JRPG prototype', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b8c7e8'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 326, 'Up/Down choose  •  Enter/Space select', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#98a7ca'
    }).setOrigin(0.5);
  }

  private createMenu(): void {
    OPTIONS.forEach((_option, index) => {
      const text = this.add.text(96, 214 + index * 24, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d9e1ff'
      });
      this.optionTexts.push(text);
    });

    this.detailText = this.add.text(310, 214, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fff7d6',
      fixedWidth: 246,
      wordWrap: { width: 246, useAdvancedWrap: true },
      lineSpacing: 4
    });
  }

  private moveSelection(direction: number): void {
    audioManager.unlock();
    audioManager.playMusic('title');
    audioManager.playSfx('menu');
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, OPTIONS.length);
    this.renderMenu();
  }

  private confirmSelection(): void {
    audioManager.unlock();
    audioManager.playMusic('title');
    audioManager.playSfx('confirm');

    const selected = OPTIONS[this.selectedIndex];
    if (selected === 'New Game') {
      gameState.reset();
      this.startGame();
      return;
    }

    if (selected === 'Continue') {
      const result = saveManager.load();
      if (!result.ok) {
        audioManager.playSfx('error');
        this.detailText.setText('No save file yet. Choose New Game to begin Chapter 1.');
        return;
      }
      this.startGame();
      return;
    }

    this.detailText.setText('Move: WASD / Arrows\nTalk: E / Space / Enter\nMenu: M\nBattle test: B');
  }

  private startGame(): void {
    this.cameras.main.fadeOut(300, 4, 6, 14);
    this.time.delayedCall(310, () => this.scene.start('GameScene'));
  }

  private renderMenu(): void {
    const hasSave = saveManager.getSummary().exists;

    this.optionTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      const option = OPTIONS[index];
      const disabled = option === 'Continue' && !hasSave;
      const label = disabled ? `${option} — no save` : option;
      text.setText(`${selected ? '▶' : ' '} ${label}`);
      text.setColor(selected ? '#fff1ad' : disabled ? '#65708f' : '#d9e1ff');
    });

    this.detailText.setText(this.getDetailText(OPTIONS[this.selectedIndex], hasSave));
  }

  private getDetailText(option: TitleOption, hasSave: boolean): string {
    if (option === 'New Game') return 'Begin Chapter 1: The Waking Sky from the Vael wind festival.';
    if (option === 'Continue') return hasSave ? 'Load your browser save and return to the last saved position.' : 'No save file found yet.';
    return 'Show the basic controls for field, menu, and test battle.';
  }
}
