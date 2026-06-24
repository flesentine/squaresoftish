export type ChapterAreaId = 'vael' | 'forest' | 'cave';
export type ChapterStep = 'festival' | 'disaster' | 'forest' | 'cave' | 'complete';
export type ConditionId =
  | 'always'
  | 'before_disaster'
  | 'after_disaster'
  | 'bronn_joined'
  | 'before_bronn'
  | 'boss_defeated'
  | 'before_boss_defeated'
  | 'seal_a_missing'
  | 'seal_b_missing'
  | 'both_seals_read';

export type DialogueLine = {
  speaker?: string;
  text: string;
};

export type ChapterNpcDefinition = {
  id: string;
  name: string;
  x: number;
  y: number;
  texture: string;
  condition?: ConditionId;
  dialogue: DialogueLine[];
  eventAfter?: string;
};

export type ChapterObjectDefinition = {
  id: string;
  name: string;
  x: number;
  y: number;
  texture: string;
  condition?: ConditionId;
  dialogue: DialogueLine[];
  eventAfter?: string;
};

export type ChapterExitDefinition = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetArea?: ChapterAreaId;
  targetSpawn?: string;
  condition?: ConditionId;
  blockedText?: DialogueLine[];
  eventBefore?: string;
};

export type ChapterTriggerDefinition = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  condition?: ConditionId;
  onceFlag?: string;
  eventId?: string;
  encounterId?: string;
  returnSpawn?: string;
  winFlag?: string;
  postBattleEvent?: string;
};

export type ChapterAreaDefinition = {
  id: ChapterAreaId;
  title: string;
  objective: string;
  tiles: string[];
  spawns: Record<string, { x: number; y: number; facing?: 'down' | 'up' | 'left' | 'right' }>;
  npcs: ChapterNpcDefinition[];
  objects: ChapterObjectDefinition[];
  exits: ChapterExitDefinition[];
  triggers: ChapterTriggerDefinition[];
};

export const CHAPTER_ONE_EVENTS: Record<string, DialogueLine[]> = {
  skywell_disaster: [
    { speaker: 'Lyra', text: 'No. The song is not waking it... something underneath is answering.' },
    { speaker: 'Rowan', text: 'The whole plaza is moving. Everyone away from the shrine!' },
    { speaker: 'Skywell Core', text: 'Courier bloodline confirmed. Navigation memory seeking bearer.' },
    { speaker: 'Rowan', text: 'That voice came from the broken compass?' },
    { speaker: 'Lyra', text: 'It chose you. And Helion will tear Vael apart to get it.' }
  ],
  bronn_join: [
    { speaker: 'Bronn', text: 'I was Helion. I know how they close a city after an engine breach.' },
    { speaker: 'Rowan', text: 'You picked a strange time to confess.' },
    { speaker: 'Bronn', text: 'Confess later. Run now. I can open the service road before the soldiers do.' },
    { speaker: 'Lyra', text: 'Then we leave Vael together. The core is still whispering north.' }
  ],
  forest_intro: [
    { speaker: 'Bronn', text: 'Greenwood road first. Stay under the old banners and do not follow lanterns that move.' },
    { speaker: 'Lyra', text: 'The wind used to carry festival bells here. Now it carries gears.' }
  ],
  cave_intro: [
    { speaker: 'Rowan', text: 'The core is pulling toward that cave shrine.' },
    { speaker: 'Lyra', text: 'Read the two shrine seals. If this place is still sacred, it will answer carefully.' }
  ],
  core_reveal: [
    { speaker: 'Skywell Core', text: 'Map-heart intact. Guardian protocol fractured. Weather memory leaking.' },
    { speaker: 'Bronn', text: 'That guardian is not protecting the shrine anymore. It is protecting the wound.' },
    { speaker: 'Rowan', text: 'Then we shut it down before Helion finds the door.' }
  ],
  boss_defeated: [
    { speaker: 'Lyra', text: 'The shrine is quiet. Not dead... listening.' },
    { speaker: 'Skywell Core', text: 'Next Skywell signal: north-by-starlight. Helion search pattern closing.' },
    { speaker: 'Bronn', text: 'Troops will reach Vael and call this an attack. We cannot go back.' },
    { speaker: 'Rowan', text: 'Then Chapter 1 ends with us moving. Next Skywell, before Helion rewrites the story.' }
  ]
};

const VAEL_TILES = [
  '##############################',
  '#TT..TT..TT..CCC..TT..TT..TT#',
  '#T....T......CCC......T....T#',
  '#....CCCCCCCCCCCCCCCCCC....#',
  '#...CC....FFFSSSFFF....CC..#',
  '#..CC.....F..AAA..F.....CC.#',
  '#..CC..F..F..AAA..F..F..CC.#',
  '#..CCCCCCCCCCCCC DCCCCCCCC.#',
  '#.......P.....CC DCC.......#',
  '#..F....P.....CC DCC....F..#',
  '#.......PPPPPPPP DPPPPPPP..#',
  '#..F....P.....CC DCC....F..#',
  '#.......P.....CC DCC.......#',
  '#..CCCCC CCCCCCC DCCCCCCC..#',
  '#..CC........PPP PPP....CC..#',
  '#..CC..F.....P.....F....CC..#',
  '#......F.....P..........CC..#',
  '#..PPPPPPPPPPP.....PPPPPPP.#',
  '#..P.....................P.#',
  '#..P...TT....TT....TT....P.#',
  '#TTTTTTTTTTTTTTTTTTTTTTTTTT#',
  '##############################'
];

const FOREST_TILES = [
  '##############################',
  '#TTTTTTTTTTTTTTTTTTTTTTTTTTTT#',
  '#T......P....TT......P.....TT#',
  '#T.TTT..P....TT..TT..P..TT..T#',
  '#T.T....PPPPPPPPPPP..P..TT..T#',
  '#T.T....P....TT...P..P......T#',
  '#T.TTTT.P.TT.TT.T.P..PPPP...T#',
  '#T......P.TT....T.P.....P...T#',
  '#T..PPPPP.PPPPPPP.PPPP..P.TTT#',
  '#T..P...........P....P..P...T#',
  '#T..P.TTTTTTTT..PPPPPP..PPP.T#',
  '#T..P.T......T.........TT.P.T#',
  '#T..P.T..PP..TTTTTTTTTTT.P.T#',
  '#T..P....P...............P..T#',
  '#T..PPPPPP..TTTT..PPPPPPPP..T#',
  '#T..........TTTT............T#',
  '#TTTT..TTT........TTT..TTTTT#',
  '#T......TT..PPPPP..TT......T#',
  '#T..TT......P...P......TT..T#',
  '#T..TTTTTTTTP...PTTTTTTTT..T#',
  '#TTTTTTTTTTTTTTTTTTTTTTTTTTT#',
  '##############################'
];

const CAVE_TILES = [
  '##############################',
  '#MMMMMMMMMMMMMMMMMMMMMMMMMMMM#',
  '#M..........SSSSSS..........M#',
  '#M..MMMMMM..S....S..MMMMMM..M#',
  '#M..M....M..S....S..M....M..M#',
  '#M..M....M..PPPPPP..M....M..M#',
  '#M..M....M....PP....M....M..M#',
  '#M..M....MMMM.PP.MMMM....M..M#',
  '#M..M........PPPP........M..M#',
  '#M..MMMMM..M.PP.M..MMMMM.M..M#',
  '#M........MM.PP.MM........M.M#',
  '#MMMMMM...MM.PP.MM...MMMMMM.M#',
  '#M...........PP.............M#',
  '#M..MMMMMMM..PP..MMMMMMMM..M#',
  '#M..M........PP........M...M#',
  '#M..M..MMMMM.PP.MMMMM..M...M#',
  '#M.....M.....PP.....M......M#',
  '#MMMM..M..MMMMMMMM..M..MMMM#',
  '#M.........PPPPPP.........M#',
  '#M..MMMMM..........MMMMM..M#',
  '#MMMMMMMMMMMMMMMMMMMMMMMMMM#',
  '##############################'
];

export const CHAPTER_ONE_AREAS: Record<ChapterAreaId, ChapterAreaDefinition> = {
  vael: {
    id: 'vael',
    title: 'Vael - Midsummer Wind Festival',
    objective: 'Talk to Lyra at the shrine song circle.',
    tiles: VAEL_TILES,
    spawns: {
      start: { x: 4.5, y: 18.4, facing: 'up' },
      afterDisaster: { x: 15.4, y: 12.2, facing: 'right' },
      fromForest: { x: 25.4, y: 10.5, facing: 'left' }
    },
    npcs: [
      {
        id: 'lyra_festival',
        name: 'Lyra',
        x: 15,
        y: 7,
        texture: 'npc-lyra',
        condition: 'before_disaster',
        dialogue: [
          { speaker: 'Lyra', text: 'The wind is wrong today. The dead Skywell is humming under the hymn.' },
          { speaker: 'Rowan', text: 'Wrong how? I only came to deliver festival letters.' },
          { speaker: 'Lyra', text: 'Then deliver this warning: step back from the shrine stones.' }
        ],
        eventAfter: 'skywell_disaster'
      },
      {
        id: 'mira',
        name: 'Mira',
        x: 7,
        y: 16,
        texture: 'npc-mira',
        condition: 'before_disaster',
        dialogue: [
          { speaker: 'Mira', text: 'Vael throws the best wind festival on the cliffs. Buy sweets before the shrine song starts!' },
          { speaker: 'Rowan', text: 'I should find Lyra near the old Skywell.' }
        ]
      },
      {
        id: 'toma',
        name: 'Toma',
        x: 23,
        y: 15,
        texture: 'npc-toma',
        condition: 'before_disaster',
        dialogue: [
          { speaker: 'Toma', text: 'They say the Skywell has been dead for three hundred years. Still makes my teeth buzz.' }
        ]
      },
      {
        id: 'piko',
        name: 'Guildmaster Piko',
        x: 5,
        y: 10,
        texture: 'npc-piko',
        condition: 'before_disaster',
        dialogue: [
          { speaker: 'Piko', text: 'Rowan! Festival rule one: never lose the satchel. Rule two: never volunteer for priest work.' }
        ]
      },
      {
        id: 'panic_mira',
        name: 'Mira',
        x: 7,
        y: 16,
        texture: 'npc-mira-panic',
        condition: 'after_disaster',
        dialogue: [
          { speaker: 'Mira', text: 'The shrine district cracked open. Go east if you can still move!' }
        ]
      },
      {
        id: 'bronn_vael',
        name: 'Bronn',
        x: 25,
        y: 10,
        texture: 'npc-bronn',
        condition: 'before_bronn',
        dialogue: [
          { speaker: 'Bronn', text: 'Courier. Cantor. If that core is bound to you, Helion is already marching.' }
        ],
        eventAfter: 'bronn_join'
      }
    ],
    objects: [
      {
        id: 'skywell_altar',
        name: 'Dead Skywell Altar',
        x: 15,
        y: 5,
        texture: 'object-skywell',
        condition: 'before_disaster',
        dialogue: [
          { speaker: 'Narration', text: 'Cold brass rings rise from the plaza. The festival ribbons snap toward the dead tower.' },
          { speaker: 'Rowan', text: 'My compass is spinning. That is probably bad.' }
        ],
        eventAfter: 'skywell_disaster'
      },
      {
        id: 'rubble_read',
        name: 'Cracked Shrine Road',
        x: 16,
        y: 9,
        texture: 'object-rubble',
        condition: 'after_disaster',
        dialogue: [
          { speaker: 'Narration', text: 'The shrine road collapsed into glowing seams. Heat rises like breath from a machine.' }
        ]
      }
    ],
    exits: [
      {
        id: 'east_service_road',
        x: 26,
        y: 9,
        width: 1,
        height: 5,
        targetArea: 'forest',
        targetSpawn: 'fromVael',
        condition: 'bronn_joined',
        eventBefore: 'forest_intro',
        blockedText: [
          { speaker: 'Rowan', text: 'The east service road is locked. Bronn said he knows how to open it.' }
        ]
      }
    ],
    triggers: []
  },
  forest: {
    id: 'forest',
    title: 'Greenwood Road - Forest Escape',
    objective: 'Push east through Greenwood road and survive the engine-born patrols.',
    tiles: FOREST_TILES,
    spawns: {
      fromVael: { x: 2.2, y: 10.4, facing: 'right' },
      afterBattle1: { x: 10.2, y: 8.5, facing: 'right' },
      afterBattle2: { x: 20.2, y: 14.4, facing: 'right' },
      fromCave: { x: 27.2, y: 10.5, facing: 'left' }
    },
    npcs: [
      {
        id: 'lyra_forest',
        name: 'Lyra',
        x: 6,
        y: 13,
        texture: 'npc-lyra',
        condition: 'after_disaster',
        dialogue: [
          { speaker: 'Lyra', text: 'The core grows louder under the trees. It is not a god, Rowan. It is lonely machinery.' }
        ]
      },
      {
        id: 'bronn_forest',
        name: 'Bronn',
        x: 8,
        y: 13,
        texture: 'npc-bronn',
        condition: 'bronn_joined',
        dialogue: [
          { speaker: 'Bronn', text: 'Helion engine-born scouts are ahead. Use Guard when the line starts to buckle.' }
        ]
      }
    ],
    objects: [
      {
        id: 'old_banner',
        name: 'Fallen Wind Banner',
        x: 15,
        y: 8,
        texture: 'object-banner',
        dialogue: [
          { speaker: 'Narration', text: 'A Vael festival banner hangs from a branch. The cloth is torn cleanly by hot wind.' }
        ]
      }
    ],
    exits: [
      {
        id: 'forest_to_cave',
        x: 27,
        y: 8,
        width: 2,
        height: 6,
        targetArea: 'cave',
        targetSpawn: 'fromForest',
        eventBefore: 'cave_intro'
      },
      {
        id: 'forest_to_vael',
        x: 0,
        y: 8,
        width: 2,
        height: 6,
        targetArea: 'vael',
        targetSpawn: 'fromForest',
        blockedText: [
          { speaker: 'Bronn', text: 'Back to Vael means back into Helion chains. Keep moving.' }
        ]
      }
    ],
    triggers: [
      {
        id: 'forest_wisp_ambush',
        x: 9,
        y: 7,
        width: 2,
        height: 3,
        onceFlag: 'forest_wisp_cleared',
        encounterId: 'forest_escape',
        returnSpawn: 'afterBattle1',
        winFlag: 'forest_wisp_cleared'
      },
      {
        id: 'forest_beetle_ambush',
        x: 19,
        y: 13,
        width: 3,
        height: 3,
        onceFlag: 'forest_beetle_cleared',
        encounterId: 'forest_escape_heavy',
        returnSpawn: 'afterBattle2',
        winFlag: 'forest_beetle_cleared'
      }
    ]
  },
  cave: {
    id: 'cave',
    title: 'Cave Shrine - Map-Heart Chamber',
    objective: 'Read both shrine seals, then approach the living core.',
    tiles: CAVE_TILES,
    spawns: {
      fromForest: { x: 15.2, y: 18.5, facing: 'up' },
      afterBoss: { x: 15.2, y: 5.8, facing: 'down' }
    },
    npcs: [
      {
        id: 'lyra_cave',
        name: 'Lyra',
        x: 12,
        y: 18,
        texture: 'npc-lyra',
        condition: 'before_boss_defeated',
        dialogue: [
          { speaker: 'Lyra', text: 'The cave remembers songs that Vael forgot. Read the seals before touching the core.' }
        ]
      },
      {
        id: 'bronn_cave',
        name: 'Bronn',
        x: 18,
        y: 18,
        texture: 'npc-bronn',
        condition: 'before_boss_defeated',
        dialogue: [
          { speaker: 'Bronn', text: 'Old Helion reports called this place a maintenance chapel. That was a lie, or a joke.' }
        ]
      }
    ],
    objects: [
      {
        id: 'seal_a',
        name: 'Left Shrine Seal',
        x: 9,
        y: 12,
        texture: 'object-sigil-blue',
        condition: 'seal_a_missing',
        dialogue: [
          { speaker: 'Inscription', text: 'A Skywell remembers rain, border, oath, harvest, road, and grave.' },
          { speaker: 'Lyra', text: 'That is not a prayer. That is a list of things rulers want to own.' }
        ],
        eventAfter: 'read_seal_a'
      },
      {
        id: 'seal_b',
        name: 'Right Shrine Seal',
        x: 21,
        y: 12,
        texture: 'object-sigil-gold',
        condition: 'seal_b_missing',
        dialogue: [
          { speaker: 'Inscription', text: 'When stewardship becomes command, shut the engines and scatter the keys.' },
          { speaker: 'Bronn', text: 'Scatter the keys. Helion found one, and Rowan is carrying another.' }
        ],
        eventAfter: 'read_seal_b'
      },
      {
        id: 'living_core',
        name: 'Living Navigation Core',
        x: 15,
        y: 5,
        texture: 'object-core',
        condition: 'both_seals_read',
        dialogue: [
          { speaker: 'Narration', text: 'The core floats above the shrine font, ticking like a frightened bird.' }
        ],
        eventAfter: 'core_reveal'
      }
    ],
    exits: [
      {
        id: 'cave_to_forest',
        x: 14,
        y: 19,
        width: 3,
        height: 2,
        targetArea: 'forest',
        targetSpawn: 'fromCave'
      }
    ],
    triggers: [
      {
        id: 'boss_shrine_trigger',
        x: 13,
        y: 4,
        width: 5,
        height: 3,
        condition: 'both_seals_read',
        onceFlag: 'boss_defeated',
        eventId: 'core_reveal'
      }
    ]
  }
};
