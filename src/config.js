// config.js — shared level definitions, imported by scenes without circular deps
export const LEVELS = [
  {
    gravity: 980,
    levelKey: 'level1',
    flippersAtBottom: true,
    nextScene: 'SummaryScene',
    label: 'Level 1 – Terra Firma',
  },
  {
    gravity: 200,
    levelKey: 'level2',
    flippersAtBottom: true,
    nextScene: 'SummaryScene',
    label: 'Level 2 – Float Zone',
  },
  {
    gravity: -980,
    levelKey: 'level3',
    flippersAtBottom: false,
    nextScene: 'SummaryScene',
    label: 'Level 3 – Inverted Sky',
  },
];
