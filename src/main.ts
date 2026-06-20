import './style.css';
import Phaser from 'phaser';
import { JourneyScene } from './game/scenes/JourneyScene';
import { GameHUD } from './game/ui/hud';

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
