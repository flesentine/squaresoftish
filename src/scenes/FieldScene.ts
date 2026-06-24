import Phaser from 'phaser';
import introDialogue from '../data/dialogue/intro.json';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { DialogueSystem } from '../systems/dialogue';
import { FlagsSystem } from '../systems/flags';
import { InventorySystem } from '../systems/inventory';
import { createNewSave, SaveSystem } from '../systems/save';
import {
  fadeInScene,
  fadeToScene,
  isFieldAreaKey,
  isSceneTransitioning,
  type FieldAreaKey,
  type SceneTransitionPayload
} from '../systems/sceneTransitions';
import type { DialogueScript, Direction, SaveState } from '../types/game';

type InteractableKind = 'elder' | 'chest' | 'battle';

interface Interactable {
  kind: InteractableKind;
  object: Phaser.GameObjects.Image;
  label: string;
}

interface SpawnPoint {
  x: number;
  y: number;
  facing: Direction;
}

interface ExitDefinition {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetArea: FieldAreaKey;
  spawnId: string;
}

interface ExitZone extends ExitDefinition {
  bounds: Phaser.Geom.Rectangle;
}

interface AreaConfig {
  title: string;
  hudName: string;
  background: string;
  ground: number;
  groundAlt: number;
  grid: number;
  accent: number;
  walls: Array<[number, number, number, number]>;
  exits: ExitDefinition[];
}

interface FieldSceneData extends SceneTransitionPayload {
  x?: number;
  y?: number;
  returnPosition?: { x: number; y: number };
}

const DEFAULT_SPAWN_ID = 'default';

const SPAWNS: Record<FieldAreaKey, Record<string, SpawnPoint>> = {
  town: {
    default: { x: 240, y: 260, facing: 'down' },
    town_from_overworld: { x: 1690, y: 540, facing: 'left' }
  },
  overworld: {
    default: { x: 220, y: 540, facing: 'right' },
    overworld_from_town: { x: 220, y: 540, facing: 'right' },
    overworld_from_dungeon: { x: 1600, y: 360, facing: 'left' }
  },
  dungeon: {
    default: { x: 220, y: 520, facing: 'right' },
    dungeon_from_overworld: { x: 220, y: 520, facing: 'right' }
  }
};

const AREA_CONFIGS: Record<FieldAreaKey, AreaConfig> = {
  town: {
    title: 'Vael',
    hudName: 'Vael Town',
    background: '#13251f',
    ground: 0x193629,
    groundAlt: 0x1f4230,
    grid: 0x284b39,
    accent: 0xd9c879,
    walls: [
      [520, 280, 280, 64],
      [1180, 448, 360, 64],
      [760, 760, 480, 64],
      [1540, 710, 70, 300]
    ],
    exits: [
      {
        id: 'town_east_gate',
        label: 'Greenwood Road',
        x: 1796,
        y: 442,
        width: 96,
        height: 196,
        targetArea: 'overworld',
        spawnId: 'overworld_from_town'
      }
    ]
  },
  overworld: {
    title: 'Greenwood Road',
    hudName: 'Greenwood Road',
    background: '#10251d',
    ground: 0x203f24,
    groundAlt: 0x254b2a,
    grid: 0x38603b,
    accent: 0x8bd17c,
    walls: [
      [610, 270, 280, 78],
      [920, 760, 460, 70],
      [1350, 210, 340, 84],
      [1420, 720, 240, 70]
    ],
    exits: [
      {
        id: 'overworld_west_gate',
        label: 'Vael',
        x: 52,
        y: 430,
        width: 118,
        height: 220,
        targetArea: 'town',
        spawnId: 'town_from_overworld'
      },
      {
        id: 'overworld_cave_mouth',
        label: 'Cave Shrine',
        x: 1710,
        y: 248,
        width: 142,
        height: 190,
        targetArea: 'dungeon',
        spawnId: 'dungeon_from_overworld'
      }
    ]
  },
  dungeon: {
    title: 'Cave Shrine',
    hudName: 'Cave Shrine',
    background: '#10101f',
    ground: 0x171b2e,
    groundAlt: 0x1d2338,
    grid: 0x303953,
    accent: 0x6cc7c8,
    walls: [
      [520, 280, 300, 82],
      [1070, 336, 390, 74],
      [760, 760, 500, 74],
      [1480, 710, 90, 300]
    ],
    exits: [
      {
        id: 'dungeon_mouth',
        label: 'Greenwood Road',
        x: 52,
        y: 420,
        width: 126,
        height: 230,
        targetArea: 'overworld',
        spawnId: 'overworld_from_dungeon'
      }
    ]
  }
};

export class FieldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private dialogue!: DialogueSystem;
  private state!: SaveState;
  private interactables: Interactable[] = [];
  private exitZones: ExitZone[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private speed = 145;
  private facing: Direction = 'down';
  private areaKey: FieldAreaKey = 'town';
  private isTransitioning = false;

  constructor() {
    super('FieldScene');
  }

  create(data: FieldSceneData = {}): void {
    this.state = this.registry.get('gameState') ?? createNewSave();
    this.areaKey = this.resolveAreaKey(data);
    const spawn = this.resolveSpawn(data);
    this.facing = data.facing ?? spawn.facing;
    this.isTransitioning = false;

    this.state.mapId = this.areaKey;
    this.state.position = { x: Math.round(spawn.x), y: Math.round(spawn.y) };
    this.state.facing = this.facing;
    this.registry.set('gameState', this.state);

    const config = AREA_CONFIGS[this.areaKey];
    this.cameras.main.setBackgroundColor(config.background);
    this.physics.world.setBounds(0, 0, 1920, 1080);

    this.drawGround();
    this.createAreaDecorations();
    this.createPlayer(spawn.x, spawn.y);
    this.createWalls();
    this.createExitZones();
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

    fadeInScene(this);
    this.showLocationTitle(config.title);
  }

  update(): void {
    if (this.dialogue.isOpen || this.isTransitioning || isSceneTransitioning(this)) {
      this.player.setVelocity(0, 0);
      return;
    }

    this.updateMovement();
    this.updateInteractionPrompt();
    this.updateExitZones();

    if (this.isTransitioning) return;
    this.persistPlayerState();
  }

  private resolveAreaKey(data: FieldSceneData): FieldAreaKey {
    const requestedArea = data.areaKey ?? data.mapKey;
    if (isFieldAreaKey(requestedArea)) return requestedArea;
    if (isFieldAreaKey(this.state.mapId)) return this.state.mapId;
    return 'town';
  }

  private resolveSpawn(data: FieldSceneData): SpawnPoint {
    if (typeof data.playerX === 'number' && typeof data.playerY === 'number') {
      return { x: data.playerX, y: data.playerY, facing: data.facing ?? this.state.facing };
    }

    if (typeof data.x === 'number' && typeof data.y === 'number') {
      return { x: data.x, y: data.y, facing: data.facing ?? this.state.facing };
    }

    if (data.returnPosition) {
      return { x: data.returnPosition.x, y: data.returnPosition.y, facing: data.facing ?? this.state.facing };
    }

    const areaSpawns = SPAWNS[this.areaKey];
    if (data.spawnId && areaSpawns[data.spawnId]) return areaSpawns[data.spawnId];

    if (!data.spawnId && this.state.mapId === this.areaKey) {
      return { x: this.state.position.x, y: this.state.position.y, facing: this.state.facing };
    }

    return areaSpawns[DEFAULT_SPAWN_ID];
  }

  private drawGround(): void {
    const config = AREA_CONFIGS[this.areaKey];
    const graphics = this.add.graphics();
    graphics.fillStyle(config.ground, 1);
    graphics.fillRect(0, 0, 1920, 1080);

    for (let x = 0; x < 1920; x += 48) {
      for (let y = 0; y < 1080; y += 48) {
        const shade = (x / 48 + y / 48) % 2 === 0 ? config.groundAlt : config.ground;
        graphics.fillStyle(shade, 1);
        graphics.fillRect(x, y, 48, 48);
      }
    }

    graphics.lineStyle(1, config.grid, 0.45);
    for (let x = 0; x <= 1920; x += 48) graphics.lineBetween(x, 0, x, 1080);
    for (let y = 0; y <= 1080; y += 48) graphics.lineBetween(0, y, 1920, y);
  }

  private createAreaDecorations(): void {
    if (this.areaKey === 'town') {
      this.add.rectangle(930, 540, 520, 120, 0x6f5530, 0.45).setStrokeStyle(2, 0xd9c879, 0.65);
      this.add.text(840, 505, 'Festival Plaza', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffe58a'
      });
      this.add.text(1718, 516, 'East Gate', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffe58a'
      });
      return;
    }

    if (this.areaKey === 'overworld') {
      const road = this.add.graphics();
      road.fillStyle(0x7a653d, 0.58);
      road.fillRect(0, 486, 1920, 112);
      road.fillRect(1530, 260, 170, 338);
      this.add.text(1740, 220, 'Cave', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#bdfcff'
      });
      return;
    }

    const light = this.add.graphics();
    light.fillStyle(0x6cc7c8, 0.15);
    light.fillCircle(1350, 360, 150);
    this.add.text(1282, 414, 'Skywell Shrine', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#bdfcff'
    });
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

    AREA_CONFIGS[this.areaKey].walls.forEach(([x, y, width, height]) => addWall(x, y, width, height));

    this.physics.add.collider(this.player, walls);
  }

  private createExitZones(): void {
    const config = AREA_CONFIGS[this.areaKey];
    this.exitZones = config.exits.map((exit) => ({
      ...exit,
      bounds: new Phaser.Geom.Rectangle(exit.x, exit.y, exit.width, exit.height)
    }));

    this.exitZones.forEach((exit) => {
      const marker = this.add.rectangle(
        exit.x + exit.width / 2,
        exit.y + exit.height / 2,
        exit.width,
        exit.height,
        config.accent,
        0.1
      );
      marker.setStrokeStyle(2, config.accent, 0.5);
      this.add.text(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.label, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f6f1de',
        backgroundColor: '#10192fcc',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5);
    });
  }

  private createInteractables(): void {
    this.interactables = [];

    if (this.areaKey === 'town') {
      const elder = this.add.image(330, 300, 'npc').setScale(2);
      const chest = this.add.image(650, 220, 'chest').setScale(2);

      this.interactables = [
        { kind: 'elder', object: elder, label: 'Talk' },
        { kind: 'chest', object: chest, label: FlagsSystem.has(this.state, 'opened_vael_chest') ? 'Empty' : 'Open' }
      ];

      this.add.text(274, 328, 'Elder Mara', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe58a'
      });
      return;
    }

    if (this.areaKey === 'overworld') {
      const roadWisp = this.add.image(1060, 610, 'monster').setScale(2);
      this.interactables = [
        { kind: 'battle', object: roadWisp, label: FlagsSystem.has(this.state, 'defeated_first_wisp') ? 'Road Clear' : 'Enter Battle' }
      ];
      this.add.text(1010, 655, 'Road Wisp', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe58a'
      });
      return;
    }

    const shrine = this.add.image(1340, 360, 'shrine').setScale(2);
    this.interactables = [
      { kind: 'battle', object: shrine, label: FlagsSystem.has(this.state, 'defeated_first_wisp') ? 'Quiet Shrine' : 'Enter Battle' }
    ];
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
    this.hudText.setText(`${AREA_CONFIGS[this.areaKey].hudName}  |  Gold ${this.state.gold}  |  ${shard}  |  M: Menu`);
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

  private updateExitZones(): void {
    const exit = this.exitZones.find((zone) => Phaser.Geom.Rectangle.Contains(zone.bounds, this.player.x, this.player.y));
    if (!exit) return;
    this.transitionToArea(exit);
  }

  private transitionToArea(exit: ExitZone): void {
    if (this.isTransitioning) return;

    const targetSpawn = SPAWNS[exit.targetArea][exit.spawnId] ?? SPAWNS[exit.targetArea][DEFAULT_SPAWN_ID];
    this.isTransitioning = true;
    this.dialogue.close();
    this.player.setVelocity(0, 0);

    this.state.mapId = exit.targetArea;
    this.state.position = { x: targetSpawn.x, y: targetSpawn.y };
    this.state.facing = targetSpawn.facing;
    this.registry.set('gameState', this.state);
    SaveSystem.save(this.state);

    fadeToScene(this, 'FieldScene', {
      areaKey: exit.targetArea,
      spawnId: exit.spawnId,
      facing: targetSpawn.facing
    });
  }

  private handleInteract(): void {
    if (this.isTransitioning || isSceneTransitioning(this)) return;

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
      case 'battle':
        this.enterAreaBattle();
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

  private enterAreaBattle(): void {
    if (FlagsSystem.has(this.state, 'defeated_first_wisp')) {
      this.showToast(this.areaKey === 'dungeon' ? 'The shrine is quiet now.' : 'The road is clear now.');
      return;
    }

    this.isTransitioning = true;
    this.dialogue.close();
    this.player.setVelocity(0, 0);
    this.persistPlayerState();
    this.registry.set('gameState', this.state);
    SaveSystem.save(this.state);

    const payload: SceneTransitionPayload = {
      enemyId: 'gloom_wisp',
      battleConfig: { enemyId: 'gloom_wisp' },
      returnScene: 'FieldScene',
      returnAreaKey: this.areaKey,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      facing: this.facing
    };

    fadeToScene(this, 'BattleScene', payload);
  }

  private getNearbyInteractable(): Interactable | undefined {
    return this.interactables.find((entry) => {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.object.x, entry.object.y) < 84;
    });
  }

  private persistPlayerState(): void {
    this.state.position = {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y)
    };
    this.state.mapId = this.areaKey;
    this.state.facing = this.facing;
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

  private showLocationTitle(title: string): void {
    const text = this.add.text(GAME_WIDTH / 2, 74, title, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffe58a',
      stroke: '#10192f',
      strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: 54,
      delay: 900,
      duration: 650,
      onComplete: () => text.destroy()
    });
  }

  private openMenu(): void {
    if (this.dialogue.isOpen || this.isTransitioning || isSceneTransitioning(this) || this.scene.isActive('MenuScene')) return;
    this.persistPlayerState();
    this.registry.set('gameState', this.state);
    this.scene.launch('MenuScene');
    this.scene.pause();
  }
}
