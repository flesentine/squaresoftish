import Phaser from 'phaser';
import { MAP_HEIGHT, MAP_WIDTH, TILE_MAP, TILE_SIZE } from '../game/map';
import { NPCS } from '../game/npcs';
import type { Direction, RuntimeNpc } from '../game/types';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;
const PLAYER_SPEED = 120;
const INTERACTION_DISTANCE = 46;

type DialogueState = {
  npc: RuntimeNpc;
  lineIndex: number;
  active: boolean;
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private blockers!: Phaser.Physics.Arcade.StaticGroup;
  private npcs: RuntimeNpc[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private interactKeys!: Phaser.Input.Keyboard.Key[];
  private battleKey!: Phaser.Input.Keyboard.Key;
  private lastDirection: Direction = 'down';
  private promptText!: Phaser.GameObjects.Text;
  private dialogueBox!: Phaser.GameObjects.Container;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueHint!: Phaser.GameObjects.Text;
  private dialogueUiObjects: Phaser.GameObjects.GameObject[] = [];
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private dialogueState: DialogueState | null = null;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.createGeneratedTextures();
    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    this.blockers = this.physics.add.staticGroup();
    this.drawTileMap();
    this.createPlayer();
    this.createNpcs();
    this.createControls();
    this.createPrompt();
    this.createDialogueBox();

    this.physics.add.collider(this.player, this.blockers);
    this.npcs.forEach((npc) => this.physics.add.collider(this.player, npc.sprite));

    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.6);
    this.createUiCamera();
  }

  update(): void {
    if (this.dialogueState?.active) {
      this.player.setVelocity(0, 0);
      if (this.didPressInteract()) {
        this.advanceDialogue();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.battleKey)) {
      this.player.setVelocity(0, 0);
      this.scene.start('BattleScene');
      return;
    }

    this.handleMovement();
    this.updateInteractionPrompt();

    if (this.didPressInteract()) {
      const npc = this.getNearestNpc();
      if (npc) {
        this.startDialogue(npc);
      }
    }
  }

  private createControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

    this.interactKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    ];
    this.battleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
  }

  private didPressInteract(): boolean {
    return this.interactKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  private handleMovement(): void {
    const left = this.cursors.left?.isDown || this.wasd.left.isDown;
    const right = this.cursors.right?.isDown || this.wasd.right.isDown;
    const up = this.cursors.up?.isDown || this.wasd.up.isDown;
    const down = this.cursors.down?.isDown || this.wasd.down.isDown;

    let vx = 0;
    let vy = 0;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    const vector = new Phaser.Math.Vector2(vx, vy);
    if (vector.lengthSq() > 0) {
      vector.normalize().scale(PLAYER_SPEED);
      this.player.setVelocity(vector.x, vector.y);

      if (Math.abs(vector.x) > Math.abs(vector.y)) {
        this.lastDirection = vector.x < 0 ? 'left' : 'right';
      } else {
        this.lastDirection = vector.y < 0 ? 'up' : 'down';
      }

      this.player.setTexture(`hero-${this.lastDirection}`);
    } else {
      this.player.setVelocity(0, 0);
    }
  }

  private getNearestNpc(): RuntimeNpc | null {
    let nearest: RuntimeNpc | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.sprite.x,
        npc.sprite.y
      );

      if (distance < INTERACTION_DISTANCE && distance < nearestDistance) {
        nearest = npc;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private updateInteractionPrompt(): void {
    const npc = this.getNearestNpc();
    if (!npc) {
      this.promptText
        .setText('B: Test ATB battle')
        .setPosition(this.player.x, this.player.y - 30)
        .setVisible(true);
      return;
    }

    this.promptText
      .setText(`E / Space: Talk to ${npc.name}`)
      .setPosition(npc.sprite.x, npc.sprite.y - 30)
      .setVisible(true);
  }

  private startDialogue(npc: RuntimeNpc): void {
    this.dialogueState = {
      npc,
      lineIndex: 0,
      active: true
    };

    this.promptText.setVisible(false);
    this.faceNpc(npc);
    this.showDialogueLine();
  }

  private advanceDialogue(): void {
    if (!this.dialogueState) return;

    this.dialogueState.lineIndex += 1;

    if (this.dialogueState.lineIndex >= this.dialogueState.npc.dialogue.length) {
      this.closeDialogue();
      return;
    }

    this.showDialogueLine();
  }

  private closeDialogue(): void {
    this.dialogueState = null;
    this.dialogueBox.setVisible(false);
  }

  private showDialogueLine(): void {
    if (!this.dialogueState) return;

    const { npc, lineIndex } = this.dialogueState;
    const line = npc.dialogue[lineIndex];
    const remaining = npc.dialogue.length - lineIndex - 1;

    this.dialogueName.setText(line.speaker ?? npc.name);
    this.dialogueText.setText(line.text);
    this.dialogueHint.setText(remaining > 0 ? 'E / Space / Enter: Next' : 'E / Space / Enter: Close');
    this.dialogueBox.setVisible(true);
  }

  private faceNpc(npc: RuntimeNpc): void {
    const dx = npc.sprite.x - this.player.x;
    const dy = npc.sprite.y - this.player.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.lastDirection = dx < 0 ? 'left' : 'right';
    } else {
      this.lastDirection = dy < 0 ? 'up' : 'down';
    }

    this.player.setTexture(`hero-${this.lastDirection}`);
  }

  private createPrompt(): void {
    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff7d6',
        backgroundColor: '#1b1d2bcc',
        padding: { x: 5, y: 3 }
      })
      .setOrigin(0.5, 1)
      .setDepth(50)
      .setVisible(false);
  }

  private createDialogueBox(): void {
    const margin = 18;
    const panelWidth = GAME_WIDTH - margin * 2;
    const panelHeight = 118;
    const x = margin;
    const y = GAME_HEIGHT - panelHeight - 14;
    const textWidth = panelWidth - 32;

    const shadow = this.add.rectangle(5, 5, panelWidth, panelHeight, 0x000000, 0.45).setOrigin(0);
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x151827, 0.96).setOrigin(0);
    const border = this.add.rectangle(0, 0, panelWidth, panelHeight).setOrigin(0);
    border.setStrokeStyle(2, 0xffe2a0, 1);

    this.dialogueName = this.add.text(16, 10, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffd479',
      fixedWidth: textWidth
    });

    this.dialogueText = this.add.text(16, 34, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#fff9ed',
      fixedWidth: textWidth,
      fixedHeight: 60,
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: 3
    });

    this.dialogueHint = this.add.text(panelWidth - 16, panelHeight - 16, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#b8c0ff'
    }).setOrigin(1, 0.5);

    const dialogueObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [
      shadow,
      panel,
      border,
      this.dialogueName,
      this.dialogueText,
      this.dialogueHint
    ];

    dialogueObjects.forEach((object) => object.setScrollFactor(0, 0));

    this.dialogueBox = this.add.container(x, y, dialogueObjects);
    this.dialogueBox.setScrollFactor(0, 0);
    this.dialogueBox.setDepth(100);
    this.dialogueBox.setVisible(false);

    this.dialogueUiObjects = [this.dialogueBox, ...dialogueObjects];
  }

  private createUiCamera(): void {
    this.uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT, false, 'ui');
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
    this.uiCamera.setRoundPixels(true);

    const worldObjects = this.children.list.filter((object) => !this.dialogueUiObjects.includes(object));

    this.cameras.main.ignore(this.dialogueUiObjects);
    this.uiCamera.ignore(worldObjects);
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(2.5 * TILE_SIZE, 2.5 * TILE_SIZE, 'hero-down');
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(16, 18).setOffset(8, 12);
  }

  private createNpcs(): void {
    this.npcs = NPCS.map((definition) => {
      const sprite = this.physics.add.staticSprite(
        definition.x * TILE_SIZE + TILE_SIZE / 2,
        definition.y * TILE_SIZE + TILE_SIZE / 2,
        definition.texture
      );

      sprite.setDepth(15);
      sprite.body?.setSize(20, 18).setOffset(6, 14);

      return { ...definition, sprite };
    });
  }

  private drawTileMap(): void {
    for (let y = 0; y < TILE_MAP.length; y += 1) {
      for (let x = 0; x < TILE_MAP[y].length; x += 1) {
        const tile = TILE_MAP[y][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        if (tile === 1) {
          const blocker = this.blockers.create(worldX, worldY, 'tile-blocker');
          blocker.setDepth(5);
          blocker.refreshBody();
          continue;
        }

        this.add.image(worldX, worldY, tile === 2 ? 'tile-path' : 'tile-grass').setDepth(0);
      }
    }
  }

  private createGeneratedTextures(): void {
    this.createTileTextures();
    this.createHeroTexture('hero-down', 0x5cc8ff, 0xffffff, 'down');
    this.createHeroTexture('hero-up', 0x5cc8ff, 0xffffff, 'up');
    this.createHeroTexture('hero-left', 0x5cc8ff, 0xffffff, 'left');
    this.createHeroTexture('hero-right', 0x5cc8ff, 0xffffff, 'right');
    this.createNpcTexture('npc-mira', 0xd98cff, 0xfff1ad);
    this.createNpcTexture('npc-toma', 0xff8c64, 0x9fe6ff);
    this.createNpcTexture('npc-pip', 0x9ee37d, 0xfff1ad);
  }

  private createTileTextures(): void {
    if (this.textures.exists('tile-grass')) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x4f9f5b, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x61b66a, 1);
    g.fillRect(0, 0, TILE_SIZE, 2);
    g.fillRect(0, 0, 2, TILE_SIZE);
    g.generateTexture('tile-grass', TILE_SIZE, TILE_SIZE);
    g.clear();

    g.fillStyle(0x9a7652, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xb58b60, 1);
    g.fillRect(0, 13, TILE_SIZE, 5);
    g.fillRect(13, 0, 5, TILE_SIZE);
    g.generateTexture('tile-path', TILE_SIZE, TILE_SIZE);
    g.clear();

    g.fillStyle(0x1f6946, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x153e2f, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(0x2f8c58, 1);
    g.fillCircle(10, 11, 8);
    g.fillCircle(20, 10, 9);
    g.fillCircle(16, 20, 10);
    g.fillStyle(0x6b4a2d, 1);
    g.fillRect(14, 18, 5, 10);
    g.generateTexture('tile-blocker', TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  private createHeroTexture(key: string, bodyColor: number, faceColor: number, direction: Direction): void {
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(16, 28, 18, 6);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(9, 10, 14, 16, 3);
    g.fillStyle(faceColor, 1);
    g.fillRoundedRect(10, 3, 12, 10, 3);
    g.fillStyle(0x1b1d2b, 1);

    if (direction === 'left') {
      g.fillRect(11, 7, 3, 2);
    } else if (direction === 'right') {
      g.fillRect(18, 7, 3, 2);
    } else if (direction === 'up') {
      g.fillRect(13, 5, 6, 2);
    } else {
      g.fillRect(12, 7, 2, 2);
      g.fillRect(18, 7, 2, 2);
    }

    g.fillStyle(0x26324a, 1);
    g.fillRect(10, 25, 5, 4);
    g.fillRect(18, 25, 5, 4);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private createNpcTexture(key: string, bodyColor: number, accentColor: number): void {
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(16, 28, 18, 6);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(8, 12, 16, 15, 3);
    g.fillStyle(accentColor, 1);
    g.fillRoundedRect(10, 3, 12, 11, 4);
    g.fillStyle(0x222033, 1);
    g.fillRect(12, 8, 2, 2);
    g.fillRect(18, 8, 2, 2);
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(9, 14, 14, 2);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }
}
