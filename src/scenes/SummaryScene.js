// SummaryScene.js — post-level stats, teaser for next level, Continue button
// Receives: { score, accuracy, targetsHit, totalTargets, timeSec,
//             levelKey, levelIndex, totalScore, nextLevelIndex }
import { LEVELS } from '../config.js';

const TEASERS = {
  level1: 'Next: Float Zone — low gravity makes everything dreamy and slow…',
  level2: 'Next: Inverted Sky — gravity flips! Flippers move to the top.',
  level3: 'You conquered all three worlds. Final score awaits…',
};

const LEVEL_LABELS = {
  level1: 'Level 1 – Terra Firma',
  level2: 'Level 2 – Float Zone',
  level3: 'Level 3 – Inverted Sky',
};

export default class SummaryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SummaryScene' });
  }

  init(data) {
    this.data2 = data;
  }

  create() {
    const d = this.data2;
    const { width: W, height: H } = this.scale;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d22);
    this.add.rectangle(W / 2, 6, W, 12, 0x00ff88);

    this.add.text(W / 2, 50, 'LEVEL CLEAR', {
      fontSize: '40px', fontFamily: 'Arial Black', color: '#00ff88',
      stroke: '#003322', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, 100, LEVEL_LABELS[d.levelKey] ?? d.levelKey, {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#aaeeff',
    }).setOrigin(0.5);

    const panelY = 160;
    this.add.rectangle(W / 2, panelY + 110, 380, 220, 0x11113a, 0.9);

    const statStyle = { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffffff' };
    const valStyle  = { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffdd44' };

    const rows = [
      ['Score',         `${d.score} pts`],
      ['Targets',       `${d.targetsHit} / ${d.totalTargets}`],
      ['Accuracy',      `${Math.round((d.accuracy ?? 0) * 100)}%`],
      ['Time',          `${d.timeSec}s`],
      ['Running Total', `${d.totalScore} pts`],
    ];

    rows.forEach(([label, value], i) => {
      const y = panelY + 20 + i * 40;
      this.add.text(W / 2 - 140, y, label, statStyle);
      this.add.text(W / 2 + 140, y, value, valStyle).setOrigin(1, 0);
      if (i < rows.length - 1) {
        const g = this.add.graphics();
        g.lineStyle(1, 0x334466, 0.5);
        g.lineBetween(W / 2 - 150, y + 30, W / 2 + 150, y + 30);
      }
    });

    this.add.text(W / 2, 430, TEASERS[d.levelKey] ?? '', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#88aacc',
      wordWrap: { width: 380 }, align: 'center',
    }).setOrigin(0.5);

    // DISCRETE INPUT: pointer click or Space fires once
    const btnY  = 530;
    const btnBg = this.add.rectangle(W / 2, btnY, 220, 54, 0x225533)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(W / 2, btnY, 'CONTINUE  ▶', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#00ff88',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x338844));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x225533));
    btnBg.on('pointerup',   () => this._continue());

    // DISCRETE: single keydown event
    this.input.keyboard.once('keydown-SPACE', () => this._continue());

    this.tweens.add({
      targets: btnText, x: W / 2 + 6, duration: 500,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this._nextIdx = d.nextLevelIndex ?? (d.levelIndex + 1);
    this._runData = d;
  }

  _continue() {
    const nextIdx = this._nextIdx;
    if (nextIdx >= LEVELS.length) {
      this.scene.start('GameOverScene', {
        totalScore: this._runData.totalScore,
        levelIndex: this._runData.levelIndex,
        complete: true,
      });
    } else {
      this.scene.start('PinballScene', {
        ...LEVELS[nextIdx],
        levelIndex: nextIdx,
        totalScore: this._runData.totalScore,
      });
    }
  }
}
