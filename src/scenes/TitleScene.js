// TitleScene.js — splash screen; press Space or tap to start Level 1
import { LEVELS } from '../config.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width: W, height: H } = this.scale;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a2e);

    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(40, W - 40);
      const y = Phaser.Math.Between(200, H - 200);
      const r = Phaser.Math.Between(16, 40);
      this.add.circle(x, y, r, 0x2244aa, 0.4);
    }

    this.add.text(W / 2, 180, 'GRAVITY', {
      fontSize: '64px', fontFamily: 'Arial Black, sans-serif',
      color: '#00eeff', stroke: '#003366', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(W / 2, 255, 'GARDENS', {
      fontSize: '64px', fontFamily: 'Arial Black, sans-serif',
      color: '#aaff44', stroke: '#224400', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(W / 2, 340, 'Pinball across three worlds', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#aaaacc',
    }).setOrigin(0.5);

    const labels = ['Level 1\nTerra Firma', 'Level 2\nFloat Zone', 'Level 3\nInverted Sky'];
    const colors = [0x2255aa, 0x226633, 0x662233];
    labels.forEach((label, i) => {
      const bx = 100 + i * 140;
      this.add.rectangle(bx, 430, 120, 60, colors[i], 0.7).setOrigin(0.5);
      this.add.text(bx, 430, label, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif',
        color: '#ffffff', align: 'center',
      }).setOrigin(0.5);
    });

    const prompt = this.add.text(W / 2, 560, 'PRESS SPACE  or  TAP TO PLAY', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt, alpha: 0, duration: 700,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, 668, '© Gravity Gardens 2026  |  Built with Phaser 3 by Photon Storm', {
      fontSize: '10px', color: '#555577',
    }).setOrigin(0.5);

    this.add.text(W / 2, 684, 'All graphics procedurally generated  |  No external assets', {
      fontSize: '10px', color: '#444466',
    }).setOrigin(0.5);

    // DISCRETE INPUT: fires once on keydown, not continuously
    this.input.keyboard.once('keydown-SPACE', () => this._startGame());
    this.input.once('pointerup', () => this._startGame());
  }

  _startGame() {
    this.scene.start('PinballScene', { ...LEVELS[0], levelIndex: 0, totalScore: 0 });
  }
}
