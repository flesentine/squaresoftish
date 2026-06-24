import Phaser from 'phaser';
import { CHAPTER1_STORY } from '../data/chapter1Story';
import { audioManager } from '../systems/audio';
import { gameState, type HeroId } from '../systems/gameState';
import { saveManager, type SaveSlotSummary } from '../systems/save';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;
const TABS = ['Story', 'Status', 'Items', 'Save/Load', 'Options'] as const;

type TabName = (typeof TABS)[number];
type MenuMode = 'tabs' | 'items-target';
type MenuFocus = 'tabs' | 'content';

type MenuOption = {
  label: string;
  hint?: string;
  action: () => void;
};

export class MenuScene extends Phaser.Scene {
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyConfirm!: Phaser.Input.Keyboard.Key;
  private keyConfirmAlt!: Phaser.Input.Keyboard.Key;
  private keyCancel!: Phaser.Input.Keyboard.Key;
  private keyMenu!: Phaser.Input.Keyboard.Key;

  private activeTabIndex = 0;
  private selectedIndex = 0;
  private mode: MenuMode = 'tabs';
  private focus: MenuFocus = 'tabs';
  private itemUseId: string | null = null;

  private titleText!: Phaser.GameObjects.Text;
  private tabTexts: Phaser.GameObjects.Text[] = [];
  private contentTexts: Phaser.GameObjects.Text[] = [];
  private helpText!: Phaser.GameObjects.Text;
  private noticeText!: Phaser.GameObjects.Text;
  private options: MenuOption[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    audioManager.playMusic('menu');
    this.cameras.main.fadeIn(140, 5, 8, 18);
    this.createControls();
    this.createFrame();
    this.render();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyMenu)) {
      this.closeMenu();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyCancel)) {
      this.handleCancel();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyUp)) this.handleVerticalInput(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keyDown)) this.handleVerticalInput(1);

    if (Phaser.Input.Keyboard.JustDown(this.keyRight) && this.mode === 'tabs' && this.focus === 'tabs') {
      this.enterContent();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyLeft) && this.mode === 'tabs' && this.focus === 'content') {
      this.returnToTabs();
    }

    if (this.didPressConfirm()) {
      this.confirmSelection();
    }
  }

  private createControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable.');

    this.keyUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyConfirm = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyConfirmAlt = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyCancel = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyMenu = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  private didPressConfirm(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keyConfirm) || Phaser.Input.Keyboard.JustDown(this.keyConfirmAlt);
  }

  private createFrame(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x060814, 0.78).setOrigin(0);
    this.add.rectangle(18, 16, GAME_WIDTH - 36, GAME_HEIGHT - 32, 0x151827, 0.98).setOrigin(0);
    this.add.rectangle(18, 16, GAME_WIDTH - 36, GAME_HEIGHT - 32).setOrigin(0).setStrokeStyle(2, 0xffd07a, 1);
    this.add.rectangle(28, 66, 168, 252, 0x0d1020, 0.95).setOrigin(0).setStrokeStyle(1, 0x42506f, 1);
    this.add.rectangle(210, 66, 402, 252, 0x0d1020, 0.95).setOrigin(0).setStrokeStyle(1, 0x42506f, 1);

    this.titleText = this.add.text(34, 28, 'THE LAST SKYWELL', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ffe39b'
    });

    this.add.text(466, 30, 'M: close  •  Esc: back', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#98a7ca'
    });

    this.helpText = this.add.text(34, 326, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#98a7ca',
      fixedWidth: 560
    });

    this.noticeText = this.add.text(210, 326, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#fff7d6',
      fixedWidth: 402
    });
  }

  private handleCancel(): void {
    if (this.mode === 'items-target') {
      audioManager.playSfx('cancel');
      this.mode = 'tabs';
      this.focus = 'content';
      this.itemUseId = null;
      this.activeTabIndex = TABS.indexOf('Items');
      this.selectedIndex = 0;
      this.render();
      return;
    }

    if (this.focus === 'content') {
      this.returnToTabs();
      return;
    }

    this.closeMenu();
  }

  private handleVerticalInput(direction: number): void {
    if (this.mode === 'items-target' || this.focus === 'content') {
      this.moveSelection(direction);
      return;
    }

    this.changeTab(direction);
  }

  private confirmSelection(): void {
    if (this.mode === 'tabs' && this.focus === 'tabs') {
      this.enterContent();
      return;
    }

    const option = this.options[this.selectedIndex];
    if (!option) return;

    audioManager.playSfx('confirm');
    option.action();
  }

  private enterContent(): void {
    audioManager.playSfx('confirm');
    this.focus = 'content';
    this.selectedIndex = 0;
    this.render();
  }

  private returnToTabs(): void {
    audioManager.playSfx('cancel');
    this.mode = 'tabs';
    this.focus = 'tabs';
    this.itemUseId = null;
    this.selectedIndex = 0;
    this.render();
  }

  private changeTab(direction: number): void {
    audioManager.playSfx('menu');
    this.activeTabIndex = Phaser.Math.Wrap(this.activeTabIndex + direction, 0, TABS.length);
    this.mode = 'tabs';
    this.focus = 'tabs';
    this.itemUseId = null;
    this.selectedIndex = 0;
    this.render();
  }

  private moveSelection(direction: number): void {
    if (this.options.length <= 0) return;
    audioManager.playSfx('menu');
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, this.options.length);
    this.renderContent();
  }

  private render(): void {
    this.renderTabs();
    this.renderContent();
  }

  private renderTabs(): void {
    this.tabTexts.forEach((text) => text.destroy());
    this.tabTexts = [];

    TABS.forEach((tab, index) => {
      const active = index === this.activeTabIndex;
      const prefix = active ? (this.focus === 'tabs' && this.mode === 'tabs' ? '▶ ' : '◆ ') : '  ';
      const text = this.add.text(42, 80 + index * 25, `${prefix}${tab}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: active ? '#fff1ad' : '#d9e1ff'
      });
      this.tabTexts.push(text);
    });

    const state = gameState.snapshot;
    const footer = this.add.text(42, 242, `Gold ${state.gold}G\nTime ${this.formatTime(state.field.playTimeSeconds)}\nMap  ${state.field.mapId}`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#b8c7e8',
      lineSpacing: 8
    });
    this.tabTexts.push(footer);
  }

  private renderContent(): void {
    this.contentTexts.forEach((text) => text.destroy());
    this.contentTexts = [];
    this.options = [];

    const activeTab = TABS[this.activeTabIndex];
    if (this.mode === 'items-target') {
      this.renderItemTargetContent();
    } else if (activeTab === 'Story') {
      this.renderStoryContent();
    } else if (activeTab === 'Status') {
      this.renderStatusContent();
    } else if (activeTab === 'Items') {
      this.renderItemsContent();
    } else if (activeTab === 'Save/Load') {
      this.renderSaveLoadContent();
    } else {
      this.renderOptionsContent();
    }

    this.helpText.setText(this.getHelpText());
    this.noticeText.setText(this.getNoticeText());
  }

  private renderStoryContent(): void {
    this.addContentText(226, 82, CHAPTER1_STORY.title.toUpperCase(), '#ffe39b', 13);
    this.addContentText(226, 102, CHAPTER1_STORY.subtitle, '#b8c7e8', 9);
    this.addContentText(226, 124, `Now: ${CHAPTER1_STORY.currentObjective}`, '#fff7d6', 10);

    this.options = CHAPTER1_STORY.beats.map((beat, index) => ({
      label: `${index + 1}. ${beat}`,
      hint: index === 0 ? CHAPTER1_STORY.synopsis : beat,
      action: () => this.setNotice(beat)
    }));

    this.drawOptions(226, 156, 18, 360, 9);
  }

  private renderStatusContent(): void {
    this.addContentText(226, 82, 'PARTY STATUS', '#ffe39b', 13);

    gameState.snapshot.party.forEach((hero, index) => {
      const y = 112 + index * 58;
      this.addContentText(230, y, `${hero.name}  Lv ${hero.level}  ${hero.status}`, '#fff7d6', 11);
      this.addContentText(230, y + 16, `HP ${hero.hp}/${hero.maxHp}    MP ${hero.mp}/${hero.maxMp}`, '#cce8ff', 10);
      this.addContentText(230, y + 30, `ATK ${hero.attack}  DEF ${hero.defense}  SPD ${hero.speed}`, '#c8ffd8', 10);
      this.addContentText(230, y + 44, hero.role, '#98a7ca', 9);
    });

    this.options = [
      {
        label: 'Close status',
        hint: 'Press Enter to close the menu, or Esc/Left to return to the section list.',
        action: () => this.closeMenu()
      }
    ];
  }

  private renderItemsContent(): void {
    this.addContentText(226, 82, 'INVENTORY', '#ffe39b', 13);
    const inventory = gameState.getInventoryWithDefinitions();

    if (inventory.length === 0) {
      this.addContentText(230, 114, 'No items.', '#d9e1ff', 10);
    }

    this.options = inventory.map((item) => ({
      label: `${item.name.padEnd(14, ' ')} x${item.quantity}`,
      hint: `${item.description}. Select to choose a party member.`,
      action: () => {
        if (item.quantity <= 0) {
          audioManager.playSfx('error');
          this.setNotice(`${item.name} is gone.`);
          return;
        }
        this.itemUseId = item.id;
        this.mode = 'items-target';
        this.focus = 'content';
        this.selectedIndex = 0;
        this.render();
      }
    }));

    this.drawOptions(230, 114, 20);
  }

  private renderItemTargetContent(): void {
    const item = this.itemUseId ? gameState.getItemDefinition(this.itemUseId) : null;
    this.addContentText(226, 82, `USE ${item?.name.toUpperCase() ?? 'ITEM'}`, '#ffe39b', 13);
    this.addContentText(230, 104, 'Choose a party member.', '#d9e1ff', 10);

    this.options = gameState.snapshot.party.map((hero) => ({
      label: `${hero.name.padEnd(7, ' ')} HP ${hero.hp}/${hero.maxHp} ${hero.status}`,
      hint: item?.description ?? '',
      action: () => {
        if (!this.itemUseId) return;
        const result = gameState.useHealingItem(this.itemUseId, hero.id as HeroId);
        if (!result.ok) {
          audioManager.playSfx('error');
          this.setNotice(result.reason);
          return;
        }

        audioManager.playSfx('heal');
        this.mode = 'tabs';
        this.focus = 'content';
        this.itemUseId = null;
        this.activeTabIndex = TABS.indexOf('Items');
        this.selectedIndex = 0;
        this.render();
        this.setNotice(`${result.heroName} recovered ${result.healed} HP.`);
      }
    }));

    this.drawOptions(230, 130, 22);
  }

  private renderSaveLoadContent(): void {
    const summary = saveManager.getSummary();
    this.addContentText(226, 82, 'SAVE / LOAD', '#ffe39b', 13);
    this.addContentText(230, 108, this.describeSave(summary), '#d9e1ff', 10);

    this.options = [
      {
        label: 'Save game',
        hint: 'Stores map position, party HP/MP, inventory, gold, flags, options, and play time.',
        action: () => {
          saveManager.save();
          audioManager.playSfx('save');
          this.render();
          this.setNotice('Game saved.');
        }
      },
      {
        label: 'Load game',
        hint: 'Loads the local browser save and restarts the field scene at the saved position.',
        action: () => {
          const result = saveManager.load();
          if (!result.ok) {
            audioManager.playSfx('error');
            this.setNotice(result.reason);
            return;
          }

          audioManager.playSfx('load');
          this.registry.set('menuMessage', 'Loaded saved game.');
          this.scene.stop('GameScene');
          this.scene.start('GameScene');
          this.scene.stop('MenuScene');
        }
      },
      {
        label: 'Erase save',
        hint: 'Clears the browser save slot. The current run keeps going.',
        action: () => {
          saveManager.erase();
          audioManager.playSfx('cancel');
          this.render();
          this.setNotice('Save erased.');
        }
      }
    ];

    this.drawOptions(230, 178, 22);
  }

  private renderOptionsContent(): void {
    const { options } = gameState.snapshot;
    this.addContentText(226, 82, 'OPTIONS', '#ffe39b', 13);

    this.options = [
      {
        label: `Music      ${options.musicEnabled ? 'ON' : 'OFF'}`,
        hint: 'Toggle generated music loops.',
        action: () => {
          const enabled = gameState.toggleMusic();
          if (enabled) audioManager.playMusic('menu');
          audioManager.refreshMusicState();
          this.render();
        }
      },
      {
        label: `SFX        ${options.sfxEnabled ? 'ON' : 'OFF'}`,
        hint: 'Toggle generated sound effects.',
        action: () => {
          gameState.toggleSfx();
          this.render();
        }
      },
      {
        label: `Text speed ${options.textSpeed}`,
        hint: 'Placeholder option stored in save data for the dialogue system pass.',
        action: () => {
          gameState.cycleTextSpeed();
          audioManager.playSfx('menu');
          this.render();
        }
      }
    ];

    this.drawOptions(230, 114, 24);
  }

  private drawOptions(x: number, y: number, rowHeight: number, width = 368, fontSize = 11): void {
    this.options.forEach((option, index) => {
      const selected = this.focus === 'content' && index === this.selectedIndex;
      this.addContentText(x, y + index * rowHeight, `${selected ? '▶' : ' '} ${option.label}`, selected ? '#fff1ad' : '#d9e1ff', fontSize, width);
    });
  }

  private addContentText(x: number, y: number, text: string, color: string, fontSize: number, width = 368): Phaser.GameObjects.Text {
    const textObject = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      color,
      fixedWidth: width,
      wordWrap: { width, useAdvancedWrap: true }
    });
    this.contentTexts.push(textObject);
    return textObject;
  }

  private getHelpText(): string {
    if (this.mode === 'items-target') return 'Up/Down choose hero  •  Enter use item  •  Esc back';
    if (this.focus === 'tabs') return 'Up/Down choose section  •  Enter open section  •  M close';
    return 'Up/Down choose command  •  Enter select  •  Left/Esc back  •  M close';
  }

  private getNoticeText(): string {
    if (this.focus === 'tabs' && this.mode === 'tabs') return 'Choose a menu section.';
    if (this.options.length === 0) return '';
    return this.options[this.selectedIndex]?.hint ?? '';
  }

  private describeSave(summary: SaveSlotSummary): string {
    if (!summary.exists) return 'Slot 1: Empty';
    const savedDate = summary.savedAt ? new Date(summary.savedAt).toLocaleString() : 'Unknown time';
    return `Slot 1: ${summary.mapId ?? 'Unknown map'}\nSaved: ${savedDate}\nGold: ${summary.gold ?? 0}G  Time: ${this.formatTime(summary.playTimeSeconds ?? 0)}`;
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private setNotice(message: string): void {
    this.noticeText.setText(message);
  }

  private closeMenu(): void {
    audioManager.playSfx('cancel');
    audioManager.playMusic('field');
    this.scene.stop('MenuScene');
    this.scene.resume('GameScene');
  }
}
