// PinballScene.js — core pinball simulation, reusable across all levels
// Receives init data: { gravity, levelKey, flippersAtBottom, nextScene, levelIndex, totalScore }

// ── Flipper constants ─────────────────────────────────────────────────────────
const FLIPPER_W    = 105; // flipper length (px)
const FLIPPER_H    = 16;  // flipper thickness (px)
const FLIPPER_LERP = 0.3; // interpolation speed (0–1 per frame); higher = snappier

// ── Ball constants ────────────────────────────────────────────────────────────
const BALL_RADIUS  = 11;
const BALL_BOUNCE  = 0.6;  // restitution applied in manual flipper response
const BALL_DRAG    = 25;   // simulates air resistance (px/s² per axis)

// ── Bumper constants ──────────────────────────────────────────────────────────
const BUMPER_RADIUS  = 22;
const BUMPER_IMPULSE = 370; // outward speed applied on bumper contact (px/s)

// ── Plunger constants ─────────────────────────────────────────────────────────
const PLUNGER_MAX_HOLD = 1500; // ms; caps the charge duration
const PLUNGER_MIN_VEL  = 250;  // px/s minimum launch speed
const PLUNGER_MAX_VEL  = 950;  // px/s maximum launch speed

const MAX_LIVES = 3;

export default class PinballScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PinballScene' });
  }

  init(data) {
    this.cfg           = data;
    this.levelGravity  = data.gravity          ?? 980;
    this.flippersAtBot = data.flippersAtBottom ?? true;
    this.levelKey      = data.levelKey         ?? 'level1';
    this.levelIndex    = data.levelIndex       ?? 0;
    this.totalScore    = data.totalScore       ?? 0;

    this.score          = 0;
    this.lives          = MAX_LIVES;
    this.targetsHit     = 0;
    this.totalTargets   = 0;
    this.ballInPlay     = false;
    this._levelOver     = false;
    this.levelStartTime = 0;

    // CONTINUOUS INPUT: plunger charge tracked via timestamp delta
    this.plungerCharging    = false;
    this.plungerChargeStart = 0;

    // Current interpolated angles (updated each frame in _updateFlippers)
    this._leftAngle  = 0;
    this._rightAngle = 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Set this level's gravity (positive = down, negative = up)
    this.physics.world.gravity.y = this.levelGravity;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d22);
    this._drawLaneLines(W, H);
    this._buildWalls(W, H);
    this._buildFlippers(W, H);
    this._buildBumpers(W, H);
    this._buildTargets(W, H);
    this._spawnBall(W, H);
    this._buildHUD(W, H);
    this._setupInput();

    this.levelStartTime = this.time.now;
  }

  update(time) {
    if (this._levelOver) return;

    // CONTINUOUS INPUT: read held keys every frame to move flippers
    this._updateFlippers();

    // CONTINUOUS INPUT: update plunger charge bar while Space is held
    if (this.plungerCharging && !this.ballInPlay) {
      const held = Math.min(time - this.plungerChargeStart, PLUNGER_MAX_HOLD);
      const pct  = held / PLUNGER_MAX_HOLD;
      this.chargeBar.setScale(1, pct); // bar grows from 0 to full height
      // Colour shifts cyan → orange as charge builds
      const r = Math.floor(pct * 255);
      const g = Math.floor(180 * (1 - pct * 0.5));
      const b = Math.floor(255 * (1 - pct));
      this.chargeBar.setFillStyle((r << 16) | (g << 8) | b);
    }

    if (this.ball && this.ballInPlay) {
      this._handleFlipperCollision(); // manual segment-vs-circle collision
      this._checkBallLost(this.scale.height);
    }

    this._updateHUD();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILDERS
  // ═══════════════════════════════════════════════════════════════════════════

  _drawLaneLines(W, H) {
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a2244, 0.5);
    for (let x = 60; x < W; x += 60) g.lineBetween(x, 0, x, H);
  }

  _buildWalls(W, H) {
    this.walls = this.physics.add.staticGroup();

    const wall = (x, y, w, h) => {
      const r = this.add.rectangle(x, y, w, h, 0x2a3a5a);
      this.physics.add.existing(r, true); // static body — never moves
      this.walls.add(r);
      return r;
    };

    wall(10,     H / 2, 20, H); // left wall
    wall(W - 10, H / 2, 20, H); // right wall
    wall(W / 2,  10,    W,  20); // top ceiling

    // Angled gutter walls funnel ball toward the flipper area
    if (this.flippersAtBot) {
      this._angledWall(W, H, 68,      H - 95, -40); // bottom-left gutter
      this._angledWall(W, H, W - 68,  H - 95,  40); // bottom-right gutter
    } else {
      this._angledWall(W, H, 68,      95,  40);
      this._angledWall(W, H, W - 68,  95, -40);
    }
  }

  _angledWall(W, H, x, y, angleDeg) {
    const r = this.add.rectangle(x, y, 85, 14, 0x3a4a6a);
    r.setAngle(angleDeg); // visual only — body AABB stays axis-aligned
    this.physics.add.existing(r, true);
    this.walls.add(r);
  }

  _buildFlippers(W, H) {
    const flipY = this.flippersAtBot ? H - 90 : 90;

    // ── CRITICAL: pivot positions must be near the walls, not W/2 ─────────────
    // Left pivot at x≈125, right pivot at x≈355 (for 480px canvas)
    // Tip gap ≈ 10px in the center — prevents ball from passing through too easily
    const leftPX  = 125;
    const rightPX = W - 125; // = 355

    // Left flipper: setOrigin(0, 0.5) → pivot is the LEFT end
    this.leftFlipper = this.add.rectangle(leftPX, flipY, FLIPPER_W, FLIPPER_H, 0x55aaff);
    this.leftFlipper.setOrigin(0, 0.5);

    // Right flipper: setOrigin(1, 0.5) → pivot is the RIGHT end
    this.rightFlipper = this.add.rectangle(rightPX, flipY, FLIPPER_W, FLIPPER_H, 0xff7755);
    this.rightFlipper.setOrigin(1, 0.5);

    // Register as static bodies; we manually sync them to visual position each frame
    // Arcade physics can't rotate bodies, so actual collision is handled manually
    this.physics.add.existing(this.leftFlipper,  true);
    this.physics.add.existing(this.rightFlipper, true);

    // Store pivot world coords — used for segment endpoint math
    this.leftPivotX  = leftPX;
    this.leftPivotY  = flipY;
    this.rightPivotX = rightPX;
    this.rightPivotY = flipY;

    // Rest = drooped outward, Active = raised inward
    // Left: positive angle droops tip downward (clockwise); negative raises it
    // Right: negative angle droops tip downward; positive raises it
    if (this.flippersAtBot) {
      this._leftRest   =  28;  this._leftActive   = -28;
      this._rightRest  = -28;  this._rightActive  =  28;
    } else {
      // Inverted gravity: flippers at top, so droop direction flips
      this._leftRest   = -28;  this._leftActive   =  28;
      this._rightRest  =  28;  this._rightActive  = -28;
    }

    this._leftAngle  = this._leftRest;
    this._rightAngle = this._rightRest;
    this.leftFlipper.setAngle(this._leftAngle);
    this.rightFlipper.setAngle(this._rightAngle);
  }

  _buildBumpers(W, H) {
    this.bumpers = [];

    let positions;
    if (this.levelKey === 'level1') {
      positions = [
        { x: W / 2,       y: 230 },
        { x: W / 2 - 105, y: 360 },
        { x: W / 2 + 85,  y: 360 },
        { x: W / 2,       y: 490 },
      ];
    } else if (this.levelKey === 'level2') {
      positions = [
        { x: 110,   y: 210 },
        { x: W - 130, y: 210 },
        { x: W / 2,   y: 310 },
        { x: 130,     y: 440 },
        { x: W - 145, y: 440 },
      ];
    } else {
      // level3 inverted: bumpers in lower half (ball descends from top flippers)
      positions = [
        { x: W / 2,       y: H - 230 },
        { x: W / 2 - 105, y: H - 360 },
        { x: W / 2 + 85,  y: H - 360 },
        { x: W / 2,       y: H - 490 },
      ];
    }

    positions.forEach(pos => {
      const circle = this.add.circle(pos.x, pos.y, BUMPER_RADIUS, 0xffcc00);
      this.add.circle(pos.x, pos.y, BUMPER_RADIUS - 8, 0xffffff, 0.4);
      this.physics.add.existing(circle, true);
      // Offset centres the circular physics body on the visual circle
      circle.body.setCircle(BUMPER_RADIUS, -BUMPER_RADIUS, -BUMPER_RADIUS);
      this.bumpers.push(circle);
    });
  }

  _buildTargets(W, H) {
    this.targets = this.physics.add.staticGroup();

    let positions;
    if (this.levelKey === 'level1') {
      positions = [
        { x: 110,     y: 180 },
        { x: W / 2,   y: 145 },
        { x: W - 110, y: 180 },
      ];
    } else if (this.levelKey === 'level2') {
      positions = [
        { x: 90,      y: 155 },
        { x: W / 2,   y: 115 },
        { x: W - 90,  y: 155 },
        { x: 155,     y: 265 },
        { x: W - 165, y: 265 },
      ];
    } else {
      positions = [
        { x: 110,     y: H - 165 },
        { x: W / 2,   y: H - 125 },
        { x: W - 110, y: H - 165 },
      ];
    }

    this.totalTargets = positions.length;

    positions.forEach(pos => {
      const t = this.add.rectangle(pos.x, pos.y, 36, 20, 0x00ff88);
      this.physics.add.existing(t, true);
      t.setData('hit', false);
      this.targets.add(t);
    });
  }

  _spawnBall(W, H) {
    // Ball spawns centered just above the flipper gap so launch goes into the field
    const ballX = W / 2;
    const ballY = this.flippersAtBot ? H - 120 : 120;

    this.ball = this.add.circle(ballX, ballY, BALL_RADIUS, 0xffffff);
    this.physics.add.existing(this.ball); // dynamic body

    const body = this.ball.body;
    body.setCircle(BALL_RADIUS, 0, 0);       // circular hitbox
    body.setBounce(0.6);                     // wall restitution
    body.setDrag(BALL_DRAG, BALL_DRAG);      // air resistance
    body.setMaxVelocity(800, 1200);          // cap to avoid tunnelling
    body.setCollideWorldBounds(false);       // we use explicit walls; bottom is open for life loss

    // Disable gravity so ball waits in plunger until launched
    body.setAllowGravity(false);
    body.setVelocity(0, 0);

    // Ball bounces off static walls and ceiling
    this.physics.add.collider(this.ball, this.walls);

    // Bumper overlap → apply outward impulse
    this.bumpers.forEach(b => {
      this.physics.add.overlap(this.ball, b, () => this._onBumperHit(b));
    });

    // Target overlap → register hit
    this.physics.add.overlap(this.ball, this.targets, (_b, target) => {
      this._onTargetHit(target);
    });

    this.ballInPlay = false;
  }

  _buildHUD(W, H) {
    const s = { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff' };

    this.scoreText   = this.add.text(12, 12, 'Score: 0',              s).setDepth(10);
    this.livesText   = this.add.text(12, 34, `Lives: ${this.lives}`,  s).setDepth(10);
    this.targetsText = this.add.text(12, 56, 'Targets: 0/0',          s).setDepth(10);

    const lbls = ['Level 1 – Terra Firma', 'Level 2 – Float Zone', 'Level 3 – Inverted Sky'];
    this.add.text(W - 12, 12, lbls[this.levelIndex] ?? this.levelKey, {
      ...s, fontSize: '13px', color: '#aaeeff',
    }).setOrigin(1, 0).setDepth(10);

    // Charge bar on right edge — visual feedback for plunger hold duration
    const barH = 180;
    const barX = W - 18;
    const barY = this.flippersAtBot ? H - 120 : 140; // near ball spawn

    this.add.rectangle(barX, barY - barH / 2, 12, barH + 4, 0x111133).setDepth(10);
    // Anchored at bottom (origin y=1) so it grows upward as charge increases
    this.chargeBar = this.add.rectangle(barX, barY, 8, barH, 0x00eeff)
      .setOrigin(0.5, 1)
      .setScale(1, 0)
      .setDepth(11);

    this.add.text(W / 2, barY + 14, 'HOLD SPACE to charge', {
      fontSize: '11px', color: '#7788aa', align: 'center',
    }).setOrigin(0.5, 0).setDepth(10);
  }

  _updateHUD() {
    this.scoreText.setText(`Score: ${this.score}`);
    this.livesText.setText(`Lives: ${this.lives}`);
    this.targetsText.setText(`Targets: ${this.targetsHit}/${this.totalTargets}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════════════════════

  _setupInput() {
    // Key objects — isDown read each frame for CONTINUOUS flipper movement
    this.leftKeys  = this.input.keyboard.addKeys({ a: 'A', left: 'LEFT' });
    this.rightKeys = this.input.keyboard.addKeys({ d: 'D', right: 'RIGHT' });

    // DISCRETE INPUT: keydown fires once → starts charge timer
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.ballInPlay && !this.plungerCharging) {
        this.plungerCharging    = true;
        this.plungerChargeStart = this.time.now; // record exact timestamp
      }
    });

    // DISCRETE INPUT: keyup fires once → release launches ball
    this.input.keyboard.on('keyup-SPACE', () => {
      if (this.plungerCharging) this._launchBall();
    });
  }

  // Called every frame; lerps each flipper's angle toward rest or active position
  _updateFlippers() {
    // CONTINUOUS INPUT: isDown is true for every frame the key remains pressed
    const leftHeld  = this.leftKeys.a.isDown  || this.leftKeys.left.isDown;
    const rightHeld = this.rightKeys.d.isDown || this.rightKeys.right.isDown;

    const lTarget = leftHeld  ? this._leftActive  : this._leftRest;
    const rTarget = rightHeld ? this._rightActive : this._rightRest;

    // Linear interpolation → smooth motion without snapping
    this._leftAngle  = Phaser.Math.Linear(this._leftAngle,  lTarget, FLIPPER_LERP);
    this._rightAngle = Phaser.Math.Linear(this._rightAngle, rTarget, FLIPPER_LERP);

    this.leftFlipper.setAngle(this._leftAngle);
    this.rightFlipper.setAngle(this._rightAngle);

    // Sync static physics body position so Arcade's broad-phase stays correct
    // (Arcade bodies are always axis-aligned; actual collision is handled manually below)
    this.leftFlipper.body.reset(this.leftFlipper.x, this.leftFlipper.y);
    this.rightFlipper.body.reset(this.rightFlipper.x, this.rightFlipper.y);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Segment-vs-circle collision for each flipper.
  // We compute the actual rotated endpoints from pivot + current angle,
  // then find the closest point on the segment to the ball centre.
  _handleFlipperCollision() {
    const toRad = Phaser.Math.DegToRad.bind(Phaser.Math);

    // ── Left flipper segment endpoints ────────────────────────────────────────
    // Origin is at the LEFT end; tip is at angle θ going RIGHT
    const la    = toRad(this._leftAngle);
    const lTipX = this.leftPivotX + Math.cos(la) * FLIPPER_W;
    const lTipY = this.leftPivotY + Math.sin(la) * FLIPPER_W;

    // ── Right flipper segment endpoints ───────────────────────────────────────
    // Origin is at the RIGHT end; tip is at angle θ going LEFT (negate X component)
    const ra    = toRad(this._rightAngle);
    const rTipX = this.rightPivotX - Math.cos(ra) * FLIPPER_W;
    const rTipY = this.rightPivotY - Math.sin(ra) * FLIPPER_W;

    const segs = [
      { ax: this.leftPivotX,  ay: this.leftPivotY,  bx: lTipX, by: lTipY, isLeft: true  },
      { ax: this.rightPivotX, ay: this.rightPivotY, bx: rTipX, by: rTipY, isLeft: false },
    ];

    segs.forEach(({ ax, ay, bx, by, isLeft }) => {
      // Project ball centre onto the segment to find closest point
      const segDx = bx - ax, segDy = by - ay;
      const len2  = segDx * segDx + segDy * segDy;
      if (len2 === 0) return;

      // t = 0 at pivot, t = 1 at tip
      let t = ((this.ball.x - ax) * segDx + (this.ball.y - ay) * segDy) / len2;
      t = Phaser.Math.Clamp(t, 0, 1);

      const closestX = ax + t * segDx;
      const closestY = ay + t * segDy;

      // Distance from ball centre to closest point on flipper surface
      const dx    = this.ball.x - closestX;
      const dy    = this.ball.y - closestY;
      const dist2 = dx * dx + dy * dy;
      const minD  = BALL_RADIUS + FLIPPER_H / 2; // collision threshold

      if (dist2 > minD * minD) return; // no collision

      const dist = Math.sqrt(dist2) || 1;
      const nx   = dx / dist; // outward normal from flipper surface
      const ny   = dy / dist;

      // Separate ball from flipper so it doesn't embed
      const overlap = minD - dist;
      this.ball.x += nx * (overlap + 1);
      this.ball.y += ny * (overlap + 1);

      // Reflect velocity along the surface normal (like a wall bounce)
      const vx  = this.ball.body.velocity.x;
      const vy  = this.ball.body.velocity.y;
      const dot = vx * nx + vy * ny;
      if (dot < 0) { // only respond if ball is moving INTO the flipper
        this.ball.body.velocity.x = vx - (1 + BALL_BOUNCE) * dot * nx;
        this.ball.body.velocity.y = vy - (1 + BALL_BOUNCE) * dot * ny;
      }

      // Extra launch boost when the flipper is actively swinging
      const isHeld = isLeft
        ? (this.leftKeys.a.isDown  || this.leftKeys.left.isDown)
        : (this.rightKeys.d.isDown || this.rightKeys.right.isDown);

      if (isHeld) {
        // Tip moves faster than pivot → boost scales with t (distance from pivot)
        const boost = 280 * t;
        this.ball.body.velocity.x += nx * boost;
        // Drive ball upward (against gravity direction) for a satisfying launch
        this.ball.body.velocity.y += ny * boost + (this.flippersAtBot ? -180 : 180);
      }
    });
  }

  _launchBall() {
    // CONTINUOUS INPUT: hold duration determines launch velocity
    const held  = Math.min(this.time.now - this.plungerChargeStart, PLUNGER_MAX_HOLD);
    const pct   = held / PLUNGER_MAX_HOLD;
    const speed = PLUNGER_MIN_VEL + pct * (PLUNGER_MAX_VEL - PLUNGER_MIN_VEL);

    // Re-enable gravity now that the ball is in play
    this.ball.body.setAllowGravity(true);
    // Launch against gravity direction
    this.ball.body.setVelocity(0, this.flippersAtBot ? -speed : speed);

    this.ballInPlay      = true;
    this.plungerCharging = false;
    this.chargeBar.setScale(1, 0); // reset bar to empty
  }

  _onBumperHit(bumper) {
    const dx   = this.ball.x - bumper.x;
    const dy   = this.ball.y - bumper.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    // Override velocity with fixed outward impulse (prevents runaway speed accumulation)
    this.ball.body.velocity.x = (dx / dist) * BUMPER_IMPULSE;
    this.ball.body.velocity.y = (dy / dist) * BUMPER_IMPULSE;

    this.score += 10;
    bumper.setFillStyle(0xffffff);
    this.time.delayedCall(80, () => bumper.setFillStyle(0xffcc00));
  }

  _onTargetHit(target) {
    if (target.getData('hit')) return;

    target.setData('hit', true);
    target.setFillStyle(0x113311);
    this.targetsHit++;
    this.score += 100;
    this.tweens.add({ targets: target, alpha: 0.35, duration: 250 });

    if (this.targetsHit >= this.totalTargets) this._levelWin();
  }

  _checkBallLost(H) {
    // Ball exits through the open bottom (or top for inverted) → lose a life
    const lost = this.flippersAtBot ? this.ball.y > H + 30 : this.ball.y < -30;
    if (!lost) return;

    this.lives--;
    this._updateHUD();

    if (this.lives <= 0) {
      this._gameOver();
    } else {
      this.ball.destroy();
      this._spawnBall(this.scale.width, H);
    }
  }

  _levelWin() {
    if (this._levelOver) return;
    this._levelOver = true;
    const elapsed = Math.floor((this.time.now - this.levelStartTime) / 1000);
    const { width: W, height: H } = this.scale;

    this.add.text(W / 2, H / 2, 'LEVEL CLEAR!', {
      fontSize: '48px', fontFamily: 'Arial Black', color: '#00ff88',
      stroke: '#003322', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20);

    this.time.delayedCall(1300, () => {
      this.scene.start('SummaryScene', {
        score:          this.score,
        accuracy:       this.totalTargets > 0 ? this.targetsHit / this.totalTargets : 0,
        targetsHit:     this.targetsHit,
        totalTargets:   this.totalTargets,
        timeSec:        elapsed,
        levelKey:       this.levelKey,
        levelIndex:     this.levelIndex,
        totalScore:     this.totalScore + this.score,
        nextLevelIndex: this.levelIndex + 1,
      });
    });
  }

  _gameOver() {
    if (this._levelOver) return;
    this._levelOver = true;
    this.time.delayedCall(600, () => {
      this.scene.start('GameOverScene', {
        totalScore: this.totalScore + this.score,
        levelIndex: this.levelIndex,
        complete: false,
      });
    });
  }
}
