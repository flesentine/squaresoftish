import itemData from '../data/items.json';

export type HeroId = 'rowan' | 'lyra' | 'bronn';

export type ItemDefinition = {
  id: string;
  name: string;
  quantity: number;
  healAmount: number;
  target: 'ally';
  description: string;
};

export type HeroState = {
  id: HeroId;
  name: string;
  level: number;
  exp: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  speed: number;
  attack: number;
  defense: number;
  role: string;
  status: 'OK' | 'KO';
};

export type InventoryStack = {
  itemId: string;
  quantity: number;
};

export type FieldState = {
  mapId: string;
  x: number;
  y: number;
  direction: 'down' | 'up' | 'left' | 'right';
  playTimeSeconds: number;
};

export type OptionsState = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  textSpeed: 'Slow' | 'Normal' | 'Fast';
};

export type GameState = {
  version: 1;
  gold: number;
  flags: Record<string, boolean>;
  field: FieldState;
  party: HeroState[];
  inventory: InventoryStack[];
  options: OptionsState;
};

export const ITEM_DEFINITIONS = itemData as ItemDefinition[];

export const STARTING_STATE: GameState = {
  version: 1,
  gold: 42,
  flags: {},
  field: {
    mapId: 'vael-festival-road',
    x: 2.5 * 32,
    y: 2.5 * 32,
    direction: 'down',
    playTimeSeconds: 0
  },
  party: [
    {
      id: 'rowan',
      name: 'Rowan',
      level: 3,
      exp: 18,
      maxHp: 148,
      hp: 148,
      maxMp: 20,
      mp: 20,
      speed: 16,
      attack: 18,
      defense: 5,
      role: 'Courier / Spear arts',
      status: 'OK'
    },
    {
      id: 'lyra',
      name: 'Lyra',
      level: 3,
      exp: 18,
      maxHp: 112,
      hp: 112,
      maxMp: 34,
      mp: 34,
      speed: 13,
      attack: 10,
      defense: 4,
      role: 'Cantor / Healing bell',
      status: 'OK'
    },
    {
      id: 'bronn',
      name: 'Bronn',
      level: 3,
      exp: 18,
      maxHp: 182,
      hp: 182,
      maxMp: 16,
      mp: 16,
      speed: 10,
      attack: 20,
      defense: 8,
      role: 'Engine-knight / Tank',
      status: 'OK'
    }
  ],
  inventory: ITEM_DEFINITIONS.map((item) => ({ itemId: item.id, quantity: item.quantity })),
  options: {
    musicEnabled: true,
    sfxEnabled: true,
    textSpeed: 'Normal'
  }
};

const cloneState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

class GameStateStore {
  private state = cloneState(STARTING_STATE);

  get snapshot(): GameState {
    return this.state;
  }

  replace(nextState: GameState): void {
    this.state = cloneState(nextState);
  }

  reset(): void {
    this.state = cloneState(STARTING_STATE);
  }

  setFlag(flag: string, value = true): void {
    this.state.flags[flag] = value;
  }

  updateField(x: number, y: number, direction: FieldState['direction']): void {
    this.state.field.x = x;
    this.state.field.y = y;
    this.state.field.direction = direction;
  }

  addPlayTime(seconds: number): void {
    this.state.field.playTimeSeconds += Math.max(0, seconds);
  }

  getItemDefinition(itemId: string): ItemDefinition | null {
    return ITEM_DEFINITIONS.find((item) => item.id === itemId) ?? null;
  }

  getInventoryWithDefinitions(): Array<ItemDefinition & { quantity: number }> {
    return this.state.inventory
      .map((stack) => {
        const definition = this.getItemDefinition(stack.itemId);
        return definition ? { ...definition, quantity: stack.quantity } : null;
      })
      .filter((entry): entry is ItemDefinition & { quantity: number } => entry !== null);
  }

  setItemQuantity(itemId: string, quantity: number): void {
    const stack = this.state.inventory.find((candidate) => candidate.itemId === itemId);
    if (stack) {
      stack.quantity = Math.max(0, quantity);
      return;
    }

    this.state.inventory.push({ itemId, quantity: Math.max(0, quantity) });
  }

  addItem(itemId: string, quantity: number): void {
    const current = this.state.inventory.find((stack) => stack.itemId === itemId)?.quantity ?? 0;
    this.setItemQuantity(itemId, current + quantity);
  }

  useHealingItem(itemId: string, heroId: HeroId): { ok: true; healed: number; itemName: string; heroName: string } | { ok: false; reason: string } {
    const definition = this.getItemDefinition(itemId);
    if (!definition) return { ok: false, reason: 'Missing item data.' };

    const stack = this.state.inventory.find((candidate) => candidate.itemId === itemId);
    if (!stack || stack.quantity <= 0) return { ok: false, reason: `${definition.name} is gone.` };

    const hero = this.state.party.find((candidate) => candidate.id === heroId);
    if (!hero) return { ok: false, reason: 'Missing hero.' };
    if (hero.hp <= 0) return { ok: false, reason: `${hero.name} is KO.` };

    const before = hero.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + definition.healAmount);
    stack.quantity -= 1;
    hero.status = hero.hp > 0 ? 'OK' : 'KO';

    return {
      ok: true,
      healed: hero.hp - before,
      itemName: definition.name,
      heroName: hero.name
    };
  }

  applyPartyAfterBattle(partyState: Array<Pick<HeroState, 'id' | 'hp' | 'mp' | 'status'>>): void {
    for (const incoming of partyState) {
      const hero = this.state.party.find((candidate) => candidate.id === incoming.id);
      if (!hero) continue;
      hero.hp = Math.max(0, Math.min(hero.maxHp, incoming.hp));
      hero.mp = Math.max(0, Math.min(hero.maxMp, incoming.mp));
      hero.status = hero.hp <= 0 ? 'KO' : incoming.status;
    }
  }

  grantBattleReward(exp: number, gold: number): void {
    this.state.gold += gold;
    this.state.party.forEach((hero) => {
      if (hero.hp > 0) hero.exp += exp;
    });
  }

  reviveForField(): void {
    this.state.party.forEach((hero) => {
      if (hero.hp <= 0) {
        hero.hp = Math.max(1, Math.floor(hero.maxHp * 0.2));
        hero.status = 'OK';
      }
    });
  }

  toggleMusic(): boolean {
    this.state.options.musicEnabled = !this.state.options.musicEnabled;
    return this.state.options.musicEnabled;
  }

  toggleSfx(): boolean {
    this.state.options.sfxEnabled = !this.state.options.sfxEnabled;
    return this.state.options.sfxEnabled;
  }

  cycleTextSpeed(): OptionsState['textSpeed'] {
    const order: OptionsState['textSpeed'][] = ['Slow', 'Normal', 'Fast'];
    const currentIndex = order.indexOf(this.state.options.textSpeed);
    this.state.options.textSpeed = order[(currentIndex + 1) % order.length];
    return this.state.options.textSpeed;
  }
}

export const gameState = new GameStateStore();
export const cloneGameState = cloneState;
