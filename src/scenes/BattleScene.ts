import Phaser from 'phaser';
import enemiesData from '../data/enemies.json';
import itemsData from '../data/items.json';
import skillsData from '../data/skills.json';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;
const ATB_MAX = 100;
const ATB_FILL_SCALE = 0.003;
const COMMANDS = ['Attack', 'Skill', 'Item', 'Guard', 'Run'] as const;

const HERO_SKILL_IDS: Record<string, string[]> = {
  rowan: ['spark-thrust'],
  lyra: ['mending-bell'],
  bronn: ['guard-break']
};

type Team = 'party' | 'enemy';
type BattleMode = 'none' | 'command' | 'skills' | 'items' | 'target-enemy' | 'target-ally' | 'result';
type BattleOutcome = 'victory' | 'defeat' | 'escape';
type SkillKind = 'damage' | 'heal' | 'guard-break';
type TargetKind = 'enemy' | 'ally';

type Skill = {
  id: string;
  name: string;
  mpCost: number;
  power: number;
  kind: SkillKind;
  target: TargetKind;
  description: string;
};

type ItemStack = {
  id: string;
  name: string;
  quantity: number;
  healAmount: number;
  target: TargetKind;
  description: string;
};

type EnemyDefinition = {
  id: string;
  name: string;
  textureKey: string;
  maxHp: number;
  maxMp: number;
  speed: number;
  attack: number;
  defense: number;
  skillIds?: string[];
  weakness?: string;
  drops?: Array<{ itemId: string; chance: number }>;
  actions?: string[];
};

type Combatant = {
  id: string;
  name: string;
  team: Team;
  textureKey: string;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  speed: number;
  attack: number;
  defense: number;
  atb: number;
  guarding: boolean;
  skills: Skill[];
  sprite: Phaser.GameObjects.Container | null;
};

type PendingAction =
  | { kind: 'attack' }
  | { kind: 'skill'; skill: Skill }
  | { kind: 'item'; item: ItemStack };

type BarUi = {
  fill: Phaser.GameObjects.Rectangle;
  maxWidth: number;
};

type CombatantUi = {
  hpText: Phaser.GameObjects.Text;
  mpText?: Phaser.GameObjects.Text;
  stateText: Phaser.GameObjects.Text;
  hpBar: BarUi;
  mpBar?: BarUi;
  atbBar?: BarUi;
};

const SKILLS = skillsData as Skill[];
const ITEMS = itemsData as ItemStack[];
const ENEMIES = enemiesData as EnemyDefinition[];

export class BattleScene extends Phaser.Scene {
  private party: Combatant[] = [];
  private enemies: Combatant[] = [];
  private items: ItemStack[] = [];
  private currentHero: Combatant | null = null;
  private pendingAction: PendingAction | null = null;
  private mode: BattleMode = 'none';
  private selectedIndex = 0;
  private actionInProgress = false;
  private outcome: BattleOutcome | null = null;

  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyConfirm!: Phaser.Input.Keyboard.Key;
  private keyConfirmAlt!: Phaser.Input.Keyboard.Key;
  private keyCancel!: Phaser.Input.Keyboard.Key;

  private actorUi = new Map<string, CombatantUi>();
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private commandPanel!: Phaser.GameObjects.Rectangle;
  private commandTitle!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private targetMarker!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.resetBattleState();
    this.createGeneratedTextures();
    this.createBattlefield();
    this.createCombatants();
    this.createControls();
    this.createBattleUi();
    this.log('Engine wisps drift from the broken road. Wait mode is active.');
  }

  update(_time: number, delta: number): void {
    this.handleInput();

    if (!this.isPausedForWaitMode()) {
      this.fillAtb(delta);
      this.resolveReadyTurn();
    }

    this.updateAllUi();
    this.updateTargetMarker();
  }

  private resetBattleState(): void {
    this.currentHero = null;
    this.pendingAction = null;
    this.mode = 'none';
    this.selectedIndex = 0;
    this.actionInProgress = false;
    this.outcome = null;
    this.actorUi.clear();
    this.menuTexts = [];

    this.party = [
      this.makeCombatant('rowan', 'Rowan', 'party', 'battle-rowan', 148, 20, 16, 18, 5, this.getSkillsForHero('rowan')),
      this.makeCombatant('lyra', 'Lyra', 'party', 'battle-lyra', 112, 34, 13, 10, 4, this.getSkillsForHero('lyra')),
      this.makeCombatant('bronn', 'Bronn', 'party', 'battle-bronn', 182, 16, 10, 20, 8, this.getSkillsForHero('bronn'))
    ];

    this.enemies = ENEMIES.map((enemy) => this.makeEnemy(enemy));
    this.items = ITEMS.map((item) => ({ ...item }));
  }

  private getSkillsForHero(heroId: string): Skill[] {
    return (HERO_SKILL_IDS[heroId] ?? []).map((skillId) => this.getSkill(skillId));
  }

  private getSkill(skillId: string): Skill {
    const skill = SKILLS.find((candidate) => candidate.id === skillId);
    if (!skill) {
      throw new Error(`Missing skill data for ${skillId}.`);
    }

    return { ...skill };
  }

  private makeEnemy(enemy: EnemyDefinition): Combatant {
    const skills = (enemy.skillIds ?? []).map((skillId) => this.getSkill(skillId));
    return this.makeCombatant(
      enemy.id,
      enemy.name,
      'enemy',
      enemy.textureKey,
      enemy.maxHp,
      enemy.maxMp,
      enemy.speed,
      enemy.attack,
      enemy.defense,
      skills
    );
  }

  private makeCombatant(
    id: string,
    name: string,
    team: Team,
    textureKey: string,
    maxHp: number,
    maxMp: number,
    speed: number,
    attack: number,
    defense: number,
    skills: Skill[]
  ): Combatant {
    return {
      id,
      name,
      team,
      textureKey,
      maxHp,
      hp: maxHp,
      maxMp,
      mp: maxMp,
      speed,
      attack,
      defense,
      atb: team === 'party' ? 18 : 0,
      guarding: false,
      skills,
      sprite: null
    };
  }

  private createControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.keyUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyConfirm = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyConfirmAlt = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyCancel = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private createBattlefield(): void {
    this.cameras.main.setBackgroundColor('#101420');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101420, 1).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, 220, 0x172031, 1).setOrigin(0);
    this.add.rectangle(0, 208, GAME_WIDTH, 28, 0x23213a, 1).setOrigin(0);
    this.add.rectangle(0, 232, GAME_WIDTH, GAME_HEIGHT - 232, 0x0b0d16, 1).setOrigin(0);

    for (let i = 0; i < 9; i += 1) {
      this.add.rectangle(60 + i * 68, 206 + (i % 2) * 3, 52, 3, 0x38435f, 0.8).setOrigin(0.5);
    }

    this.add.text(18, 10, 'ATB-LITE BATTLE  •  WAIT MODE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffe6a6'
    });
  }

  private createCombatants(): void {
    const heroPositions = [
      { x: 150, y: 74 },
      { x: 126, y: 128 },
      { x: 154, y: 182 }
    ];

    const enemyPositions = [
      { x: 470, y: 94 },
      { x: 504, y: 160 },
      { x: 456, y: 184 },
      { x: 526, y: 70 }
    ];

    this.party.forEach((hero, index) => {
      const position = heroPositions[index] ?? { x: 140, y: 80 + index * 48 };
      hero.sprite = this.createActorSprite(hero, position.x, position.y, false);
    });

    this.enemies.forEach((enemy, index) => {
      const position = enemyPositions[index] ?? { x: 468 + index * 22, y: 94 + index * 28 };
      enemy.sprite = this.createActorSprite(enemy, position.x, position.y, true);
    });
  }

  private createActorSprite(combatant: Combatant, x: number, y: number, flipX: boolean): Phaser.GameObjects.Container {
    const shadow = this.add.ellipse(0, 28, combatant.team === 'enemy' ? 54 : 42, 10, 0x000000, 0.34);
    const sprite = this.add.image(0, 0, combatant.textureKey).setScale(combatant.team === 'enemy' ? 1.2 : 1.35);
    sprite.setFlipX(flipX);

    const name = this.add
      .text(0, 34, combatant.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: combatant.team === 'enemy' ? '#ffd0d0' : '#dcecff'
      })
      .setOrigin(0.5, 0);

    const container = this.add.container(x, y, [shadow, sprite, name]);
    container.setDepth(combatant.team === 'enemy' ? 12 : 15);
    return container;
  }

  private createBattleUi(): void {
    this.messageText = this.add.text(18, 214, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fff7e1',
      fixedWidth: 604,
      fixedHeight: 16
    });

    this.add.rectangle(16, 244, 394, 98, 0x141827, 0.96).setOrigin(0);
    this.add.rectangle(16, 244, 394, 98).setOrigin(0).setStrokeStyle(2, 0xffd07a, 1);

    this.party.forEach((hero, index) => this.createHeroStatusRow(hero, 28, 254 + index * 28));
    this.enemies.forEach((enemy) => this.createEnemyStatus(enemy));

    this.commandPanel = this.add.rectangle(430, 244, 194, 98, 0x141827, 0.96).setOrigin(0);
    this.commandPanel.setStrokeStyle(2, 0xffd07a, 1);
    this.commandTitle = this.add.text(444, 252, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffd87c'
    });

    this.targetMarker = this.add.text(0, 0, '▶', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffe37a'
    }).setVisible(false);

    this.resultText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 32, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#fff2bd',
        align: 'center',
        backgroundColor: '#111525dd',
        padding: { x: 18, y: 12 }
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    this.renderMenu();
    this.updateAllUi();
  }

  private createHeroStatusRow(hero: Combatant, x: number, y: number): void {
    this.add.text(x, y, hero.name.padEnd(6, ' '), {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f8f0d8'
    });

    const hpText = this.add.text(x + 72, y, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#d8fff2'
    });

    const mpText = this.add.text(x + 72, y + 12, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#c9d8ff'
    });

    const hpBar = this.createBar(x + 164, y + 2, 64, 6, 0x2ed16f);
    const mpBar = this.createBar(x + 164, y + 14, 64, 5, 0x4f7dff);
    const atbBar = this.createBar(x + 250, y + 8, 84, 6, 0xffa43a);

    const stateText = this.add.text(x + 340, y + 4, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffe6a6'
    });

    this.actorUi.set(hero.id, { hpText, mpText, stateText, hpBar, mpBar, atbBar });
  }

  private createEnemyStatus(enemy: Combatant): void {
    if (!enemy.sprite) return;

    const hpText = this.add
      .text(enemy.sprite.x, enemy.sprite.y - 46, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffd8d8'
      })
      .setOrigin(0.5, 0.5);

    const hpBar = this.createBar(enemy.sprite.x - 34, enemy.sprite.y - 32, 68, 5, 0xd95151);
    const stateText = this.add.text(enemy.sprite.x + 40, enemy.sprite.y - 39, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffe6a6'
    });

    this.actorUi.set(enemy.id, { hpText, stateText, hpBar });
  }

  private createBar(x: number, y: number, width: number, height: number, color: number): BarUi {
    this.add.rectangle(x, y, width, height, 0x070911, 1).setOrigin(0);
    const fill = this.add.rectangle(x, y, width, height, color, 1).setOrigin(0);
    this.add.rectangle(x, y, width, height).setOrigin(0).setStrokeStyle(1, 0x45506a, 1);
    return { fill, maxWidth: width };
  }

  private handleInput(): void {
    if (this.actionInProgress) return;

    if (this.outcome) {
      if (this.didPressConfirm() || Phaser.Input.Keyboard.JustDown(this.keyCancel)) {
        this.scene.start('GameScene');
      }
      return;
    }

    if (this.mode === 'none') return;

    if (Phaser.Input.Keyboard.JustDown(this.keyUp) || Phaser.Input.Keyboard.JustDown(this.keyLeft)) {
      this.moveSelection(-1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyDown) || Phaser.Input.Keyboard.JustDown(this.keyRight)) {
      this.moveSelection(1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyCancel)) {
      this.cancelMenu();
    }

    if (this.didPressConfirm()) {
      this.confirmSelection();
    }
  }

  private didPressConfirm(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keyConfirm) || Phaser.Input.Keyboard.JustDown(this.keyConfirmAlt);
  }

  private moveSelection(direction: number): void {
    const options = this.getCurrentMenuOptions();
    if (options.length === 0) return;

    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, options.length);
    this.renderMenu();
    this.updateTargetMarker();
  }

  private cancelMenu(): void {
    if (this.mode === 'skills' || this.mode === 'items') {
      this.setMode('command');
      return;
    }

    if (this.mode === 'target-enemy' || this.mode === 'target-ally') {
      if (this.pendingAction?.kind === 'skill') {
        this.setMode('skills');
      } else if (this.pendingAction?.kind === 'item') {
        this.setMode('items');
      } else {
        this.setMode('command');
      }
    }
  }

  private confirmSelection(): void {
    if (!this.currentHero) return;

    if (this.mode === 'command') {
      this.confirmCommand();
      return;
    }

    if (this.mode === 'skills') {
      const skill = this.currentHero.skills[this.selectedIndex];
      if (!skill) return;

      if (this.currentHero.mp < skill.mpCost) {
        this.log(`${this.currentHero.name} needs ${skill.mpCost} MP.`);
        return;
      }

      this.pendingAction = { kind: 'skill', skill };
      this.setMode(skill.target === 'enemy' ? 'target-enemy' : 'target-ally');
      return;
    }

    if (this.mode === 'items') {
      const usableItems = this.items.filter((item) => item.quantity > 0);
      const item = usableItems[this.selectedIndex];
      if (!item) return;

      this.pendingAction = { kind: 'item', item };
      this.setMode(item.target === 'enemy' ? 'target-enemy' : 'target-ally');
      return;
    }

    if (this.mode === 'target-enemy' || this.mode === 'target-ally') {
      this.confirmTarget();
    }
  }

  private confirmCommand(): void {
    const command = COMMANDS[this.selectedIndex];

    if (command === 'Attack') {
      this.pendingAction = { kind: 'attack' };
      this.setMode('target-enemy');
      return;
    }

    if (command === 'Skill') {
      if (!this.currentHero || this.currentHero.skills.length === 0) {
        this.log('No skills ready.');
        return;
      }

      this.setMode('skills');
      return;
    }

    if (command === 'Item') {
      if (this.items.every((item) => item.quantity <= 0)) {
        this.log('No usable items.');
        return;
      }

      this.setMode('items');
      return;
    }

    if (command === 'Guard') {
      this.executeGuard();
      return;
    }

    if (command === 'Run') {
      this.executeRun();
    }
  }

  private confirmTarget(): void {
    if (!this.currentHero || !this.pendingAction) return;

    const targets = this.mode === 'target-enemy' ? this.getLivingEnemies() : this.getLivingParty();
    const target = targets[this.selectedIndex];
    if (!target) return;

    if (this.pendingAction.kind === 'attack') {
      this.executeAttack(this.currentHero, target);
    } else if (this.pendingAction.kind === 'skill') {
      this.executeSkill(this.currentHero, target, this.pendingAction.skill);
    } else {
      this.executeItem(this.currentHero, target, this.pendingAction.item);
    }
  }

  private setMode(mode: BattleMode): void {
    this.mode = mode;
    this.selectedIndex = 0;
    this.renderMenu();
    this.updateTargetMarker();
  }

  private getCurrentMenuOptions(): string[] {
    if (this.mode === 'command') {
      return [...COMMANDS];
    }

    if (this.mode === 'skills') {
      return (this.currentHero?.skills ?? []).map((skill) => `${skill.name} ${skill.mpCost}MP`);
    }

    if (this.mode === 'items') {
      return this.items.filter((item) => item.quantity > 0).map((item) => `${item.name} x${item.quantity}`);
    }

    if (this.mode === 'target-enemy') {
      return this.getLivingEnemies().map((enemy) => `${enemy.name} ${enemy.hp}/${enemy.maxHp}`);
    }

    if (this.mode === 'target-ally') {
      return this.getLivingParty().map((hero) => `${hero.name} ${hero.hp}/${hero.maxHp}`);
    }

    return [];
  }

  private getMenuTitle(): string {
    if (this.mode === 'command') return `${this.currentHero?.name ?? ''}`;
    if (this.mode === 'skills') return 'Skill';
    if (this.mode === 'items') return 'Item';
    if (this.mode === 'target-enemy') return 'Choose enemy';
    if (this.mode === 'target-ally') return 'Choose ally';
    return '';
  }

  private renderMenu(): void {
    this.menuTexts.forEach((text) => text.destroy());
    this.menuTexts = [];

    const options = this.getCurrentMenuOptions();
    const visible = this.mode !== 'none' && this.mode !== 'result';
    this.commandPanel?.setVisible(visible);
    this.commandTitle?.setVisible(visible).setText(this.getMenuTitle());

    if (!visible) return;

    options.forEach((option, index) => {
      const text = this.add.text(444, 270 + index * 14, `${index === this.selectedIndex ? '▶' : ' '} ${option}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: index === this.selectedIndex ? '#fff6c2' : '#d9e1ff'
      });
      this.menuTexts.push(text);
    });

    const hint = this.add.text(444, 328, 'Enter/Space OK  Esc Back', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#8ea0c7'
    });
    this.menuTexts.push(hint);
  }

  private isPausedForWaitMode(): boolean {
    return this.actionInProgress || this.outcome !== null || this.mode !== 'none';
  }

  private fillAtb(delta: number): void {
    for (const hero of this.party) {
      if (this.isAlive(hero) && hero.atb < ATB_MAX) {
        hero.atb = Phaser.Math.Clamp(hero.atb + hero.speed * delta * ATB_FILL_SCALE, 0, ATB_MAX);
      }
    }

    for (const enemy of this.enemies) {
      if (this.isAlive(enemy) && enemy.atb < ATB_MAX) {
        enemy.atb = Phaser.Math.Clamp(enemy.atb + enemy.speed * delta * ATB_FILL_SCALE, 0, ATB_MAX);
      }
    }
  }

  private resolveReadyTurn(): void {
    if (this.currentHero || this.actionInProgress || this.outcome) return;

    const readyHero = this.party.find((hero) => this.isAlive(hero) && hero.atb >= ATB_MAX);
    if (readyHero) {
      this.promptHeroCommand(readyHero);
      return;
    }

    const readyEnemy = this.enemies.find((enemy) => this.isAlive(enemy) && enemy.atb >= ATB_MAX);
    if (readyEnemy) {
      this.executeEnemyTurn(readyEnemy);
    }
  }

  private promptHeroCommand(hero: Combatant): void {
    hero.guarding = false;
    this.currentHero = hero;
    this.pendingAction = null;
    this.setMode('command');
    this.log(`${hero.name} is ready.`);
    this.flashActor(hero, 0xfff0a0);
  }

  private executeAttack(attacker: Combatant, target: Combatant): void {
    this.beginAction();
    const damage = this.calculateDamage(attacker, target, attacker.attack + Phaser.Math.Between(-2, 4));
    this.log(`${attacker.name} attacks ${target.name}!`);
    this.bumpActor(attacker, () => {
      this.applyDamage(target, damage);
      this.flashActor(target, 0xffffff);
      this.time.delayedCall(420, () => this.finishHeroAction());
    });
  }

  private executeSkill(user: Combatant, target: Combatant, skill: Skill): void {
    this.beginAction();
    user.mp = Math.max(0, user.mp - skill.mpCost);

    if (skill.kind === 'heal') {
      this.log(`${user.name} uses ${skill.name}!`);
      this.flashActor(user, 0x9dfff2);
      this.time.delayedCall(250, () => {
        this.applyHealing(target, skill.power);
        this.flashActor(target, 0x9dfff2);
        this.time.delayedCall(420, () => this.finishHeroAction());
      });
      return;
    }

    const basePower = skill.kind === 'guard-break' ? skill.power : skill.power + user.attack;
    const damage = this.calculateDamage(user, target, basePower + Phaser.Math.Between(-1, 5));
    this.log(`${user.name} uses ${skill.name}!`);
    this.flashActor(user, 0xfff0a0);
    this.time.delayedCall(250, () => {
      this.applyDamage(target, damage);
      this.flashActor(target, skill.kind === 'guard-break' ? 0xffa86b : 0x8fe8ff);

      if (skill.kind === 'guard-break' && this.isAlive(target)) {
        target.defense = Math.max(0, target.defense - 2);
        this.log(`${target.name}'s armor cracks.`);
      }

      this.time.delayedCall(460, () => this.finishHeroAction());
    });
  }

  private executeItem(user: Combatant, target: Combatant, item: ItemStack): void {
    if (item.quantity <= 0) {
      this.log('That item is gone.');
      this.setMode('items');
      return;
    }

    this.beginAction();
    item.quantity -= 1;
    this.log(`${user.name} uses ${item.name} on ${target.name}.`);
    this.time.delayedCall(250, () => {
      this.applyHealing(target, item.healAmount);
      this.flashActor(target, 0xa6ffd0);
      this.time.delayedCall(420, () => this.finishHeroAction());
    });
  }

  private executeGuard(): void {
    if (!this.currentHero) return;

    this.beginAction();
    this.currentHero.guarding = true;
    this.log(`${this.currentHero.name} guards.`);
    this.flashActor(this.currentHero, 0xffe39b);
    this.time.delayedCall(360, () => this.finishHeroAction());
  }

  private executeRun(): void {
    if (!this.currentHero) return;

    this.beginAction();
    const success = Phaser.Math.Between(1, 100) <= 55;
    this.log(`${this.currentHero.name} looks for an opening...`);
    this.time.delayedCall(420, () => {
      if (success) {
        this.setOutcome('escape', 'ESCAPE!\nPress Enter to return to the field.');
      } else {
        this.log('No escape!');
        this.finishHeroAction();
      }
    });
  }

  private executeEnemyTurn(enemy: Combatant): void {
    this.actionInProgress = true;
    enemy.atb = 0;

    const target = this.pickRandom(this.getLivingParty());
    if (!target) {
      this.checkBattleEnd();
      return;
    }

    this.log(`${enemy.name} strikes ${target.name}!`);
    this.bumpActor(enemy, () => {
      const damage = this.calculateDamage(enemy, target, enemy.attack + Phaser.Math.Between(-2, 3));
      this.applyDamage(target, damage);
      this.flashActor(target, 0xff9b9b);
      this.time.delayedCall(450, () => {
        this.actionInProgress = false;
        this.checkBattleEnd();
      });
    });
  }

  private beginAction(): void {
    this.actionInProgress = true;
    this.setMode('none');
    this.targetMarker.setVisible(false);
  }

  private finishHeroAction(): void {
    if (this.currentHero) {
      this.currentHero.atb = 0;
    }

    this.currentHero = null;
    this.pendingAction = null;
    this.actionInProgress = false;
    this.setMode('none');
    this.checkBattleEnd();
  }

  private calculateDamage(attacker: Combatant, target: Combatant, rawPower: number): number {
    const teamBonus = attacker.team === 'party' ? 1 : 0;
    const mitigated = Math.max(1, rawPower - Math.floor(target.defense / 2) + teamBonus);
    return Math.max(1, mitigated);
  }

  private applyDamage(target: Combatant, amount: number): void {
    let finalAmount = amount;
    if (target.guarding) {
      finalAmount = Math.ceil(finalAmount / 2);
      target.guarding = false;
      this.log(`${target.name} blocks part of it!`);
    }

    target.hp = Phaser.Math.Clamp(target.hp - finalAmount, 0, target.maxHp);
    this.spawnNumber(target, `-${finalAmount}`, '#ffded6');

    if (target.hp <= 0) {
      this.log(`${target.name} falls.`);
      target.atb = 0;
      target.sprite?.setAlpha(0.38);
      target.sprite?.setAngle(target.team === 'enemy' ? -8 : 8);
    }
  }

  private applyHealing(target: Combatant, amount: number): void {
    const before = target.hp;
    target.hp = Phaser.Math.Clamp(target.hp + amount, 0, target.maxHp);
    const healed = target.hp - before;
    this.spawnNumber(target, `+${healed}`, '#c8ffd8');
  }

  private checkBattleEnd(): void {
    if (this.outcome) return;

    if (this.getLivingEnemies().length === 0) {
      this.setOutcome('victory', 'VICTORY!\n18 EXP  •  12 G\nPress Enter to return to the field.');
      return;
    }

    if (this.getLivingParty().length === 0) {
      this.setOutcome('defeat', 'DEFEAT...\nPress Enter to return to the field.');
    }
  }

  private setOutcome(outcome: BattleOutcome, message: string): void {
    this.outcome = outcome;
    this.actionInProgress = false;
    this.currentHero = null;
    this.pendingAction = null;
    this.setMode('result');
    this.commandPanel.setVisible(false);
    this.commandTitle.setVisible(false);
    this.targetMarker.setVisible(false);
    this.resultText.setText(message).setVisible(true);
  }

  private updateAllUi(): void {
    for (const hero of this.party) {
      const ui = this.actorUi.get(hero.id);
      if (!ui) continue;

      ui.hpText.setText(`HP ${hero.hp}/${hero.maxHp}`);
      ui.mpText?.setText(`MP ${hero.mp}/${hero.maxMp}`);
      ui.stateText.setText(hero.guarding ? 'GUARD' : hero.atb >= ATB_MAX && this.isAlive(hero) ? 'READY' : '');
      this.setBarValue(ui.hpBar, hero.hp, hero.maxHp);
      if (ui.mpBar) this.setBarValue(ui.mpBar, hero.mp, hero.maxMp);
      if (ui.atbBar) this.setBarValue(ui.atbBar, hero.atb, ATB_MAX);
    }

    for (const enemy of this.enemies) {
      const ui = this.actorUi.get(enemy.id);
      if (!ui) continue;

      ui.hpText.setText(`${enemy.hp}/${enemy.maxHp}`);
      ui.stateText.setText(!this.isAlive(enemy) ? 'KO' : enemy.atb >= ATB_MAX ? '!' : '');
      this.setBarValue(ui.hpBar, enemy.hp, enemy.maxHp);
    }
  }

  private setBarValue(bar: BarUi, value: number, max: number): void {
    const ratio = max <= 0 ? 0 : Phaser.Math.Clamp(value / max, 0, 1);
    bar.fill.width = Math.max(0, Math.floor(bar.maxWidth * ratio));
  }

  private updateTargetMarker(): void {
    if (this.mode !== 'target-enemy' && this.mode !== 'target-ally') {
      this.targetMarker?.setVisible(false);
      return;
    }

    const targets = this.mode === 'target-enemy' ? this.getLivingEnemies() : this.getLivingParty();
    const target = targets[this.selectedIndex];
    if (!target?.sprite) {
      this.targetMarker?.setVisible(false);
      return;
    }

    this.targetMarker.setPosition(target.sprite.x - 48, target.sprite.y - 14).setVisible(true);
  }

  private log(message: string): void {
    this.messageText?.setText(message);
  }

  private spawnNumber(target: Combatant, text: string, color: string): void {
    if (!target.sprite) return;

    const numberText = this.add
      .text(target.sprite.x, target.sprite.y - 32, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color,
        stroke: '#101018',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(80);

    this.tweens.add({
      targets: numberText,
      y: numberText.y - 24,
      alpha: 0,
      duration: 700,
      onComplete: () => numberText.destroy()
    });
  }

  private bumpActor(actor: Combatant, onComplete: () => void): void {
    if (!actor.sprite) {
      onComplete();
      return;
    }

    const direction = actor.team === 'party' ? 12 : -12;
    this.tweens.add({
      targets: actor.sprite,
      x: actor.sprite.x + direction,
      duration: 90,
      yoyo: true,
      onComplete
    });
  }

  private flashActor(actor: Combatant, tint: number): void {
    if (!actor.sprite) return;

    const images = actor.sprite.list.filter(
      (child): child is Phaser.GameObjects.Image => child instanceof Phaser.GameObjects.Image
    );

    images.forEach((image) => image.setTint(tint));
    this.time.delayedCall(160, () => images.forEach((image) => image.clearTint()));
  }

  private getLivingParty(): Combatant[] {
    return this.party.filter((hero) => this.isAlive(hero));
  }

  private getLivingEnemies(): Combatant[] {
    return this.enemies.filter((enemy) => this.isAlive(enemy));
  }

  private isAlive(combatant: Combatant): boolean {
    return combatant.hp > 0;
  }

  private pickRandom<T>(values: T[]): T | null {
    if (values.length === 0) return null;
    return values[Phaser.Math.Between(0, values.length - 1)];
  }

  private createGeneratedTextures(): void {
    this.createHeroTexture('battle-rowan', 0x4f82d9, 0xdd4738, 0xffe0bd);
    this.createHeroTexture('battle-lyra', 0x66c6b0, 0xf4f1d6, 0xffe0bd);
    this.createHeroTexture('battle-bronn', 0x768596, 0xd2a85c, 0xffd3ad);
    this.createWispTexture();
    this.createBeetleTexture();
  }

  private createHeroTexture(key: string, bodyColor: number, accentColor: number, faceColor: number): void {
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(24, 42, 30, 8);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(15, 17, 18, 22, 4);
    g.fillStyle(faceColor, 1);
    g.fillRoundedRect(16, 6, 16, 13, 4);
    g.fillStyle(accentColor, 1);
    g.fillRect(13, 18, 22, 5);
    g.fillStyle(0x121622, 1);
    g.fillRect(19, 11, 2, 2);
    g.fillRect(27, 11, 2, 2);
    g.fillStyle(0x6f472a, 1);
    g.fillRect(17, 38, 5, 7);
    g.fillRect(28, 38, 5, 7);
    g.fillStyle(0xe8c174, 1);
    g.fillRect(35, 18, 3, 22);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  private createWispTexture(): void {
    if (this.textures.exists('enemy-wisp')) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(32, 56, 44, 10);
    g.fillStyle(0x4ec2ff, 1);
    g.fillCircle(32, 29, 20);
    g.fillStyle(0x87f4ff, 1);
    g.fillCircle(25, 23, 9);
    g.fillCircle(39, 22, 7);
    g.fillStyle(0x1b3357, 1);
    g.fillCircle(26, 31, 3);
    g.fillCircle(38, 31, 3);
    g.fillStyle(0xffe894, 1);
    g.fillRect(31, 7, 3, 12);
    g.fillRect(32, 7, 12, 3);
    g.generateTexture('enemy-wisp', 64, 64);
    g.destroy();
  }

  private createBeetleTexture(): void {
    if (this.textures.exists('enemy-beetle')) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(32, 56, 48, 9);
    g.fillStyle(0x715948, 1);
    g.fillRoundedRect(12, 23, 40, 22, 8);
    g.fillStyle(0xb68a55, 1);
    g.fillRoundedRect(18, 16, 28, 18, 8);
    g.fillStyle(0x243044, 1);
    g.fillRect(24, 23, 16, 4);
    g.fillStyle(0xe3c16b, 1);
    g.fillRect(16, 44, 5, 8);
    g.fillRect(27, 44, 5, 8);
    g.fillRect(43, 44, 5, 8);
    g.fillStyle(0xff756b, 1);
    g.fillCircle(25, 25, 3);
    g.fillCircle(39, 25, 3);
    g.generateTexture('enemy-beetle', 64, 64);
    g.destroy();
  }
}
