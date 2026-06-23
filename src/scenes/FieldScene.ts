import Phaser from 'phaser';
import introDialogue from '../data/dialogue/intro.json';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { DialogueSystem } from '../systems/dialogue';
import { FlagsSystem } from '../systems/flags';
import { InventorySystem } from '../systems/inventory';
import { createNewSave } from '../systems/save';
import type { DialogueScript, Direction, SaveState } from '../types/game';

type InteractableKind = 'elder' | 'chest' | 'shrine';

interface Interactable {
  kind: InteractableKind;
  object: Phaser.GameObjects.Image;
  label: string;
}

export class FieldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private dialogue!: DialogueSystem;
  private state!: SaveState;
  private interactables: Interactable[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private speed = 145;
  private facing: Direction = 'down';

  constructor() {
    super('FieldScene');
  }

  create(data?: { x?: number; y?: number }): void {
    this.state = this.registry.get('gameState') ?? createNewSave();
    this.registry.set('gameState', this.state);

    this.cameras.main.setBackgroundColor('#13251f');
    this.physics.world.setBounds(0, 0, 1920, 1080);

    this.drawGround();
    this.createPlayer(data?.x ?? this.state.position.x, data?.y ?? this.state.position.y);
    this.createWalls();
    this.createInteractables();
    this.createHud();

    this.dialogue = new DialogueSystem(this);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

    this.input.keyboard?.on('keydown-E', () => this.handleInteract());
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInteract());
    this.input.keyboard?.on('keydown-M', () => this.openMenu());
    this.input.keyboard?.on('keydown-ESC', () => this.openMenu());

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 1920, 1080);
  }

  update(): void {
    if (this.dialogue.isOpen) {
      this.player.setVelocity(0, 0);
      return;
    }

    this.updateMovement();
    this.updateInteractionPrompt();

    this.state.position = {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y)
    };
    this.state.facing = this.facing;
  }

  private drawGround(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x193629, 1);
    graphics.fillRect(0, 0, 1920, 1080);

    for (let x = 0; x < 1920; x += 48) {
      for (let y = 0; y < 1080; y += 48) {
        const shade = (x / 48 + y / 48) % 2 === 0 ? 0x1f4230 : 0x1a392b;
        graphics.fillStyle(shade, 1);
        graphics.fillRect(x, y, 48, 48);
      }
    }

    graphics.lineStyle(1, 0x284b39, 0.45);
    for (let x = 0; x <= 1920; x += 48) graphics.lineBetween(x, 0, x, 1080);
    for (let y = 0; y <= 1080; y += 48) graphics.lineBetween(0, y, 1920, y);
  }

  private createWalls(): void {
    const walls = this.physics.add.staticGroup();

    const addWall = (x: number, y: number, width: number, height: number) => {
      const wall = this.add.rectangle(x, y, width, height, 0x243447).setOrigin(0.5);
      wall.setStrokeStyle(2, 0x3f5876);
      this.physics.add.existing(wall, true);
      walls.add(wall);
    };

    addWall(960, 28, 1780, 56);
    addWall(960, 1052, 1780, 56);
    addWall(28, 540, 56, 980);
    addWall(1892, 540, 56, 980);
    addWall(520, 280, 280, 64);
    addWall(1180, 448, 360, 64);
    addWall(760, 760, 480, 64);
    addWall(1540, 710, 70, 300);

    this.physics.add.collider(this.player, walls);
  }

  private createInteractables(): void {
    const elder = this.add.image(330, 300, 'npc').setScale(2);
    const chest = this.add.image(650, 220, 'chest').setScale(2);
    const shrine = this.add.image(1340, 360, 'shrine').setScale(2);

    this.interactables = [
      { kind: 'elder', object: elder, label: 'Talk' },
      { kind: 'chest', object: chest, label: FlagsSystem.has(this.state, 'opened_vael_chest') ? 'Empty' : 'Open' },
      { kind: 'shrine', object: shrine, label: FlagsSystem.has(this.state, 'defeated_first_wisp') ? 'Quiet Shrine' : 'Enter Battle' }
    ];

    this.add.text(274, 328, 'Elder Mara', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffe58a'
    });

    this.add.text(1282, 414, 'Cave Shrine', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#bdfcff'
    });
  }

  private createPlayer(x: number, y: number): void {
    this.player = this.physics.add.sprite(x, y, 'player').setScale(2);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(18, 18).setOffset(0, 6);
  }

  private createHud(): void {
    this.hudText = this.add.text(18, 14, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f6f1de'
    }).setScrollFactor(0).setDepth(900);

    this.promptText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffe58a',
      backgroundColor: '#10192fcc',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(900);

    this.updateHud();
  }

  private updateHud(): void {
    const shard = FlagsSystem.has(this.state, 'defeated_first_wisp') ? 'Sky Shard found' : 'Find the shrine';
    this.hudText.setText(`Vael Field  |  Gold ${this.state.gold}  |  ${shard}  |  M: Menu`);
  }

  private updateMovement(): void {
    const left = this.cursors.left?.isDown || this.wasd.A.isDown;
    const right = this.cursors.right?.isDown || this.wasd.D.isDown;
    const up = this.cursors.up?.isDown || this.wasd.W.isDown;
    const down = this.cursors.down?.isDown || this.wasd.S.isDown;

    const velocity = new Phaser.Math.Vector2(0, 0);
    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.speed);
      if (Math.abs(velocity.x) > Math.abs(velocity.y)) this.facing = velocity.x < 0 ? 'left' : 'right';
      else this.facing = velocity.y < 0 ? 'up' : 'down';
    }

    this.player.setVelocity(velocity.x, velocity.y);
  }

  private updateInteractionPrompt(): void {
    const nearby = this.getNearbyInteractable();
    if (!nearby) {
      this.promptText.setText('');
      return;
    }

    this.promptText.setText(`${nearby.label}: E / Space`);
  }

  private handleInteract(): void {
    if (this.dialogue.isOpen) {
      this.dialogue.advance();
      return;
    }

    const nearby = this.getNearbyInteractable();
    if (!nearby) return;

    switch (nearby.kind) {
      case 'elder':
        this.dialogue.start(introDialogue as DialogueScript);
        break;
      case 'chest':
        this.openChest(nearby);
        break;
      case 'shrine':
        this.enterShrineBattle();
        break;
    }
  }

  private openChest(interactable: Interactable): void {
    if (FlagsSystem.has(this.state, 'opened_vael_chest')) {
      this.showToast('The chest is empty.');
      return;
    }

    InventorySystem.addItem(this.state, 'potion', 2);
    FlagsSystem.set(this.state, 'opened_vael_chest');
    interactable.label = 'Empty';
    this.showToast('Found 2 Moonleaf Tonics.');
  }

  private enterShrineBattle(): void {
    if (FlagsSystem.has(this.state, 'defeated_first_wisp')) {
      this.showToast('The shrine is quiet now.');
      return;
    }

    this.registry.set('gameState', this.state);
    this.scene.start('BattleScene', {
      enemyId: 'gloom_wisp',
      returnPosition: { x: this.player.x - 48, y: this.player.y + 48 }
    });
  }

  private getNearbyInteractable(): Interactable | undefined {
    return this.interactables.find((entry) => {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.object.x, entry.object.y) < 84;
    });
  }

  private showToast(message: string): void {
    const toast = this.add.text(GAME_WIDTH / 2, 82, message, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#10192fcc',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1200);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: 62,
      delay: 900,
      duration: 500,
      onComplete: () => toast.destroy()
    });

    this.updateHud();
  }

  private openMenu(): void {
    if (this.dialogue.isOpen || this.scene.isActive('MenuScene')) return;
    this.registry.set('gameState', this.state);
    this.scene.launch('MenuScene');
    this.scene.pause();
  }
}
