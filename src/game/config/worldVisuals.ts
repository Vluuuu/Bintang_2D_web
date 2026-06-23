import type { TimeTheme } from './timeTheme';

/**
 * World rendering knobs for the continuous-scroll world.
 *
 * Honest limitation: city and landmark assets are SEPARATE full 16:9 images,
 * not a tileable base + transparent overlay. They cannot be made truly seamless
 * in code. This config drives a soft horizontal edge-blend (a temporary, honest
 * smoothing) plus a thin per-theme color grade so assets in the same theme read
 * as one world. A final seamless result needs a tileable city base and
 * transparent landmark overlays.
 */
export const WORLD_VISUALS = {
  transitionWidth: 480,        // logical px of blend ramp on each side of a landmark
  cityDisplayWidth: 1280,
  cityDisplayHeight: 720,
  landmarkDisplayWidth: 1280,
  landmarkDisplayHeight: 720,
  // Visual segment width used ONLY for landmark render/visibility range.
  // Separate from route width (route width = gameplay/interaction distance).
  landmarkVisualWidth: 1280,
  debugLandmarkBounds: false,  // true = draw left/right edge guides + bounds labels
};

/** Very thin full-screen color grade per theme to unify city + landmark. */
export const THEME_GRADE: Record<TimeTheme, { color: number; alpha: number }> = {
  day:    { color: 0xffffff, alpha: 0.0 },  // neutral, effectively none
  sunset: { color: 0xff9a4d, alpha: 0.10 }, // thin warm overlay
  night:  { color: 0x0d1b3a, alpha: 0.14 }, // thin dark-blue overlay
};
