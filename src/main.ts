import './style.css';
import Phaser from 'phaser';
import { JourneyScene } from './game/scenes/JourneyScene';
import { GameHUD } from './game/ui/hud';
import { BgmManager } from './game/audio/BgmManager';

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

// Background music: no autoplay; starts on first player interaction.
export const bgm = new BgmManager();

const startBgmOnce = () => {
  bgm.start();
  window.removeEventListener('hud-move-forward-start', startBgmOnce);
  window.removeEventListener('hud-move-backward-start', startBgmOnce);
  window.removeEventListener('keydown', onKeyStart);
};
const onKeyStart = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) startBgmOnce();
};
window.addEventListener('hud-move-forward-start', startBgmOnce);
window.addEventListener('hud-move-backward-start', startBgmOnce);
window.addEventListener('keydown', onKeyStart);

// Sound button also counts as first interaction (and toggles mute).
window.addEventListener('hud-mute-changed', (e: Event) => {
  const muted = (e as CustomEvent).detail.muted as boolean;
  bgm.start();
  bgm.setMuted(muted);
});

// Follow device-time theme changes (reuses timeTheme rules; crossfades on change).
window.setInterval(() => bgm.syncTheme(), 5000);

// Dev check: ensure exactly one active Phaser canvas exists (guards against double-scene regressions)
if (import.meta.env.DEV) {
  window.setTimeout(() => {
    const canvasCount = document.querySelectorAll('canvas').length;
    if (canvasCount !== 1) {
      console.error(`[DEV] Expected exactly 1 Phaser canvas, found ${canvasCount}. Possible double-scene regression.`);
    } else {
      console.info('[DEV] Single Phaser canvas confirmed.');
    }
  }, 0);
}
