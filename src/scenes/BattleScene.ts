import Phaser from 'phaser';
import enemies from '../data/enemies.json';
import items from '../data/items.json';
import skills from '../data/skills.json';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { calculateEnemyDamage, calculateHeroDamage, isPartyDefeated } from '../systems/combat';
import { FlagsSystem } from '../systems/flags';
import { InventorySystem } from '../systems/inventory';
import { SaveSystem } from '../systems/save';
import {
  fadeInScene,
  fadeToScene,
  isFieldAreaKey,
  type FieldAreaKey,
  type SceneTransitionPayload
} from '../systems/sceneTransitions';
import type { Direction, EnemyData, HeroState, ItemData, SaveState, SkillData } from '../types/game';

interface BattleData extends SceneTransitionPayload {
  returnPosition?: { x: number; y: number };
}

export class BattleScene extends Phaser.Scene {
  private state!: SaveState;
  private enemy!: EnemyData;
  private enemyHp = 1;
  private activeHeroIndex = 0;
  private commands = ['Attack', 'Skill', 'Item', 'Guard', 'Run'];
  private commandIndex = 0;
  private commandText: Phaser.GameObjects.Text[] = [];
  private logText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private acceptingInput = true;
  private guardedHeroIds = new Set<string>();
  private returnScene = 'FieldScene';
  private returnAreaKey: FieldAreaKey = 'dungeon';
  private returnSpawnId?: string;
  private returnPosition = { x: 1292, y: 408 };
  private returnFacing: Direction = 'down';

  constructor() {
    super('BattleScene');
  }

  create(data: BattleData = {}): void {
    this.state = this.registry.get('gameState') as SaveState;
    this.returnScene = data.returnScene ?? 'FieldScene';
    this.returnAreaKey = data.returnAreaKey ?? (isFieldAreaKey(this.state.mapId) ? this.state.mapId : 'dungeon');
    this.returnSpawnId = data.returnSpawnId;
    this.returnFacing = data.facing ?? this.state.facing;

    if (data.returnPosition) {
      this.returnPosition = data.returnPosition;
    } else if (typeof data.playerX === 'number' && typeof data.playerY === 'number') {
      this.returnPosition = { x: data.playerX, y: data.playerY };
    }

    const enemyId = data.battleConfig?.enemyId ?? data.enemyId ?? 'gloom_wisp';
    const foundEnemy = (enemies as EnemyData[]).find((entry) => entry.id === enemyId);
    if (!foundEnemy) throw new Error(`Enemy not found: ${enemyId}`);

    this.enemy = { ...foundEnemy };
    this.enemyHp = this.enemy.hp;

    this.cameras.main.setBackgroundColor('#10101f');
    this.drawBattleBackground();
    this.createBattleUi();
    this.updateStatus();
    this.writeLog(`${this.enemy.name} blocks the shrine path.`);

    this.input.keyboard?.on('keydown-UP', () => this.moveCommand(-1));
    this.input.keyboard?.on('keydown-W', () => this.moveCommand(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveCommand(1));
    this.input.keyboard?.on('keydown-S', () => this.moveCommand(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirmCommand());
    this.input.keyboard?.on('keydown-SPACE', () => this.confirmCommand());

    fadeInScene(this);
  }

  private drawBattleBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x151a2f, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(0x22344e, 1);
    graphics.fillEllipse(GAME_WIDTH / 2, 290, 620, 148);
    graphics.lineStyle(3, 0x6cc7c8, 0.6);
    graphics.strokeCircle(GAME_WIDTH / 2, 190, 74);
    graphics.strokeCircle(GAME_WIDTH / 2, 190, 112);

    this.add.image(GAME_WIDTH / 2, 206, 'monster').setScale(3);
    this.add.text(GAME_WIDTH / 2, 88, this.getBattleLocationName(), {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#bdfcff'
    }).setOrigin(0.5);
  }

  private createBattleUi(): void {
    const statusPanel = this.add.rectangle(32, 348, 560, 156, 0x10192f, 0.96).setOrigin(0);
    statusPanel.setStrokeStyle(3, 0xd9c879);

    const commandPanel = this.add.rectangle(620, 348, 300, 156, 0x10192f, 0.96).setOrigin(0);
    commandPanel.setStrokeStyle(3, 0xd9c879);

    this.statusText = this.add.text(56, 372, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f6f1de',
      lineSpacing: 8
    });

    this.enemyHpText = this.add.text(GAME_WIDTH / 2, 274, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffe58a',
      backgroundColor: '#10192fcc',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    this.logText = this.add.text(56, 512, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#9fb7ff'
    });

    this.commandText = this.commands.map((command, index) => {
      const x = index < 3 ? 644 : 784;
      const y = index < 3 ? 372 + index * 34 : 372 + (index - 3) * 34;
      return this.add.text(x, y, command, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff'
      });
    });

    this.updateCommands();
  }

  private moveCommand(delta: number): void {
    if (!this.acceptingInput) return;
    this.commandIndex = Phaser.Math.Wrap(this.commandIndex + delta, 0, this.commands.length);
    this.updateCommands();
  }

  private updateCommands(): void {
    this.commandText.forEach((text, index) => {
      const selected = index === this.commandIndex;
      text.setText(`${selected ? '▶ ' : '  '}${this.commands[index]}`);
      text.setColor(selected ? '#ffe58a' : '#ffffff');
    });
  }

  private confirmCommand(): void {
    if (!this.acceptingInput) return;
    const hero = this.getActiveHero();
    if (!hero) return;

    const command = this.commands[this.commandIndex];
    this.acceptingInput = false;

    if (command === 'Attack') this.heroAttack(hero);
    if (command === 'Skill') this.heroSkill(hero);
    if (command === 'Item') this.heroItem(hero);
    if (command === 'Guard') this.heroGuard(hero);
    if (command === 'Run') this.runAway();
  }

  private heroAttack(hero: HeroState): void {
    const damage = calculateHeroDamage(hero, this.enemy);
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.spawnDamageNumber(GAME_WIDTH / 2, 168, damage);
    this.writeLog(`${hero.name} attacks for ${damage}.`);
    this.afterHeroAction();
  }

  private heroSkill(hero: HeroState): void {
    const skillList = skills as SkillData[];
    const skill = skillList.find((entry) => hero.skills.includes(entry.id));

    if (!skill) {
      this.writeLog(`${hero.name} has no skill ready.`);
      this.acceptingInput = true;
      return;
    }

    if (hero.mp < skill.mpCost) {
      this.writeLog(`Not enough MP for ${skill.name}.`);
      this.acceptingInput = true;
      return;
    }

    hero.mp -= skill.mpCost;
    const damage = calculateHeroDamage(hero, this.enemy, skill.power);
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.spawnDamageNumber(GAME_WIDTH / 2, 168, damage, '#bdfcff');
    this.writeLog(`${hero.name} casts ${skill.name} for ${damage}.`);
    this.afterHeroAction();
  }

  private heroItem(hero: HeroState): void {
    const itemList = items as ItemData[];
    const potion = itemList.find((entry) => entry.id === 'potion');

    if (!potion || !InventorySystem.removeItem(this.state, 'potion', 1)) {
      this.writeLog('No Moonleaf Tonics left.');
      this.acceptingInput = true;
      return;
    }

    const restore = potion.hpRestore ?? 0;
    hero.hp = Math.min(hero.maxHp, hero.hp + restore);
    this.writeLog(`${hero.name} uses ${potion.name} and recovers ${restore} HP.`);
    this.afterHeroAction();
  }

  private heroGuard(hero: HeroState): void {
    this.guardedHeroIds.add(hero.id);
    this.writeLog(`${hero.name} guards.`);
    this.afterHeroAction();
  }

  private runAway(): void {
    this.writeLog('The party falls back from the shrine.');
    this.time.delayedCall(650, () => this.returnToField());
  }

  private afterHeroAction(): void {
    this.updateStatus();

    if (this.enemyHp <= 0) {
      this.victory();
      return;
    }

    this.activeHeroIndex = this.nextLivingHeroIndex(this.activeHeroIndex + 1);

    if (this.activeHeroIndex === -1) {
      this.enemyTurn();
      return;
    }

    this.time.delayedCall(500, () => {
      this.acceptingInput = true;
      this.updateStatus();
      this.writeLog(`${this.getActiveHero()?.name}'s command.`);
    });
  }

  private enemyTurn(): void {
    this.time.delayedCall(650, () => {
      const targets = this.state.party.filter((hero) => hero.hp > 0);
      const target = Phaser.Utils.Array.GetRandom(targets);
      const guarding = this.guardedHeroIds.has(target.id);
      const damage = calculateEnemyDamage(this.enemy, target, guarding);
      target.hp = Math.max(0, target.hp - damage);
      this.spawnDamageNumber(260 + this.state.party.indexOf(target) * 110, 330, damage, '#ff8f8f');
      this.writeLog(`${this.enemy.name} strikes ${target.name} for ${damage}.`);
      this.guardedHeroIds.clear();
      this.updateStatus();

      if (isPartyDefeated(this.state.party)) {
        this.defeat();
        return;
      }

      this.activeHeroIndex = this.nextLivingHeroIndex(0);
      this.time.delayedCall(600, () => {
        this.acceptingInput = true;
        this.writeLog(`${this.getActiveHero()?.name}'s command.`);
      });
    });
  }

  private victory(): void {
    this.enemyHp = 0;
    this.state.gold += this.enemy.gold;
    this.state.party.forEach((hero) => {
      hero.xp += this.enemy.xp;
    });
    InventorySystem.addItem(this.state, 'sky_shard', 1);
    FlagsSystem.set(this.state, 'defeated_first_wisp');
    SaveSystem.save(this.state);
    this.updateStatus();
    this.writeLog(`Victory! Gained ${this.enemy.xp} XP and ${this.enemy.gold} gold.`);
    this.time.delayedCall(1300, () => this.returnToField());
  }

  private defeat(): void {
    this.writeLog('The party collapses. Returning to title.');
    this.time.delayedCall(1400, () => fadeToScene(this, 'TitleScene'));
  }

  private returnToField(): void {
    this.registry.set('gameState', this.state);

    const payload: SceneTransitionPayload = {
      areaKey: this.returnAreaKey,
      facing: this.returnFacing,
      fromScene: 'BattleScene'
    };

    if (this.returnSpawnId) {
      payload.spawnId = this.returnSpawnId;
    } else {
      payload.playerX = this.returnPosition.x;
      payload.playerY = this.returnPosition.y;
    }

    fadeToScene(this, this.returnScene, payload);
  }

  private getBattleLocationName(): string {
    if (this.returnAreaKey === 'town') return 'Vael';
    if (this.returnAreaKey === 'overworld') return 'Greenwood Road';
    return 'Cave Shrine';
  }

  private getActiveHero(): HeroState | undefined {
    return this.state.party[this.activeHeroIndex];
  }

  private nextLivingHeroIndex(startIndex: number): number {
    for (let i = startIndex; i < this.state.party.length; i += 1) {
      if (this.state.party[i].hp > 0) return i;
    }

    return -1;
  }

  private updateStatus(): void {
    const heroLines = this.state.party.map((hero, index) => {
      const marker = index === this.activeHeroIndex && this.acceptingInput ? '▶' : ' ';
      return `${marker} ${hero.name.padEnd(6)} HP ${hero.hp.toString().padStart(3)}/${hero.maxHp}  MP ${hero.mp.toString().padStart(2)}/${hero.maxMp}`;
    });

    this.statusText.setText(heroLines.join('\n'));
    this.enemyHpText.setText(`${this.enemy.name}  HP ${this.enemyHp}/${this.enemy.hp}`);
  }

  private writeLog(message: string): void {
    this.logText.setText(message);
  }

  private spawnDamageNumber(x: number, y: number, damage: number, color = '#ffe58a'): void {
    const text = this.add.text(x, y, String(damage), {
      fontFamily: 'monospace',
      fontSize: '28px',
      color,
      stroke: '#10192f',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 32,
      alpha: 0,
      duration: 700,
      onComplete: () => text.destroy()
    });
  }
}
