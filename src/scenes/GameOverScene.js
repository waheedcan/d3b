// GameOverScene.js — final screen: total score and replay button
// Receives: { totalScore, levelIndex, complete? }
import { LEVELS } from '../config.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.finalScore  = data.totalScore ?? 0;
    this.levelIndex  = data.levelIndex ?? 0;
    this.wasComplete = data.complete   ?? false;
  }

  create() {
    const { width: W, height: H } = this.scale;

    this.add.rectangle(W / 2, H / 2, W, H, 0x08080f);

    const border = this.add.rectangle(W / 2, H / 2, W - 4, H - 4)
      .setStrokeStyle(3, 0xff4444);
    this.tweens.add({
      targets: border, strokeColor: 0xffaa00,
      duration: 800, yoyo: true, repeat: -1,
    });

    const headline  = this.wasComplete ? 'YOU WIN!'   : 'GAME OVER';
    const headColor = this.wasComplete ? '#00ff88'    : '#ff4444';

    this.add.text(W / 2, 160, headline, {
      fontSize: '60px', fontFamily: 'Arial Black', color: headColor,
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5);

    const levelNames  = ['Terra Firma', 'Float Zone', 'Inverted Sky'];
    const reachedName = levelNames[this.levelIndex] ?? `Level ${this.levelIndex + 1}`;
    const sub = this.wasComplete ? 'All three worlds conquered!' : `Reached: ${reachedName}`;

    this.add.text(W / 2, 240, sub, {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#aaaacc',
    }).setOrigin(0.5);

    this.add.rectangle(W / 2, 340, 320, 100, 0x111133, 0.9);
    this.add.text(W / 2, 315, 'TOTAL SCORE', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#888899',
    }).setOrigin(0.5);
    this.add.text(W / 2, 355, `${this.finalScore}`, {
      fontSize: '48px', fontFamily: 'Arial Black', color: '#ffdd44',
      stroke: '#443300', strokeThickness: 5,
    }).setOrigin(0.5);

    // Star rating based on score relative to rough maximum
    const maxScore = LEVELS.length * (5 * 100 + 20 * 10);
    const pct      = Math.min(this.finalScore / maxScore, 1);
    const stars    = pct >= 0.66 ? 3 : pct >= 0.33 ? 2 : 1;
    this.add.text(W / 2, 430, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
      fontSize: '50px', color: '#ffcc00',
    }).setOrigin(0.5);

    // DISCRETE INPUT: single click or Space to replay
    const btnBg = this.add.rectangle(W / 2, 540, 220, 54, 0x442222)
      .setInteractive({ useHandCursor: true });

    this.add.text(W / 2, 540, '↺  PLAY AGAIN', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#ff8888',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x663333));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x442222));
    btnBg.on('pointerup',   () => this._replay());

    // DISCRETE: fires once
    this.input.keyboard.once('keydown-SPACE', () => this._replay());

    this.add.text(W / 2, 620, 'Press SPACE or tap to replay', {
      fontSize: '14px', color: '#555577',
    }).setOrigin(0.5);
  }

  _replay() {
    this.scene.start('TitleScene');
  }
}
