/**
 * Background music paths + tuning.
 * Files audited in public/assets/audio/ — do not rename/move/edit the MP3s.
 * Theme rule reused from timeTheme.ts: day + sunset share the day track,
 * night uses the night track.
 */
export const BGM_CONFIG = {
  day: 'assets/audio/bgm_day.mp3',     // used for day (06:00-16:59) AND sunset (17:00-18:59)
  night: 'assets/audio/bgm_night.mp3', // used for night (19:00-05:59)
  volume: 0.35,
  fadeDurationMs: 550,
};

export type BgmTrackKey = 'day' | 'night';
