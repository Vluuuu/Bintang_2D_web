import './style.css';
import Phaser from 'phaser';
import { JourneyScene } from './game/scenes/JourneyScene';
import { GameHUD } from './game/ui/hud';
import { BgmManager } from './game/audio/BgmManager';
import { StartScreen } from './game/ui/startScreen';
import { OrientationGate } from './game/ui/orientationGate';

// Phaser game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-viewport',
  scale: {
    // Fits the game to the game-viewport container width/height while keeping 16:9 ratio
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: true,       // Optimizes renderer settings for pixel art
    antialias: false,     // Disables smoothing/blurs
    roundPixels: true     // Prevents pixel bleeding subpixel render artifacts
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [JourneyScene]
};

// Instantiate the Phaser Game
export const game = new Phaser.Game(config);

// Instantiate the Interactive overlay HUD
export const hud = new GameHUD();

// Background music: no autoplay; starts only from the start button click.
export const bgm = new BgmManager();

// Hide gameplay HUD/controls until the journey begins.
document.body.classList.add('pre-start');

// Start screen overlay (world frozen behind it; shown once per page load).
export const startScreen = new StartScreen();

// Orientation gate overlay for mobile portrait devices
export const orientationGate = new OrientationGate();

window.addEventListener('game-start', () => {
  (window as any).__journeyStarted = true; // persistent flag: scene may attach its listener later
  document.body.classList.remove('pre-start');
  bgm.start(); // begins inside the click gesture, so playback is allowed
}, { once: true });

// Mute toggle (works after start).
window.addEventListener('hud-mute-changed', (e: Event) => {
  const muted = (e as CustomEvent).detail.muted as boolean;
  bgm.setMuted(muted);
});

// Ending (goa): fade the music out gently as the screen fades to black.
window.addEventListener('journey-ending', () => bgm.fadeOut(), { once: true });

// Follow device-time theme changes (reuses timeTheme rules; crossfades on change).
window.setInterval(() => bgm.syncTheme(), 5000);

// Dev check: ensure exactly one active Phaser canvas exists (guards against double-scene regressions)
if (import.meta.env.DEV) {
  (window as any).game = game; // dev-only handle for debugging/inspection
  window.setTimeout(() => {
    const canvasCount = document.querySelectorAll('canvas').length;
    if (canvasCount !== 1) {
      console.error(`[DEV] Expected exactly 1 Phaser canvas, found ${canvasCount}. Possible double-scene regression.`);
    } else {
      console.info('[DEV] Single Phaser canvas confirmed.');
    }
  }, 0);
}
