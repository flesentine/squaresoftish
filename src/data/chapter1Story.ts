export const CHAPTER1_STORY = {
  title: 'Chapter 1 — The Waking Sky',
  subtitle: 'Vael Festival → Skywell disaster → forest escape → cave shrine → first boss',
  synopsis:
    'Rowan arrives in Vael during the midsummer wind festival. Lyra performs a shrine song near the dormant Skywell, which awakens violently and damages the shrine district. Bronn, a former Helion engine-knight, opens an escape path. The three flee along Greenwood Road, reach a cave shrine, discover that a living navigation core has bound itself to Rowan, and defeat the Broken Weather Guardian before Helion troops arrive.',
  currentObjective: 'Find Lyra near the dead Skywell shrine before the wind festival ceremony begins.',
  beats: [
    'Rowan enters Vael during the midsummer wind festival and meets the townspeople.',
    'Lyra prepares a shrine-song at the dead Skywell while festival bells cover strange engine noises.',
    'The Skywell wakes, the shrine district shakes, and the festival turns into a disaster.',
    'Bronn appears as a former Helion engine-knight and forces open the eastern escape path.',
    'The party flees down Greenwood Road while engine-born enemies pursue them.',
    'A cave shrine reveals that the navigation core is alive and bound to Rowan.',
    'The party fights the Broken Weather Guardian, which changes pattern at half HP.',
    'Helion troops arrive too late; Rowan, Lyra, and Bronn run toward the next Skywell.'
  ],
  cast: [
    'Rowan — courier pulled into the Skywell disaster by the living navigation core.',
    'Lyra — shrine singer whose song accidentally becomes the Skywell trigger.',
    'Bronn — ex-Helion engine-knight trying to keep the party ahead of the troops.',
    'Elder Mira — Vael elder who knows the old Skywell warnings were not superstition.',
    'Guard Toma — town guard watching the eastern road and the first escape route.',
    'Merchant Pip — festival merchant who hears the first rumors of engine-born monsters.'
  ],
  locations: [
    'Vael festival square',
    'Dead Skywell shrine',
    'Damaged shrine district',
    'Greenwood Road',
    'Cave shrine',
    'Weather Guardian chamber'
  ]
} as const;
