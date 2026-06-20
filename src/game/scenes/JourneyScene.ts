import Phaser from 'phaser';
import { route, segmentCenter } from '../config/route';
import { themeAssets } from '../config/assets';
import { BIKE_CONFIG, BIKE_DRIVE_SEQUENCE, BIKE_IDLE_FRAME } from '../config/bike';
import type { BikeFrame } from '../config/bike';
import { WORLD_VISUALS, THEME_GRADE } from '../config/worldVisuals';
import { getCurrentTheme, formatLocalTime } from '../config/timeTheme';
import type { TimeTheme } from '../config/timeTheme';

const LANDMARK_PROMPT_RADIUS = 520; // world units around a landmark center
const LM_MASK_KEY = 'lm_edge_mask';

interface LandmarkView {
  id: string;
  spr: Phaser.GameObjects.Sprite;
  mask: Phaser.GameObjects.Image; // gradient edge mask source (not on display list)
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

  // Visuals
  private cityBg!: Phaser.GameObjects.TileSprite;
  private cityFitX = 1;
  private landmarks: LandmarkView[] = [];
  private gradeRect!: Phaser.GameObjects.Rectangle;

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

  constructor() {
    super({ key: 'JourneyScene' });
  }

  preload(): void {
    this.currentTheme = getCurrentTheme();

    // City loop backgrounds (all themes)
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
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // A. City loop background: fills canvas height, tiles horizontally only
    this.cityBg = this.add.tileSprite(0, 0, width, height, `city_${this.currentTheme}`);
    this.cityBg.setOrigin(0, 0).setDepth(0);
    const citySrc = this.textures.get(`city_${this.currentTheme}`).getSourceImage();
    this.cityFitX = height / citySrc.height;
    this.cityBg.setTileScale(this.cityFitX, this.cityFitX);

    // Build the horizontal edge-blend gradient mask texture once
    this.buildEdgeMaskTexture(width, height);

    // B. Landmark segments: full-canvas sprite + gradient edge mask, positioned by world X
    for (const seg of route) {
      if (seg.kind !== 'landmark' || !seg.enabled || !seg.id) continue;
      const spr = this.add.sprite(width * 2, height / 2, `landmark_${seg.id}_${this.currentTheme}`);
      spr.setOrigin(0.5, 0.5).setDepth(1);
      spr.setDisplaySize(WORLD_VISUALS.landmarkDisplayWidth, WORLD_VISUALS.landmarkDisplayHeight);
      spr.setVisible(false);

      // Gradient mask source: soft-fades the landmark's left/right edges into the city
      const maskImg = this.make.image({ x: width * 2, y: height / 2, key: LM_MASK_KEY, add: false });
      maskImg.setOrigin(0.5, 0.5);
      spr.setMask(maskImg.createBitmapMask());

      this.landmarks.push({ id: seg.id, spr, mask: maskImg });
    }

    // C. Thin per-theme color grade overlay (above backgrounds, below bike)
    const grade = THEME_GRADE[this.currentTheme];
    this.gradeRect = this.add.rectangle(0, 0, width, height, grade.color, grade.alpha)
      .setOrigin(0, 0).setDepth(5);

    // D. Bike: fixed container, child image offset per frame so wheels stay locked
    const bx = width * BIKE_CONFIG.screenXRatio;
    const by = height * BIKE_CONFIG.roadBaselineRatio + BIKE_CONFIG.verticalOffsetY;
    this.bikeContainer = this.add.container(bx, by).setDepth(10);
    this.bikeImage = this.add.image(0, 0, BIKE_IDLE_FRAME.key);
    this.bikeImage.setOrigin(0.5, 1);
    this.bikeImage.setScale(BIKE_CONFIG.displayWidth / BIKE_CONFIG.frameWidth);
    this.bikeContainer.add(this.bikeImage);
    this.applyBikeFrame(BIKE_IDLE_FRAME);

    // E. Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    // F. HUD comms
    window.addEventListener('hud-move-forward-start', () => { this.isMovingForward = true; });
    window.addEventListener('hud-move-forward-end', () => { this.isMovingForward = false; });
    window.addEventListener('hud-move-backward-start', () => { this.isMovingBackward = true; });
    window.addEventListener('hud-move-backward-end', () => { this.isMovingBackward = false; });
    window.addEventListener('hud-trigger-interaction', () => { this.triggerInteraction(); });

    this.dispatchTimeUpdate();
    this.dispatchJourneyUpdate();
  }

  /** Build a 1280x720 white texture whose alpha ramps in over transitionWidth on each side. */
  private buildEdgeMaskTexture(width: number, height: number): void {
    if (this.textures.exists(LM_MASK_KEY)) return;
    const canvasTex = this.textures.createCanvas(LM_MASK_KEY, width, height);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    const ramp = Phaser.Math.Clamp(WORLD_VISUALS.transitionWidth / width, 0.05, 0.45);
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(ramp, 'rgba(255,255,255,1)');
    grad.addColorStop(1 - ramp, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    canvasTex.refresh();
  }

  private applyBikeFrame(frame: BikeFrame): void {
    this.bikeImage.setTexture(frame.key);
    this.bikeImage.setPosition(frame.offsetX, frame.offsetY);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000; // clamp to avoid spikes on tab refocus
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Theme sync (swap textures in place, never reset world)
    const activeTheme = getCurrentTheme();
    if (activeTheme !== this.currentTheme) {
      this.currentTheme = activeTheme;
      this.cityBg.setTexture(`city_${activeTheme}`);
      const src = this.textures.get(`city_${activeTheme}`).getSourceImage();
      this.cityFitX = height / src.height;
      this.cityBg.setTileScale(this.cityFitX, this.cityFitX);
      for (const lv of this.landmarks) {
        lv.spr.setTexture(`landmark_${lv.id}_${activeTheme}`);
        lv.spr.setDisplaySize(WORLD_VISUALS.landmarkDisplayWidth, WORLD_VISUALS.landmarkDisplayHeight);
      }
      const grade = THEME_GRADE[activeTheme];
      this.gradeRect.setFillStyle(grade.color, grade.alpha);
      this.dispatchTimeUpdate();
    }

    // 2. Input -> target speed
    let fwd = this.isMovingForward;
    let back = this.isMovingBackward;
    if (this.cursors) {
      fwd = fwd || this.cursors.right.isDown || this.keyD.isDown;
      back = back || this.cursors.left.isDown || this.keyA.isDown;
    }
    if (fwd && !back) this.targetSpeed = this.maxForward;
    else if (back && !fwd) this.targetSpeed = this.maxReverse;
    else this.targetSpeed = 0;

    // 3. Smooth accel/decel toward target (dt-based)
    const rate = this.targetSpeed === 0 ? this.brake : this.accel;
    if (this.currentSpeed < this.targetSpeed) {
      this.currentSpeed = Math.min(this.currentSpeed + rate * dt, this.targetSpeed);
    } else if (this.currentSpeed > this.targetSpeed) {
      this.currentSpeed = Math.max(this.currentSpeed - rate * dt, this.targetSpeed);
    }

    // 4. Advance continuous world position
    this.worldDistance += this.currentSpeed * dt;

    // 5. Scroll city loop (parallax 1, horizontal only; TileSprite wraps seamlessly)
    this.cityBg.tilePositionX = this.worldDistance / this.cityFitX;

    // 6. Position landmark segments + their masks by absolute world X
    const bikeScreenX = width * BIKE_CONFIG.screenXRatio;
    for (const lv of this.landmarks) {
      const seg = route.find(s => s.id === lv.id)!;
      const screenX = bikeScreenX + (segmentCenter(seg) - this.worldDistance);
      lv.spr.x = screenX;
      lv.mask.x = screenX;
      lv.mask.y = lv.spr.y;
      const onScreen = screenX > -width / 2 && screenX < width * 1.5;
      lv.spr.setVisible(onScreen);
    }

    // 7. Animate bike (manual frame stepping; container never moves)
    this.updateBikeAnimation(delta);

    // 8. HUD label + landmark proximity
    this.updateTracking();

    // 9. Keyboard interaction
    if (this.cursors && (Phaser.Input.Keyboard.JustDown(this.keyE) || Phaser.Input.Keyboard.JustDown(this.keyEnter))) {
      this.triggerInteraction();
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
      // Stop: snap to idle frame 01
      this.isDriving = false;
      this.animIndex = 0;
      this.animAccum = 0;
      this.applyBikeFrame(BIKE_IDLE_FRAME);
    }
  }

  /** Determine current segment label + whether bike is within a landmark radius. */
  private updateTracking(): void {
    let label = 'Kota Jakarta';
    for (const seg of route) {
      if (!seg.enabled) continue;
      if (this.worldDistance >= seg.start && this.worldDistance < seg.start + seg.width) {
        label = seg.locationLabel;
        if (seg.kind === 'landmark') break; // landmark wins over overlapping city
      }
    }

    let near: string | null = null;
    let nearName = '';
    for (const seg of route) {
      if (seg.kind !== 'landmark' || !seg.enabled || !seg.id) continue;
      if (Math.abs(this.worldDistance - segmentCenter(seg)) < LANDMARK_PROMPT_RADIUS) {
        near = seg.id;
        nearName = seg.locationLabel;
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
    if (this.nearLandmarkId) {
      const seg = route.find(s => s.id === this.nearLandmarkId);
      window.dispatchEvent(new CustomEvent('hud-show-toast', {
        detail: { message: `Tiba di ${seg ? seg.locationLabel : this.nearLandmarkId}` },
      }));
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
