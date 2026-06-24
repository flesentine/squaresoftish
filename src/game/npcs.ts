import type { NpcDefinition } from './types';

export const NPCS: NpcDefinition[] = [
  {
    id: 'elder-mira',
    name: 'Elder Mira',
    x: 14,
    y: 7,
    texture: 'npc-mira',
    dialogue: [
      'The old road is open again. That means trouble, or treasure. Usually both.',
      'Talk to everyone. Small towns hide big quests.',
      'Come back after we add inventory and I might give you a key.'
    ]
  },
  {
    id: 'guard-toma',
    name: 'Guard Toma',
    x: 24,
    y: 12,
    texture: 'npc-toma',
    dialogue: [
      'Hold it. Bandits were seen near the eastern trees.',
      'You can move with WASD or arrow keys. Press E or Space to talk.',
      'Very official guard advice: save before doing anything dumb.'
    ]
  },
  {
    id: 'merchant-pip',
    name: 'Merchant Pip',
    x: 6,
    y: 16,
    texture: 'npc-pip',
    dialogue: [
      'Fresh potions! Invisible armor! Slightly haunted bread!',
      'Okay, none of that is implemented yet. But the dialogue box works.',
      'Next upgrade should be shops or quests. That is where this starts feeling real.'
    ]
  }
];
