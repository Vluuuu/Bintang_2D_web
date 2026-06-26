import type { TimeTheme } from './timeTheme';

/**
 * Celestial layer (sun / moon) config.
 *
 * The sun/moon are FIXED to the viewport — they do NOT move with worldDistance,
 * do not tile, and only one instance is ever shown. Position is a ratio of the
 * game canvas (1280x720).
 *
 * AUDIT NOTE (honest): the SUNSET city background already has a sun painted into
 * the image (public/assets/backgrounds/sunset/bg_city_sunset_loop.png). To avoid
 * rendering two suns, the sunset celestial layer is disabled (enabled: false) and
 * relies on the baked-in sun. Day and night backgrounds have NO baked celestial,
 * so their layers are enabled and use the separate sun.png / moon.png assets.
 *
 * Assets found in audit:
 *   sun  -> assets/backgrounds/day/sun.png    (120x119)
 *   moon -> assets/backgrounds/night/moon.png (166x166)
 * (No separate sunset sun asset exists; day's sun would be reused if enabled.)
 */
export interface CelestialThemeConfig {
  enabled: boolean;   // false = background already contains the celestial body
  assetKey: 'sun' | 'sunset_sun' | 'moon';
  xRatio: number;     // 0..1 of canvas width
  yRatio: number;     // 0..1 of canvas height
}

export const CELESTIAL_ASSETS = {
  sun: 'assets/backgrounds/day/sun.png',
  sunset_sun: 'assets/backgrounds/sunset/sunset_sun.png',
  moon: 'assets/backgrounds/night/moon.png',
};

/** Tiny optional idle drift. Off by default (spec: keep it stable). */
export const CELESTIAL_DRIFT = {
  enabled: false,
  amplitudePx: 1.5, // max horizontal sway
  periodMs: 12000,
};

export const CELESTIAL_CONFIG: Record<TimeTheme, CelestialThemeConfig> = {
  day:    { enabled: true,  assetKey: 'sun',  xRatio: 0.16, yRatio: 0.16 },
  sunset: { enabled: true,  assetKey: 'sunset_sun',  xRatio: 0.11, yRatio: 0.15 },
  night:  { enabled: true,  assetKey: 'moon', xRatio: 0.16, yRatio: 0.17 },
};
