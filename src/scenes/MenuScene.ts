import Phaser from 'phaser';
import items from '../data/items.json';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { SaveSystem } from '../systems/save';
import type { ItemData, SaveState } from '../types/game';

export class MenuScene extends Phaser.Scene {
  private state!: SaveState;
  private options = ['Resume', 'Save', 'Load', 'Title'];
  private optionIndex = 0;
  private optionText: Phaser.GameObjects.Text[] = [];
  private messageText!: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.state = this.registry.get('gameState') as SaveState;

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62).setOrigin(0);
    const panel = this.add.rectangle(64, 42, GAME_WIDTH - 128, GAME_HEIGHT - 84, 0x10192f, 0.98).setOrigin(0);
    panel.setStrokeStyle(3, 0xd9c879);

    this.add.text(96, 76, 'Menu', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#ffe58a'
    });

    this.renderParty();
    this.renderInventory();
    this.renderOptions();

    this.messageText = this.add.text(96, GAME_HEIGHT - 86, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#9fb7ff'
    });

    this.input.keyboard?.on('keydown-UP', () => this.moveOption(-1));
    this.input.keyboard?.on('keydown-W', () => this.moveOption(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveOption(1));
    this.input.keyboard?.on('keydown-S', () => this.moveOption(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.closeMenu());
    this.input.keyboard?.on('keydown-M', () => this.closeMenu());

    overlay.setInteractive();
  }

  private renderParty(): void {
    this.add.text(96, 132, 'Party', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff'
    });

    this.state.party.forEach((hero, index) => {
      this.add.text(96, 168 + index * 34, `${hero.name.padEnd(8)} Lv ${hero.level}  HP ${hero.hp}/${hero.maxHp}  MP ${hero.mp}/${hero.maxMp}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f6f1de'
      });
    });
  }

  private renderInventory(): void {
    const itemData = items as ItemData[];

    this.add.text(96, 308, 'Inventory', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff'
    });

    const lines = this.state.inventory.map((stack) => {
      const item = itemData.find((entry) => entry.id === stack.itemId);
      return `${item?.name ?? stack.itemId} x${stack.quantity}`;
    });

    const content = lines.length > 0 ? lines.join('\n') : 'Empty';
    this.add.text(96, 346, content, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f6f1de',
      lineSpacing: 8
    });
  }

  private renderOptions(): void {
    this.optionText = this.options.map((option, index) => {
      return this.add.text(GAME_WIDTH - 292, 146 + index * 42, option, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffffff'
      });
    });

    this.updateOptions();
  }

  private moveOption(delta: number): void {
    this.optionIndex = Phaser.Math.Wrap(this.optionIndex + delta, 0, this.options.length);
    this.updateOptions();
  }

  private updateOptions(): void {
    this.optionText.forEach((text, index) => {
      const selected = index === this.optionIndex;
      text.setText(`${selected ? '▶ ' : '  '}${this.options[index]}`);
      text.setColor(selected ? '#ffe58a' : '#ffffff');
    });
  }

  private confirm(): void {
    const option = this.options[this.optionIndex];

    if (option === 'Resume') {
      this.closeMenu();
      return;
    }

    if (option === 'Save') {
      SaveSystem.save(this.state);
      this.messageText.setText('Saved.');
      return;
    }

    if (option === 'Load') {
      const loaded = SaveSystem.load();
      if (!loaded) {
        this.messageText.setText('No save file found.');
        return;
      }

      this.registry.set('gameState', loaded);
      this.scene.stop('FieldScene');
      this.scene.start('FieldScene');
      return;
    }

    this.scene.stop('FieldScene');
    this.scene.start('TitleScene');
  }

  private closeMenu(): void {
    this.scene.resume('FieldScene');
    this.scene.stop();
  }
}
