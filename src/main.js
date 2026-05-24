// ─── DEBUG FLAG ───────────────────────────────────────────────────────────────
// Set to true to show Arcade Physics debug outlines; false before final deploy
const DEBUG = false;

import TitleScene    from './scenes/TitleScene.js';
import PinballScene  from './scenes/PinballScene.js';
import SummaryScene  from './scenes/SummaryScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 720,
  backgroundColor: '#0a0a1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // gravity set per-scene in PinballScene.create()
      debug: DEBUG,
    },
  },
  scene: [TitleScene, PinballScene, SummaryScene, GameOverScene],
};

new Phaser.Game(config);
