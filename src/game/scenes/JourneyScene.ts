import Phaser from 'phaser';
import { route } from '../config/route';
import { themeAssets } from '../config/assets';
import { BIKE_CONFIG, BIKE_DRIVE_SEQUENCE, BIKE_IDLE_FRAME } from '../config/bike';
import type { BikeFrame } from '../config/bike';
import { WORLD_VISUALS, THEME_GRADE } from '../config/worldVisuals';
import { CELESTIAL_CONFIG, CELESTIAL_ASSETS, CELESTIAL_DRIFT } from '../config/celestial';
import { getCurrentTheme, formatLocalTime } from '../config/timeTheme';
import type { TimeTheme } from '../config/timeTheme';
import { landmarkDialogues } from '../config/dialogues';
import { DialogueBubble } from '../ui/dialogueBubble';

const LANDMARK_PROMPT_RADIUS = 520; // world units around a landmark center
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const CITY_REPEAT = 2; // full city images shown before AND after every landmark

/**
 * One real sprite segment on the visual track. NOT a TileSprite, NO overlay, NO
 * blend/mask/crossfade. The track is a plain fixed sequence of full-screen images
 * laid end-to-end: [city ×4][landmark][city ×4][landmark]... Every segment is a
 * single 1280×720 sprite at origin(0,0), y=0, alpha 1 — every asset shares the
 * same top edge and baseline, so the world reads as a strip of photos.
 */
interface VisualSeg {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  kind: 'city' | 'landmark';
  landmarkId?: string;
  leftWorld: number;   // absolute world X of this segment's LEFT edge
  width: number;       // visual world width (always VIEWPORT_WIDTH)
  label: string;
}

export class JourneyScene extends Phaser.Scene {
  // Continuous world state (units = world px at base 1280 canvas)
  private worldDistance = 0;
  private currentSpeed = 0;       // px/sec, signed
  private targetSpeed = 0;        // px/sec, signed
  private readonly maxForward = 460;
  private readonly maxReverse = -260;   // reverse slower than forward
  private readonly accel = 1100;        // px/sec^2 toward target
  private readonly brake = 900;         // px/sec^2 toward 0 when no input

  private currentTheme: TimeTheme = 'day';

  // Visual track (real sprites, NO TileSprite)
  private segs: VisualSeg[] = [];
  private trackWidth = 0;   // total world width of the fixed sequence (for clamp)
  // Landmark interaction points, derived from the visual track (center world X).
  private landmarks: { id: string; label: string; centerWorld: number }[] = [];

  // Ending (goa) flow: playing -> approach -> ending -> ended
  // playing : normal scroll until the goa fills the screen (world clamp at goa).
  // approach: world FROZEN (photo stays); player drives the bike forward into the
  //           goa mouth. At the mouth, the "masuk goa" prompt appears.
  // ending  : player pressed E at the mouth -> fade to black + audio fade.
  // ended   : everything frozen.
  private journeyState: 'playing' | 'approach' | 'ending' | 'ended' = 'playing';
  private goaCenterWorld = 0;     // world X at the goa segment center (world stops here)
  private bikeScreenX = 0;        // live bike screen X (shifts right during approach)
  private goaMouthScreenX = 0;    // approach target: bike screen X at the goa mouth
  private atGoaMouth = false;     // true once bike has reached the mouth (prompt shown)
  private endingElapsed = 0;      // ms since ending began (fade timer)
  private readonly endingFadeMs = 1100;   // black overlay ramp 0 -> 1
  private readonly endingMoveMs = 1600;   // total ms for ending sequence (fade + settle)
  private fadeRect!: Phaser.GameObjects.Rectangle;
  private endText?: Phaser.GameObjects.Text;
  private gradeRect!: Phaser.GameObjects.Rectangle;
  private celestial!: Phaser.GameObjects.Image;
  private celestialBaseX = 0;
  private debugGfx?: Phaser.GameObjects.Graphics;
  private debugTexts: Phaser.GameObjects.Text[] = [];

  // Bike (container stays fixed; child image offset per frame)
  private bikeContainer!: Phaser.GameObjects.Container;
  private bikeImage!: Phaser.GameObjects.Image;
  private animIndex = 0;
  private animAccum = 0;
  private isDriving = false;

  // HUD / prompt tracking
  private activeLabel = '';
  private nearLandmarkId: string | null = null;

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private isMovingForward = false;
  private isMovingBackward = false;

  // Gameplay gate: world stays frozen until the start screen dispatches game-start
  private started = false;

  // Dialogue bubble properties
  private dialogueBubble!: DialogueBubble;
  private isDialogueActive = false;
  private keySpace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'JourneyScene' });
  }

  preload(): void {
    this.currentTheme = getCurrentTheme();

    // City backgrounds (all themes)
    this.load.image('city_day', themeAssets.day.city);
    this.load.image('city_sunset', themeAssets.sunset.city);
    this.load.image('city_night', themeAssets.night.city);

    // Landmark images (all themes)
    const themes: TimeTheme[] = ['day', 'sunset', 'night'];
    themes.forEach(t => {
      const landmarks = themeAssets[t].landmarks;
      Object.keys(landmarks).forEach(id => {
        this.load.image(`landmark_${id}_${t}`, landmarks[id]);
      });
    });

    // Bike frames: load only the non-blank ones we actually render
    const used = new Map<string, string>();
    used.set(BIKE_IDLE_FRAME.key, BIKE_IDLE_FRAME.file);
    BIKE_DRIVE_SEQUENCE.forEach(f => used.set(f.key, f.file));
    used.forEach((file, key) => this.load.image(key, file));

    // Celestial assets (sun/moon); key === path
    this.load.image(CELESTIAL_ASSETS.sun, CELESTIAL_ASSETS.sun);
    this.load.image(CELESTIAL_ASSETS.moon, CELESTIAL_ASSETS.moon);

    // Goa ending segment. Audited: only ONE goa asset exists (night theme).
    // Filename has a capital G. Reused across all themes since no day/sunset variant.
    this.load.image('goa', 'assets/backgrounds/night/Goa_night.png');
  }

  create(): void {
    const height = this.scale.height;

    // A. Build the real sprite track from the route (NO TileSprite, depth 0).
    this.buildVisualTrack(this.currentTheme);

    // B. Celestial layer (sun/moon): fixed to viewport, ABOVE world segments.
    this.celestial = this.add.image(0, 0, CELESTIAL_ASSETS.sun)
      .setOrigin(0.5, 0.5).setDepth(2).setScrollFactor(0).setVisible(false);
    this.celestialBaseX = 0;
    this.applyCelestial(this.currentTheme);

    // C. Thin per-theme color grade overlay (above world, below bike)
    const grade = THEME_GRADE[this.currentTheme];
    this.gradeRect = this.add.rectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, grade.color, grade.alpha)
      .setOrigin(0, 0).setDepth(5).setScrollFactor(0);

    // D. Bike: fixed container, child image offset per frame so wheels stay locked
    const bx = VIEWPORT_WIDTH * BIKE_CONFIG.screenXRatio;
    const by = height * BIKE_CONFIG.roadBaselineRatio + BIKE_CONFIG.verticalOffsetY;
    this.bikeContainer = this.add.container(bx, by).setDepth(10);
    this.bikeImage = this.add.image(0, 0, BIKE_IDLE_FRAME.key);
    this.bikeImage.setOrigin(0.5, 1);
    this.bikeImage.setScale(BIKE_CONFIG.displayWidth / BIKE_CONFIG.frameWidth);
    this.bikeContainer.add(this.bikeImage);
    this.applyBikeFrame(BIKE_IDLE_FRAME);

    // D2. Ending fade-to-black overlay (topmost canvas layer; starts transparent).
    // fillAlpha=1 so setAlpha() on the object actually drives opacity; begin at 0.
    this.fadeRect = this.add.rectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, 0x000000, 1)
      .setOrigin(0, 0).setDepth(100).setScrollFactor(0).setAlpha(0);
    this.endText = this.add.text(VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2, 'HAPPY 6TH MONTHVERSARY', {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101).setScrollFactor(0).setAlpha(0);

    // E. Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Initialize dialogue bubble DOM overlay and closed-event listener
    this.dialogueBubble = new DialogueBubble();
    window.addEventListener('dialogue-closed', () => {
      if (this.atGoaMouth) {
        this.beginEnding();
      } else {
        this.isDialogueActive = false;
        this.nearLandmarkId = null;
        this.activeLabel = '';
        this.updateTracking();
      }
    });

    // F. HUD comms
    window.addEventListener('hud-move-forward-start', () => { this.isMovingForward = true; });
    window.addEventListener('hud-move-forward-end', () => { this.isMovingForward = false; });
    window.addEventListener('hud-move-backward-start', () => { this.isMovingBackward = true; });
    window.addEventListener('hud-move-backward-end', () => { this.isMovingBackward = false; });
    window.addEventListener('hud-trigger-interaction', () => { this.triggerInteraction(); });
    window.addEventListener('game-start', () => { this.started = true; });
    // Cover the race where game-start fired during async preload, before this listener existed.
    if ((window as any).__journeyStarted) this.started = true;

    this.dispatchTimeUpdate();
    this.dispatchJourneyUpdate();
  }

  /**
   * Build the fixed visual sequence: CITY ×4 → LANDMARK → CITY ×4 → LANDMARK ...
   * → CITY ×4. Every segment is one full 1280×720 sprite laid end-to-end
   * (next.leftWorld = prev.leftWorld + prev.width). No tiling, no crop, no
   * overlay, no blend. Landmark order follows the route; city repeats wrap each.
   */
  private buildVisualTrack(theme: TimeTheme): void {
    const landmarkRoute = route.filter(r => r.enabled && r.kind === 'landmark' && r.id);
    let x = 0;
    let cityCount = 0;

    const addCity = () => {
      const spr = this.add.sprite(0, 0, `city_${theme}`)
        .setOrigin(0, 0).setDepth(0).setScrollFactor(0).setVisible(false);
      spr.setDisplaySize(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
      spr.y = 0;
      this.segs.push({ id: `city-${++cityCount}`, sprite: spr, kind: 'city', leftWorld: x, width: VIEWPORT_WIDTH, label: 'Kota Jakarta' });
      x += VIEWPORT_WIDTH;
    };

    const addLandmark = (id: string, label: string) => {
      const spr = this.add.sprite(0, 0, `landmark_${id}_${theme}`)
        .setOrigin(0, 0).setDepth(0).setScrollFactor(0).setVisible(false);
      spr.setDisplaySize(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
      spr.y = 0;
      this.segs.push({ id, sprite: spr, kind: 'landmark', landmarkId: id, leftWorld: x, width: VIEWPORT_WIDTH, label });
      this.landmarks.push({ id, label, centerWorld: x + VIEWPORT_WIDTH / 2 });
      x += VIEWPORT_WIDTH;
    };

    // city ×4 before the first landmark, then [landmark, city ×4] per landmark.
    for (let i = 0; i < CITY_REPEAT; i++) addCity();
    for (const lm of landmarkRoute) {
      addLandmark(lm.id!, lm.locationLabel);
      for (let i = 0; i < CITY_REPEAT; i++) addCity();
    }

    // Goa ending segment: the final full image at the very end of the track.
    // Single asset reused for every theme (only Goa_night.png exists).
    const goaSpr = this.add.sprite(0, 0, 'goa')
      .setOrigin(0, 0).setDepth(0).setScrollFactor(0).setVisible(false);
    goaSpr.setDisplaySize(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    goaSpr.y = 0;
    this.segs.push({ id: 'goa', sprite: goaSpr, kind: 'landmark', landmarkId: 'goa', leftWorld: x, width: VIEWPORT_WIDTH, label: 'Goa' });
    this.goaCenterWorld = x + VIEWPORT_WIDTH / 2;
    x += VIEWPORT_WIDTH;

    this.trackWidth = x;
  }

  /** Show the single sun/moon for a theme, fixed to the viewport. */
  private applyCelestial(theme: TimeTheme): void {
    const cfg = CELESTIAL_CONFIG[theme];
    const width = this.scale.width;
    const height = this.scale.height;
    if (!cfg.enabled) {
      this.celestial.setVisible(false); // background already has a baked-in body
      return;
    }
    this.celestial.setTexture(CELESTIAL_ASSETS[cfg.assetKey]);
    this.celestialBaseX = width * cfg.xRatio;
    this.celestial.setPosition(this.celestialBaseX, height * cfg.yRatio);
    this.celestial.setVisible(true);
  }

  private applyBikeFrame(frame: BikeFrame): void {
    this.bikeImage.setTexture(frame.key);
    this.bikeImage.setPosition(frame.offsetX, frame.offsetY);
  }

  update(_time: number, delta: number): void {
    // Dev/Test Warp query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const warpDistance = urlParams.get('warp');
    if (warpDistance) {
      if (warpDistance === 'goa') {
        this.worldDistance = this.goaCenterWorld;
      } else if (warpDistance === 'goa-approach') {
        this.worldDistance = this.goaCenterWorld - 50;
      } else if (warpDistance === 'goa-mouth') {
        this.worldDistance = this.goaCenterWorld;
        this.journeyState = 'approach';
        this.bikeScreenX = VIEWPORT_WIDTH * 0.78;
        this.bikeContainer.x = this.bikeScreenX;
        this.atGoaMouth = true;
      } else {
        this.worldDistance = parseFloat(warpDistance);
      }
      // Remove parameter from URL so we don't loop/constantly warp
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    const dt = Math.min(delta, 50) / 1000; // clamp to avoid spikes on tab refocus
    const height = this.scale.height;

    // 1. Theme sync (swap textures in place, never reset world)
    const activeTheme = getCurrentTheme();
    if (activeTheme !== this.currentTheme) {
      this.currentTheme = activeTheme;
      for (const seg of this.segs) {
        if (seg.kind === 'landmark') {
          seg.sprite.setTexture(`landmark_${seg.landmarkId}_${activeTheme}`);
        } else {
          seg.sprite.setTexture(`city_${activeTheme}`);
        }
        seg.sprite.setDisplaySize(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
        seg.sprite.y = 0;
      }
      const grade = THEME_GRADE[activeTheme];
      this.gradeRect.setFillStyle(grade.color, grade.alpha);
      this.applyCelestial(activeTheme); // single sun/moon swap; never two at once
      this.dispatchTimeUpdate();
    }

    // 1b. Goa flow. Once ended, world + bike are frozen.
    if (this.journeyState === 'ended') return;
    // playing -> approach: the world has scrolled all the way to the goa and
    // clamped at its center, so the goa now fills the screen. Freeze the world;
    // the player drives the bike sprite itself forward into the goa mouth.
    if (this.journeyState === 'playing' && this.worldDistance >= this.goaCenterWorld - 0.5) {
      this.journeyState = 'approach';
      this.currentSpeed = 0;
      this.targetSpeed = 0;
      // Initialize approach positions: bike starts at its normal screen X,
      // goa mouth is near the right side of the viewport.
      this.bikeScreenX = VIEWPORT_WIDTH * BIKE_CONFIG.screenXRatio;
      this.bikeContainer.x = this.bikeScreenX;
      this.goaMouthScreenX = VIEWPORT_WIDTH * 0.78;
    }

    // 2. Read movement input (active while playing OR approaching the goa).
    let fwd = false;
    let back = false;
    if (this.started && !this.isDialogueActive && (this.journeyState === 'playing' || this.journeyState === 'approach')) {
      fwd = this.isMovingForward;
      back = this.isMovingBackward;
      if (this.cursors) {
        fwd = fwd || this.cursors.right.isDown || this.keyD.isDown;
        back = back || this.cursors.left.isDown || this.keyA.isDown;
      }
    }

    // 2b. Dialogue / Approach / Normal play: input -> target speed.
    if (this.isDialogueActive) {
      this.targetSpeed = 0;
      this.currentSpeed = 0;
    } else if (this.journeyState === 'approach') {
      if (fwd && !this.atGoaMouth) {
        this.targetSpeed = this.maxForward;
      } else {
        this.targetSpeed = 0;
      }
    } else {
      // 2c. Normal play: input -> target speed.
      if (fwd && !back) this.targetSpeed = this.maxForward;
      else if (back && !fwd) this.targetSpeed = this.maxReverse;
      else this.targetSpeed = 0;
    }

    // 3. Smooth accel/decel toward target (dt-based)
    const rate = this.targetSpeed === 0 ? this.brake : this.accel;
    if (this.currentSpeed < this.targetSpeed) {
      this.currentSpeed = Math.min(this.currentSpeed + rate * dt, this.targetSpeed);
    } else if (this.currentSpeed > this.targetSpeed) {
      this.currentSpeed = Math.max(this.currentSpeed - rate * dt, this.targetSpeed);
    }

    // 3b. Move bike on screen during approach.
    if (this.journeyState === 'approach') {
      if (this.currentSpeed > 0 && !this.atGoaMouth) {
        this.bikeScreenX = Math.min(this.bikeScreenX + this.currentSpeed * dt, this.goaMouthScreenX);
        this.bikeContainer.x = this.bikeScreenX;
        if (this.bikeScreenX >= this.goaMouthScreenX - 0.5) this.reachGoaMouth();
      }
    }

    // 4. Advance continuous world position, clamped so the strip always fills the
    // viewport (no black space). Bike sits at screenX = 640, so the world point
    // under the bike must stay within [640, trackWidth - 640].
    // SKIP during approach: world is frozen, currentSpeed is updated dynamically
    // only to drive the 6-frame bike animation and screen movement. Advancing worldDistance here
    // would trigger the clamp and reset currentSpeed to 0 (killing the animation).
    if (this.journeyState !== 'approach') {
      this.worldDistance += this.currentSpeed * dt;
      const minWD = VIEWPORT_WIDTH * BIKE_CONFIG.screenXRatio;
      const maxWD = this.trackWidth - (VIEWPORT_WIDTH - VIEWPORT_WIDTH * BIKE_CONFIG.screenXRatio);
      if (this.worldDistance < minWD) { this.worldDistance = minWD; this.currentSpeed = 0; }
      else if (this.worldDistance > maxWD) { this.worldDistance = maxWD; this.currentSpeed = 0; }
    }

    // 5. Position every visual segment by its LEFT edge (edge-based, not center).
    // worldOriginScreenX = bike screen X: the world point under the bike == worldDistance.
    const worldOriginScreenX = VIEWPORT_WIDTH * BIKE_CONFIG.screenXRatio;
    for (const seg of this.segs) {
      const screenLeft = seg.leftWorld - this.worldDistance + worldOriginScreenX;
      const screenRight = screenLeft + seg.width;
      seg.sprite.x = screenLeft;
      // Visible while ANY part touches the viewport; only hidden once fully past the left.
      seg.sprite.setVisible(screenRight > 0 && screenLeft < VIEWPORT_WIDTH);
    }

    if (WORLD_VISUALS.debugLandmarkBounds) this.drawDebug(height);

    // 5b. Celestial stays fixed to viewport; optional tiny idle drift only.
    if (CELESTIAL_DRIFT.enabled && this.celestial.visible) {
      const sway = Math.sin((_time / CELESTIAL_DRIFT.periodMs) * Math.PI * 2) * CELESTIAL_DRIFT.amplitudePx;
      this.celestial.x = this.celestialBaseX + sway;
    }

    // 6. Animate bike (manual frame stepping; container never moves)
    this.updateBikeAnimation(delta);

    // 6b. Drive the ending fade + state transition once ending has begun.
    if (this.journeyState === 'ending') this.tickEnding(delta);

    // 7. HUD label + landmark proximity
    this.updateTracking();

    // 8. Keyboard interaction
    const isE = Phaser.Input.Keyboard.JustDown(this.keyE);
    const isEnter = Phaser.Input.Keyboard.JustDown(this.keyEnter);
    const isSpace = this.keySpace && Phaser.Input.Keyboard.JustDown(this.keySpace);

    if (this.cursors && (isE || isEnter || isSpace)) {
      this.triggerInteraction();
    }
  }

  /** Debug: y=0 line, road baseline, active segment name, screenLeft/right per visible seg. */
  private drawDebug(height: number): void {
    if (!this.debugGfx) this.debugGfx = this.add.graphics().setDepth(50).setScrollFactor(0);
    const g = this.debugGfx;
    g.clear();
    this.debugTexts.forEach(t => t.destroy());
    this.debugTexts = [];

    // y=0 (cyan) and road baseline (magenta) reference lines
    const baselineY = height * BIKE_CONFIG.roadBaselineRatio;
    g.lineStyle(2, 0x00ffff, 0.9).beginPath();
    g.moveTo(0, 1); g.lineTo(VIEWPORT_WIDTH, 1); g.strokePath();
    g.lineStyle(2, 0xff00ff, 0.9).beginPath();
    g.moveTo(0, baselineY); g.lineTo(VIEWPORT_WIDTH, baselineY); g.strokePath();

    for (const seg of this.segs) {
      if (!seg.sprite.visible) continue;
      const sl = seg.sprite.x;
      const sr = sl + seg.width;
      const col = seg.kind === 'landmark' ? 0xffcc00 : 0x66ff66;
      g.lineStyle(3, col, 1).beginPath();
      g.moveTo(sl, 0); g.lineTo(sl, height); g.strokePath();
      g.moveTo(sr, 0); g.lineTo(sr, height); g.strokePath();
      const tx = Phaser.Math.Clamp(sl + 6, 4, VIEWPORT_WIDTH - 260);
      this.debugTexts.push(
        this.add.text(tx, 64, `${seg.kind === 'landmark' ? seg.landmarkId : 'city'}  L:${Math.round(sl)} R:${Math.round(sr)}`,
          { fontFamily: 'monospace', fontSize: '15px', color: '#fff', backgroundColor: '#000000aa' })
          .setDepth(51).setScrollFactor(0)
      );
    }
  }

  private updateBikeAnimation(delta: number): void {
    const moving = Math.abs(this.currentSpeed) > BIKE_CONFIG.moveThreshold;
    if (moving) {
      this.isDriving = true;
      const speedScale = Phaser.Math.Clamp(Math.abs(this.currentSpeed) / this.maxForward, 0.5, 1.6);
      const frameDur = (1000 / BIKE_CONFIG.animationFps) / speedScale;
      this.animAccum += delta;
      let guard = 0;
      while (this.animAccum >= frameDur && guard++ < 8) {
        this.animAccum -= frameDur;
        this.animIndex = (this.animIndex + 1) % BIKE_DRIVE_SEQUENCE.length;
        this.applyBikeFrame(BIKE_DRIVE_SEQUENCE[this.animIndex]);
      }
    } else if (this.isDriving) {
      this.isDriving = false;
      this.animIndex = 0;
      this.animAccum = 0;
      this.applyBikeFrame(BIKE_IDLE_FRAME);
    }
  }

  /** Determine current segment label + whether bike is within a landmark radius. */
  private updateTracking(): void {
    // Label = segment currently under the bike (worldDistance). Landmark wins.
    let label = 'Kota Jakarta';
    for (const seg of this.segs) {
      if (this.worldDistance >= seg.leftWorld && this.worldDistance < seg.leftWorld + seg.width) {
        label = seg.label;
        if (seg.kind === 'landmark') break;
      }
    }

    let near: string | null = null;
    let nearName = '';
    for (const lm of this.landmarks) {
      if (Math.abs(this.worldDistance - lm.centerWorld) < LANDMARK_PROMPT_RADIUS) {
        near = lm.id;
        nearName = lm.label;
        break;
      }
    }

    if (label !== this.activeLabel || near !== this.nearLandmarkId) {
      this.activeLabel = label;
      this.nearLandmarkId = near;
      window.dispatchEvent(new CustomEvent('journey-update', {
        detail: {
          location: label,
          nearLandmark: near !== null,
          activeLandmarkId: near || '',
          activeLandmarkName: nearName,
        },
      }));
    }
  }

  private triggerInteraction(): void {
    if (this.isDialogueActive) {
      this.dialogueBubble.hide();
      return;
    }

    if (this.atGoaMouth) {
      const dialogue = landmarkDialogues['goa'];
      if (dialogue) {
        this.isDialogueActive = true;
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        window.dispatchEvent(new CustomEvent('journey-update', {
          detail: { location: 'Goa', nearLandmark: false, activeLandmarkId: '', activeLandmarkName: '' },
        }));
        this.dialogueBubble.show(dialogue);
      } else {
        this.beginEnding();
      }
      return;
    }

    if (this.nearLandmarkId) {
      const dialogue = landmarkDialogues[this.nearLandmarkId];
      if (dialogue) {
        this.isDialogueActive = true;
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        const lm = this.landmarks.find(l => l.id === this.nearLandmarkId);
        window.dispatchEvent(new CustomEvent('journey-update', {
          detail: {
            location: lm ? lm.label : this.nearLandmarkId,
            nearLandmark: false,
            activeLandmarkId: '',
            activeLandmarkName: '',
          },
        }));
        this.dialogueBubble.show(dialogue);
      } else {
        const lm = this.landmarks.find(l => l.id === this.nearLandmarkId);
        window.dispatchEvent(new CustomEvent('hud-show-toast', {
          detail: { message: `Tiba di ${lm ? lm.label : this.nearLandmarkId}` },
        }));
      }
    }
  }

  /** Bike has reached the goa mouth: show prompt, then E/Enter triggers the ending. */
  private reachGoaMouth(): void {
    this.atGoaMouth = true;
    window.dispatchEvent(new CustomEvent('journey-update', {
      detail: { location: 'Goa', nearLandmark: true, activeLandmarkId: 'goa', activeLandmarkName: 'Goa' },
    }));
  }

  /** Enter the ending: lock input, hide prompt, fade audio, start auto-roll + fade. */
  private beginEnding(): void {
    this.journeyState = 'ending';
    this.endingElapsed = 0;
    this.isMovingForward = false;
    this.isMovingBackward = false;
    this.isDialogueActive = false;
    // Hide the interaction prompt during the ending.
    this.nearLandmarkId = null;
    window.dispatchEvent(new CustomEvent('journey-update', {
      detail: { location: 'Goa', nearLandmark: false, activeLandmarkId: '', activeLandmarkName: '' },
    }));
    // Ask the audio system to fade out gently (main.ts owns the BgmManager).
    window.dispatchEvent(new CustomEvent('journey-ending'));
  }

  /** Ramp the black overlay to full, then settle into the ended state. */
  private tickEnding(delta: number): void {
    this.endingElapsed += delta;
    const tFade = Phaser.Math.Clamp(this.endingElapsed / this.endingFadeMs, 0, 1);
    this.fadeRect.setAlpha(tFade);
    if (this.endText) {
      // Text fades in over the final third of the fade.
      this.endText.setAlpha(Phaser.Math.Clamp((tFade - 0.66) / 0.34, 0, 1));
    }
    if (tFade >= 1 && this.endingElapsed >= this.endingMoveMs) {
      this.journeyState = 'ended';
      this.currentSpeed = 0;
      this.targetSpeed = 0;
    }
  }

  private dispatchJourneyUpdate(): void {
    window.dispatchEvent(new CustomEvent('journey-update', {
      detail: { location: 'Kota Jakarta', nearLandmark: false, activeLandmarkId: '', activeLandmarkName: '' },
    }));
  }

  private dispatchTimeUpdate(): void {
    window.dispatchEvent(new CustomEvent('time-theme-update', {
      detail: { timeStr: formatLocalTime(), theme: this.currentTheme },
    }));
  }
}
