import Phaser from 'phaser';
import {
  CHAPTER_ONE_AREAS,
  CHAPTER_ONE_EVENTS,
  type ChapterAreaDefinition,
  type ChapterAreaId,
  type ChapterExitDefinition,
  type ChapterNpcDefinition,
  type ChapterObjectDefinition,
  type ChapterStep,
  type ChapterTriggerDefinition,
  type ConditionId,
  type DialogueLine
} from '../game/chapter1';
import type { Direction } from '../game/types';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;
const TILE_SIZE = 32;
const PLAYER_SPEED = 122;
const INTERACTION_DISTANCE = 44;
const FLAG_REGISTRY_KEY = 'chapter1.flags';
const STEP_REGISTRY_KEY = 'chapter1.step';
const AREA_REGISTRY_KEY = 'chapter1.area';

const BLOCKING_TILES = new Set(['#', 'T', 'W', 'F', 'S', 'M']);

type GameSceneInitData = {
  areaId?: ChapterAreaId;
  spawnId?: string;
  postBattleEvent?: string;
  battleResult?: 'victory' | 'defeat' | 'escape';
};

type RuntimeInteractable = {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: Phaser.Physics.Arcade.StaticSprite;
  dialogue: DialogueLine[];
  eventAfter?: string;
  kind: 'npc' | 'object';
};

type DialogueState = {
  lines: DialogueLine[];
  lineIndex: number;
  active: boolean;
  onComplete?: () => void;
};

export class GameScene extends Phaser.Scene {
  private areaId: ChapterAreaId = 'vael';
  private spawnId = 'start';
  private pendingPostBattleEvent: string | null = null;
  private area!: ChapterAreaDefinition;
  private flags = new Set<string>();
  private step: ChapterStep = 'festival';

  private player!: Phaser.Physics.Arcade.Sprite;
  private blockers!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: RuntimeInteractable[] = [];
  private triggerDebugRects: Phaser.GameObjects.Rectangle[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private interactKeys!: Phaser.Input.Keyboard.Key[];
  private lastDirection: Direction = 'down';
  private promptText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private locationText!: Phaser.GameObjects.Text;
  private chapterCompleteText!: Phaser.GameObjects.Text;
  private fadeBlocker!: Phaser.GameObjects.Rectangle;
  private dialogueBox!: Phaser.GameObjects.Container;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueHint!: Phaser.GameObjects.Text;
  private dialogueState: DialogueState | null = null;
  private actionLock = false;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneInitData): void {
    this.flags = new Set<string>(this.registry.get(FLAG_REGISTRY_KEY) ?? []);
    this.step = (this.registry.get(STEP_REGISTRY_KEY) as ChapterStep | undefined) ?? 'festival';
    this.areaId = data?.areaId ?? (this.registry.get(AREA_REGISTRY_KEY) as ChapterAreaId | undefined) ?? 'vael';
    this.spawnId = data?.spawnId ?? this.defaultSpawnForArea(this.areaId);
    this.pendingPostBattleEvent = data?.battleResult === 'victory' ? data.postBattleEvent ?? null : null;

    if (data?.battleResult === 'defeat') {
      this.pendingPostBattleEvent = 'party_recovered';
    }
  }

  create(): void {
    this.area = CHAPTER_ONE_AREAS[this.areaId];
    this.registry.set(AREA_REGISTRY_KEY, this.areaId);
    this.createGeneratedTextures();
    this.createWorld();
    this.createPlayer();
    this.createInteractables();
    this.createControls();
    this.createHud();
    this.createDialogueBox();
    this.createFadeBlocker();
    this.bindCollisions();
    this.configureCamera();
    this.updateObjective();

    if (this.shouldAutoplayAreaIntro()) {
      this.time.delayedCall(180, () => this.runEvent(this.areaId === 'forest' ? 'forest_intro' : 'cave_intro'));
    }

    if (this.pendingPostBattleEvent) {
      const eventId = this.pendingPostBattleEvent;
      this.pendingPostBattleEvent = null;
      this.time.delayedCall(260, () => this.runEvent(eventId));
    }
  }

  update(): void {
    if (this.dialogueState?.active || this.actionLock) {
      this.player.setVelocity(0, 0);
      if (this.dialogueState?.active && this.didPressInteract()) {
        this.advanceDialogue();
      }
      return;
    }

    this.handleMovement();
    this.updateInteractionPrompt();
    this.checkExitsAndTriggers();

    if (this.didPressInteract()) {
      const target = this.getNearestInteractable();
      if (target) {
        this.startDialogue(target.dialogue, () => {
          if (target.eventAfter) this.runEvent(target.eventAfter);
        });
      }
    }
  }

  private createWorld(): void {
    const widthTiles = this.getAreaWidthTiles();
    const heightTiles = this.area.tiles.length;
    this.physics.world.setBounds(0, 0, widthTiles * TILE_SIZE, heightTiles * TILE_SIZE);

    this.blockers = this.physics.add.staticGroup();
    this.drawTileMap();
    this.drawSetDressing();
  }

  private drawTileMap(): void {
    const widthTiles = this.getAreaWidthTiles();

    for (let y = 0; y < this.area.tiles.length; y += 1) {
      for (let x = 0; x < widthTiles; x += 1) {
        const rawTile = this.area.tiles[y]?.[x] ?? '#';
        const tile = this.resolveDynamicTile(rawTile);
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;
        const texture = this.textureForTile(tile);

        this.add.image(worldX, worldY, texture).setDepth(0);

        if (this.isBlockingTile(tile)) {
          const blocker = this.blockers.create(worldX, worldY, 'tile-hitbox') as Phaser.Physics.Arcade.Sprite;
          blocker.setVisible(false);
          blocker.refreshBody();
        }
      }
    }
  }

  private drawSetDressing(): void {
    if (this.areaId === 'vael' && !this.hasFlag('skywellAwake')) {
      this.add.text(280, 48, 'SKYWELL', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff0b0'
      }).setDepth(5);
    }

    if (this.areaId === 'vael' && this.hasFlag('skywellAwake')) {
      for (let i = 0; i < 6; i += 1) {
        this.add.rectangle(430 + i * 10, 250 - i * 18, 4, 18, 0xff8c4a, 0.42).setAngle(25).setDepth(4);
      }
    }

    if (this.areaId === 'forest') {
      this.add.text(74, 40, 'Greenwood Road', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#c8f2a4'
      }).setDepth(3);
    }

    if (this.areaId === 'cave') {
      this.add.text(248, 72, 'Map-Heart Shrine', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#b9dcff'
      }).setDepth(3);
    }
  }

  private createPlayer(): void {
    const spawn = this.area.spawns[this.spawnId] ?? this.area.spawns[this.defaultSpawnForArea(this.areaId)];
    this.lastDirection = spawn.facing ?? 'down';
    this.player = this.physics.add.sprite(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE, `hero-${this.lastDirection}`);
    this.player.setDepth(30);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(16, 18).setOffset(8, 12);
  }

  private createInteractables(): void {
    this.interactables = [];
    const definitions: Array<(ChapterNpcDefinition | ChapterObjectDefinition) & { kind: 'npc' | 'object' }> = [
      ...this.area.npcs.map((npc) => ({ ...npc, kind: 'npc' as const })),
      ...this.area.objects.map((object) => ({ ...object, kind: 'object' as const }))
    ];

    definitions
      .filter((definition) => this.isConditionMet(definition.condition ?? 'always'))
      .forEach((definition) => {
        const sprite = this.physics.add.staticSprite(
          definition.x * TILE_SIZE + TILE_SIZE / 2,
          definition.y * TILE_SIZE + TILE_SIZE / 2,
          definition.texture
        );
        sprite.setDepth(definition.kind === 'object' ? 18 : 24);
        sprite.body?.setSize(18, 18).setOffset(7, 12);

        this.interactables.push({
          id: definition.id,
          name: definition.name,
          x: definition.x,
          y: definition.y,
          sprite,
          dialogue: definition.dialogue,
          eventAfter: definition.eventAfter,
          kind: definition.kind
        });
      });
  }

  private bindCollisions(): void {
    this.physics.add.collider(this.player, this.blockers);
    this.interactables.forEach((target) => {
      if (target.kind === 'npc') this.physics.add.collider(this.player, target.sprite);
    });
  }

  private configureCamera(): void {
    this.cameras.main.setBounds(0, 0, this.getAreaWidthTiles() * TILE_SIZE, this.area.tiles.length * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.55);
    this.cameras.main.setRoundPixels(true);
  }

  private createControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable.');

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
  }

  private createHud(): void {
    this.locationText = this.add.text(12, 10, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffe2a0',
      backgroundColor: '#111524dd',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(120);

    this.objectiveText = this.add.text(12, 34, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e8efff',
      backgroundColor: '#111524dd',
      fixedWidth: 410,
      wordWrap: { width: 398, useAdvancedWrap: true },
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(120);

    this.promptText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fff7d6',
      backgroundColor: '#1b1d2bcc',
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5, 1).setDepth(90).setVisible(false);

    this.chapterCompleteText = this.add.text(GAME_WIDTH / 2, 74, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fff4be',
      align: 'center',
      backgroundColor: '#111524e8',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(130).setVisible(false);
  }

  private updateObjective(): void {
    this.locationText.setText(this.area.title);

    let objective = this.area.objective;
    if (this.areaId === 'vael' && this.hasFlag('skywellAwake') && !this.hasFlag('bronnJoined')) {
      objective = 'Find Bronn near the east service road and escape Vael.';
    } else if (this.areaId === 'forest') {
      objective = 'Escape east through Greenwood road. Fights trigger on the narrow road.';
    } else if (this.areaId === 'cave') {
      if (this.hasFlag('boss_defeated')) {
        objective = 'Chapter 1 complete. The party must head toward the next Skywell.';
      } else if (this.hasFlag('seal_a_read') && this.hasFlag('seal_b_read')) {
        objective = 'Approach the living core at the north shrine.';
      } else {
        objective = 'Read both shrine seals before touching the core.';
      }
    }

    this.objectiveText.setText(`Goal: ${objective}`);
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

  private updateInteractionPrompt(): void {
    const target = this.getNearestInteractable();
    if (!target) {
      this.promptText.setVisible(false);
      return;
    }

    this.promptText
      .setText(`E / Space: ${target.kind === 'npc' ? 'Talk to' : 'Inspect'} ${target.name}`)
      .setPosition(target.sprite.x, target.sprite.y - 28)
      .setVisible(true);
  }

  private getNearestInteractable(): RuntimeInteractable | null {
    let nearest: RuntimeInteractable | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.interactables) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.sprite.x, target.sprite.y);
      if (distance < INTERACTION_DISTANCE && distance < nearestDistance) {
        nearest = target;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private checkExitsAndTriggers(): void {
    const tileX = this.player.x / TILE_SIZE;
    const tileY = this.player.y / TILE_SIZE;

    for (const trigger of this.area.triggers) {
      if (!this.isTriggerAvailable(trigger)) continue;
      if (this.isPointInRect(tileX, tileY, trigger)) {
        if (trigger.eventId) {
          this.runEvent(trigger.eventId);
          return;
        }

        if (trigger.encounterId) {
          this.startBattle(trigger.encounterId, trigger.returnSpawn ?? this.spawnId, trigger.winFlag, trigger.postBattleEvent);
          return;
        }
      }
    }

    for (const exit of this.area.exits) {
      if (!this.isPointInRect(tileX, tileY, exit)) continue;
      if (exit.condition && !this.isConditionMet(exit.condition)) {
        this.startDialogue(exit.blockedText ?? [{ speaker: 'Rowan', text: 'Not yet.' }]);
        return;
      }

      if (exit.eventBefore) {
        this.runEvent(exit.eventBefore, () => this.transitionToArea(exit.targetArea, exit.targetSpawn));
        return;
      }

      this.transitionToArea(exit.targetArea, exit.targetSpawn);
      return;
    }
  }

  private isTriggerAvailable(trigger: ChapterTriggerDefinition): boolean {
    if (trigger.onceFlag && this.hasFlag(trigger.onceFlag)) return false;
    return this.isConditionMet(trigger.condition ?? 'always');
  }

  private isPointInRect(pointX: number, pointY: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return pointX >= rect.x && pointX < rect.x + rect.width && pointY >= rect.y && pointY < rect.y + rect.height;
  }

  private transitionToArea(targetArea?: ChapterAreaId, targetSpawn?: string): void {
    if (!targetArea) return;
    this.registry.set(AREA_REGISTRY_KEY, targetArea);
    this.fadeTo(() => this.scene.restart({ areaId: targetArea, spawnId: targetSpawn ?? this.defaultSpawnForArea(targetArea) }));
  }

  private startBattle(encounterId: string, returnSpawn: string, winFlag?: string, postBattleEvent?: string): void {
    this.actionLock = true;
    this.player.setVelocity(0, 0);
    this.fadeTo(() => {
      this.scene.start('BattleScene', {
        encounterId,
        returnAreaId: this.areaId,
        returnSpawnId: returnSpawn,
        winFlag,
        postBattleEvent
      });
    });
  }

  private runEvent(eventId: string, afterEvent?: () => void): void {
    if (this.actionLock) return;

    if (eventId === 'skywell_disaster') {
      this.actionLock = true;
      this.player.setVelocity(0, 0);
      this.cameras.main.shake(700, 0.012);
      this.flashScreen(0xfff0a0, 0.34);
      this.time.delayedCall(420, () => {
        this.startDialogue(CHAPTER_ONE_EVENTS.skywell_disaster, () => {
          this.setFlag('skywellAwake');
          this.setFlag('lyraJoined');
          this.setStep('disaster');
          this.scene.restart({ areaId: 'vael', spawnId: 'afterDisaster' });
        });
      });
      return;
    }

    if (eventId === 'bronn_join') {
      this.startDialogue(CHAPTER_ONE_EVENTS.bronn_join, () => {
        this.setFlag('bronnJoined');
        this.setStep('forest');
        this.transitionToArea('forest', 'fromVael');
      });
      return;
    }

    if (eventId === 'forest_intro') {
      this.startDialogue(CHAPTER_ONE_EVENTS.forest_intro, () => {
        this.setFlag('forestIntroShown');
        afterEvent?.();
      });
      return;
    }

    if (eventId === 'cave_intro') {
      this.startDialogue(CHAPTER_ONE_EVENTS.cave_intro, () => {
        this.setStep('cave');
        this.setFlag('caveIntroShown');
        afterEvent?.();
      });
      return;
    }

    if (eventId === 'read_seal_a') {
      this.setFlag('seal_a_read');
      this.updateObjective();
      return;
    }

    if (eventId === 'read_seal_b') {
      this.setFlag('seal_b_read');
      this.updateObjective();
      return;
    }

    if (eventId === 'core_reveal') {
      if (!this.hasFlag('seal_a_read') || !this.hasFlag('seal_b_read')) {
        this.startDialogue([{ speaker: 'Skywell Core', text: 'Two seals remain unread. The map-heart refuses to wake fully.' }]);
        return;
      }

      this.startDialogue(CHAPTER_ONE_EVENTS.core_reveal, () => {
        this.setFlag('coreRevealed');
        this.startBattle('skywell_guardian', 'afterBoss', 'boss_defeated', 'boss_defeated');
      });
      return;
    }

    if (eventId === 'boss_defeated') {
      this.setFlag('boss_defeated');
      this.setStep('complete');
      this.startDialogue(CHAPTER_ONE_EVENTS.boss_defeated, () => {
        this.updateObjective();
        this.chapterCompleteText
          .setText('CHAPTER 1 COMPLETE\nVael fell behind them. The next Skywell waits north.')
          .setVisible(true);
      });
      return;
    }

    if (eventId === 'party_recovered') {
      this.startDialogue([
        { speaker: 'Lyra', text: 'Breathe. The shrine wind pulled us back before the engine-born finished us.' },
        { speaker: 'Bronn', text: 'Try again when your ATB bars are ready and do not forget Guard.' }
      ]);
    }
  }

  private startDialogue(lines: DialogueLine[], onComplete?: () => void): void {
    if (lines.length === 0) {
      onComplete?.();
      return;
    }

    this.player.setVelocity(0, 0);
    this.promptText.setVisible(false);
    this.dialogueState = { lines, lineIndex: 0, active: true, onComplete };
    this.showDialogueLine();
  }

  private advanceDialogue(): void {
    if (!this.dialogueState) return;
    this.dialogueState.lineIndex += 1;

    if (this.dialogueState.lineIndex >= this.dialogueState.lines.length) {
      const onComplete = this.dialogueState.onComplete;
      this.dialogueState = null;
      this.dialogueBox.setVisible(false);
      this.actionLock = false;
      onComplete?.();
      return;
    }

    this.showDialogueLine();
  }

  private showDialogueLine(): void {
    if (!this.dialogueState) return;
    const line = this.dialogueState.lines[this.dialogueState.lineIndex];
    const remaining = this.dialogueState.lines.length - this.dialogueState.lineIndex - 1;
    this.dialogueName.setText(line.speaker ?? '');
    this.dialogueText.setText(line.text);
    this.dialogueHint.setText(remaining > 0 ? 'E / Space / Enter: Next' : 'E / Space / Enter: Close');
    this.dialogueBox.setVisible(true);
  }

  private createDialogueBox(): void {
    const margin = 18;
    const panelWidth = GAME_WIDTH - margin * 2;
    const panelHeight = 126;
    const x = margin;
    const y = GAME_HEIGHT - panelHeight - 12;
    const textWidth = panelWidth - 32;

    const shadow = this.add.rectangle(5, 5, panelWidth, panelHeight, 0x000000, 0.45).setOrigin(0);
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x151827, 0.98).setOrigin(0);
    const border = this.add.rectangle(0, 0, panelWidth, panelHeight).setOrigin(0).setStrokeStyle(2, 0xffe2a0, 1);

    this.dialogueName = this.add.text(16, 10, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffd479',
      fixedWidth: textWidth
    });

    this.dialogueText = this.add.text(16, 34, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#fff9ed',
      fixedWidth: textWidth,
      fixedHeight: 68,
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: 3
    });

    this.dialogueHint = this.add.text(panelWidth - 16, panelHeight - 16, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#b8c0ff'
    }).setOrigin(1, 0.5);

    const objects = [shadow, panel, border, this.dialogueName, this.dialogueText, this.dialogueHint];
    objects.forEach((object) => object.setScrollFactor(0, 0));
    this.dialogueBox = this.add.container(x, y, objects).setScrollFactor(0).setDepth(160).setVisible(false);
  }

  private createFadeBlocker(): void {
    this.fadeBlocker = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(220);
  }

  private fadeTo(onMidpoint: () => void): void {
    this.actionLock = true;
    this.tweens.add({
      targets: this.fadeBlocker,
      alpha: 1,
      duration: 260,
      onComplete: onMidpoint
    });
  }

  private flashScreen(color: number, alpha: number): void {
    const flash = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, alpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(210);
    this.tweens.add({ targets: flash, alpha: 0, duration: 460, onComplete: () => flash.destroy() });
  }

  private didPressInteract(): boolean {
    return this.interactKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  private shouldAutoplayAreaIntro(): boolean {
    return (this.areaId === 'forest' && !this.hasFlag('forestIntroShown')) || (this.areaId === 'cave' && !this.hasFlag('caveIntroShown'));
  }

  private resolveDynamicTile(rawTile: string): string {
    const tile = rawTile === ' ' ? '.' : rawTile;
    if (tile === 'D') return this.hasFlag('skywellAwake') ? 'R' : 'C';
    if (tile === 'A') return this.hasFlag('skywellAwake') ? 'R' : 'C';
    return tile;
  }

  private textureForTile(tile: string): string {
    switch (tile) {
      case '#':
        return this.areaId === 'cave' ? 'tile-cave-wall' : 'tile-cliff';
      case 'T':
        return 'tile-tree';
      case 'W':
        return 'tile-water';
      case 'F':
        return 'tile-stall';
      case 'C':
        return 'tile-cobble';
      case 'P':
        return this.areaId === 'cave' ? 'tile-cave-path' : 'tile-path';
      case 'S':
        return 'tile-shrine';
      case 'M':
        return 'tile-cave-wall';
      case 'R':
        return 'tile-rubble';
      default:
        return this.areaId === 'cave' ? 'tile-cave-floor' : 'tile-grass';
    }
  }

  private isBlockingTile(tile: string): boolean {
    return BLOCKING_TILES.has(tile) || tile === 'R';
  }

  private isConditionMet(condition: ConditionId): boolean {
    switch (condition) {
      case 'always':
        return true;
      case 'before_disaster':
        return !this.hasFlag('skywellAwake');
      case 'after_disaster':
        return this.hasFlag('skywellAwake');
      case 'bronn_joined':
        return this.hasFlag('bronnJoined');
      case 'before_bronn':
        return this.hasFlag('skywellAwake') && !this.hasFlag('bronnJoined');
      case 'boss_defeated':
        return this.hasFlag('boss_defeated');
      case 'before_boss_defeated':
        return !this.hasFlag('boss_defeated');
      case 'seal_a_missing':
        return !this.hasFlag('seal_a_read');
      case 'seal_b_missing':
        return !this.hasFlag('seal_b_read');
      case 'both_seals_read':
        return this.hasFlag('seal_a_read') && this.hasFlag('seal_b_read') && !this.hasFlag('boss_defeated');
      default:
        return true;
    }
  }

  private hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  private setFlag(flag: string): void {
    this.flags.add(flag);
    this.registry.set(FLAG_REGISTRY_KEY, [...this.flags]);
  }

  private setStep(step: ChapterStep): void {
    this.step = step;
    this.registry.set(STEP_REGISTRY_KEY, step);
  }

  private defaultSpawnForArea(areaId: ChapterAreaId): string {
    if (areaId === 'forest') return 'fromVael';
    if (areaId === 'cave') return 'fromForest';
    return this.hasFlag('skywellAwake') ? 'afterDisaster' : 'start';
  }

  private getAreaWidthTiles(): number {
    return Math.max(...this.area.tiles.map((row) => row.length));
  }

  private createGeneratedTextures(): void {
    this.createTileTextures();
    this.createHeroTexture('hero-down', 0x4f82d9, 0xdd4738, 0xffe0bd, 'down');
    this.createHeroTexture('hero-up', 0x4f82d9, 0xdd4738, 0xffe0bd, 'up');
    this.createHeroTexture('hero-left', 0x4f82d9, 0xdd4738, 0xffe0bd, 'left');
    this.createHeroTexture('hero-right', 0x4f82d9, 0xdd4738, 0xffe0bd, 'right');
    this.createNpcTexture('npc-lyra', 0x66c6b0, 0xf4f1d6, 0x6a4ba0);
    this.createNpcTexture('npc-bronn', 0x768596, 0xd2a85c, 0x253041);
    this.createNpcTexture('npc-mira', 0xd98cff, 0xfff1ad, 0x6b3f7f);
    this.createNpcTexture('npc-mira-panic', 0xff8f8f, 0xfff1ad, 0x6b3f7f);
    this.createNpcTexture('npc-toma', 0xff8c64, 0x9fe6ff, 0x475a7a);
    this.createNpcTexture('npc-piko', 0x9ee37d, 0xfff1ad, 0x3d6b43);
    this.createObjectTextures();
  }

  private createTileTextures(): void {
    if (this.textures.exists('tile-grass')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    this.paintTile(g, 'tile-grass', 0x4f9f5b, 0x61b66a, 0x3f874e);
    this.paintTile(g, 'tile-path', 0x9a7652, 0xb58b60, 0x74573d);
    this.paintTile(g, 'tile-cobble', 0x7d8593, 0xa6adba, 0x596170);
    this.paintTile(g, 'tile-cliff', 0x504338, 0x806b56, 0x2e2926);
    this.paintTile(g, 'tile-cave-floor', 0x3d3d4f, 0x51546b, 0x292b39);
    this.paintTile(g, 'tile-cave-path', 0x574f65, 0x766c86, 0x393445);
    this.paintTile(g, 'tile-cave-wall', 0x202535, 0x343a4c, 0x11151f);
    this.paintTile(g, 'tile-shrine', 0x43536f, 0x91a7d2, 0x202c42);
    this.paintTile(g, 'tile-rubble', 0x5a4038, 0xe07449, 0x291b1b);

    g.fillStyle(0x1e6aa0, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x58b7e8, 1);
    g.fillRect(0, 6, TILE_SIZE, 4);
    g.fillRect(0, 19, TILE_SIZE, 3);
    g.generateTexture('tile-water', TILE_SIZE, TILE_SIZE);
    g.clear();

    g.fillStyle(0x153e2f, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x2f8c58, 1);
    g.fillCircle(10, 11, 8);
    g.fillCircle(20, 10, 9);
    g.fillCircle(16, 20, 10);
    g.fillStyle(0x6b4a2d, 1);
    g.fillRect(14, 18, 5, 10);
    g.generateTexture('tile-tree', TILE_SIZE, TILE_SIZE);
    g.clear();

    g.fillStyle(0x61413b, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xf0d279, 1);
    g.fillTriangle(4, 10, 28, 10, 16, 2);
    g.fillStyle(0x8c3538, 1);
    g.fillRect(5, 10, 22, 14);
    g.generateTexture('tile-stall', TILE_SIZE, TILE_SIZE);
    g.clear();

    g.fillStyle(0xff00ff, 0);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture('tile-hitbox', TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  private paintTile(g: Phaser.GameObjects.Graphics, key: string, base: number, light: number, dark: number): void {
    g.fillStyle(base, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(light, 1);
    g.fillRect(0, 0, TILE_SIZE, 2);
    g.fillRect(0, 0, 2, TILE_SIZE);
    g.fillStyle(dark, 1);
    g.fillRect(0, TILE_SIZE - 2, TILE_SIZE, 2);
    g.fillRect(TILE_SIZE - 2, 0, 2, TILE_SIZE);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.clear();
  }

  private createHeroTexture(key: string, bodyColor: number, accentColor: number, faceColor: number, direction: Direction): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(16, 28, 18, 6);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(9, 10, 14, 16, 3);
    g.fillStyle(faceColor, 1);
    g.fillRoundedRect(10, 3, 12, 10, 3);
    g.fillStyle(accentColor, 1);
    g.fillRect(7, 14, 18, 4);
    g.fillStyle(0x1b1d2b, 1);

    if (direction === 'left') g.fillRect(11, 7, 3, 2);
    else if (direction === 'right') g.fillRect(18, 7, 3, 2);
    else if (direction === 'up') g.fillRect(13, 5, 6, 2);
    else {
      g.fillRect(12, 7, 2, 2);
      g.fillRect(18, 7, 2, 2);
    }

    g.fillStyle(0x26324a, 1);
    g.fillRect(10, 25, 5, 4);
    g.fillRect(18, 25, 5, 4);
    g.fillStyle(0xe8c174, 1);
    g.fillRect(23, 12, 3, 17);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private createNpcTexture(key: string, bodyColor: number, accentColor: number, hairColor: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(16, 28, 18, 6);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(8, 12, 16, 15, 3);
    g.fillStyle(accentColor, 1);
    g.fillRoundedRect(10, 3, 12, 11, 4);
    g.fillStyle(hairColor, 1);
    g.fillRect(10, 3, 12, 4);
    g.fillStyle(0x222033, 1);
    g.fillRect(12, 8, 2, 2);
    g.fillRect(18, 8, 2, 2);
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(9, 14, 14, 2);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private createObjectTextures(): void {
    if (this.textures.exists('object-skywell')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(16, 28, 20, 6);
    g.fillStyle(0xc6a15a, 1);
    g.fillCircle(16, 15, 10);
    g.lineStyle(2, 0x26324a, 1);
    g.strokeCircle(16, 15, 13);
    g.fillStyle(0x87f4ff, 1);
    g.fillCircle(16, 15, 4);
    g.generateTexture('object-skywell', 32, 32);
    g.clear();

    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(16, 26, 22, 7);
    g.fillStyle(0xd96a45, 1);
    g.fillRect(7, 12, 18, 6);
    g.fillStyle(0x72524a, 1);
    g.fillRect(10, 18, 15, 7);
    g.generateTexture('object-rubble', 32, 32);
    g.clear();

    g.fillStyle(0x6b3f2d, 1);
    g.fillRect(14, 4, 3, 24);
    g.fillStyle(0xe0d06b, 1);
    g.fillTriangle(17, 5, 29, 9, 17, 14);
    g.generateTexture('object-banner', 32, 32);
    g.clear();

    g.fillStyle(0x11151f, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0x7bc8ff, 1);
    g.fillCircle(16, 16, 7);
    g.lineStyle(2, 0xe3e8ff, 1);
    g.strokeCircle(16, 16, 12);
    g.generateTexture('object-sigil-blue', 32, 32);
    g.clear();

    g.fillStyle(0x11151f, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xe4ca7f, 1);
    g.fillCircle(16, 16, 7);
    g.lineStyle(2, 0xfff1ad, 1);
    g.strokeCircle(16, 16, 12);
    g.generateTexture('object-sigil-gold', 32, 32);
    g.clear();

    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(16, 28, 22, 6);
    g.fillStyle(0x8ce8ff, 1);
    g.fillCircle(16, 14, 9);
    g.lineStyle(2, 0xc6a15a, 1);
    g.strokeCircle(16, 14, 13);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(14, 12, 3);
    g.generateTexture('object-core', 32, 32);
    g.destroy();
  }
}
