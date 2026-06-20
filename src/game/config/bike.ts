/**
 * Bike placement + per-frame stabilization.
 *
 * The six PNG frames share a 512x341 transparent canvas, but the motorcycle
 * sits at a slightly different position inside each canvas. setOrigin() alone
 * cannot fix this, so the bike lives in a fixed-position container and each
 * frame applies a measured offset (display px) to keep the wheels locked to the
 * same road baseline.
 *
 * Offsets were MEASURED from the alpha bounding box of every frame (Chrome
 * native PNG decode), not guessed:
 *   ref = frame 01 (centerX=242, wheelBottom=339)
 *   offsetX = (242 - frame.centerX) * displayScale
 *   offsetY = (339 - frame.wheelBottom) * displayScale     displayScale=300/512
 *
 * IMPORTANT: bike_duo_03.png and bike_duo_04.png are FULLY TRANSPARENT in the
 * shipped asset (alpha max = 0, zero opaque pixels). They are marked blank and
 * excluded from the animation so the bike never flickers to nothing. The drive
 * cycle therefore loops 01 -> 02 -> 05 -> 06. Replace those two PNGs with real
 * art to restore a full 6-frame cycle.
 */
export interface BikeFrame {
  key: string;
  file: string;
  offsetX: number; // display px nudge to align this frame to frame 01
  offsetY: number;
  blank: boolean;  // true = transparent placeholder, skipped in animation
}

export const BIKE_CONFIG = {
  screenXRatio: 0.5,
  roadBaselineRatio: 0.93, // verified: wheels sit on asphalt at this canvas ratio
  verticalOffsetY: -115,    // px nudge applied to whole container; negative = lift bike up onto asphalt
  displayWidth: 300,
  frameWidth: 512,
  frameHeight: 341,
  animationFps: 8,
  moveThreshold: 18, // px/sec; below this the bike is considered stopped
  frames: [
    { key: 'bike-01', file: 'assets/sprites/vehicle/bike_duo_frames/bike_duo_01.png', offsetX: 0, offsetY: 0, blank: false },
    { key: 'bike-02', file: 'assets/sprites/vehicle/bike_duo_frames/bike_duo_02.png', offsetX: -11, offsetY: 1, blank: false },
    { key: 'bike-03', file: 'assets/sprites/vehicle/bike_duo_frames/bike_duo_03.png', offsetX: 0, offsetY: 0, blank: true },
    { key: 'bike-04', file: 'assets/sprites/vehicle/bike_duo_frames/bike_duo_04.png', offsetX: 0, offsetY: 0, blank: true },
    { key: 'bike-05', file: 'assets/sprites/vehicle/bike_duo_frames/bike_duo_05.png', offsetX: -11, offsetY: 20, blank: false },
    { key: 'bike-06', file: 'assets/sprites/vehicle/bike_duo_frames/bike_duo_06.png', offsetX: -14, offsetY: 20, blank: false },
  ] as BikeFrame[],
};

/** Animation sequence = non-blank frames only. */
export const BIKE_DRIVE_SEQUENCE: BikeFrame[] = BIKE_CONFIG.frames.filter(f => !f.blank);
export const BIKE_IDLE_FRAME: BikeFrame = BIKE_CONFIG.frames[0]; // bike_duo_01
