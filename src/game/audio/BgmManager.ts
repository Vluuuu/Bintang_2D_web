import { BGM_CONFIG } from '../config/audio';
import type { BgmTrackKey } from '../config/audio';
import { getCurrentTheme } from '../config/timeTheme';
import type { TimeTheme } from '../config/timeTheme';

/**
 * Simple two-track background music manager with crossfade.
 *
 * - No autoplay: nothing plays until start() is called (first user interaction).
 * - day + sunset themes share the day track; night uses the night track.
 * - Theme changes crossfade over BGM_CONFIG.fadeDurationMs.
 * - Mute keeps tracks playing but at volume 0, so unmute is instant.
 * - Audio load failures are logged (with the missing path) and never break the game.
 */
function trackForTheme(theme: TimeTheme): BgmTrackKey {
  return theme === 'night' ? 'night' : 'day';
}

export class BgmManager {
  private elements: Record<BgmTrackKey, HTMLAudioElement>;
  private current: BgmTrackKey | null = null;
  private started = false;
  private muted = false;
  private fadeTimer: number | null = null;

  constructor() {
    this.muted = localStorage.getItem('bintang_journey_muted') === 'true';
    this.elements = {
      day: this.createAudio(BGM_CONFIG.day),
      night: this.createAudio(BGM_CONFIG.night),
    };
  }

  private createAudio(path: string): HTMLAudioElement {
    const el = new Audio(path);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    el.addEventListener('error', () => {
      console.warn(`[BGM] Failed to load audio: ${path} (game continues without this track)`);
    });
    return el;
  }

  /** Begin playback on first user interaction. Safe to call repeatedly. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.current = trackForTheme(getCurrentTheme());
    const el = this.elements[this.current];
    const target = this.muted ? 0 : BGM_CONFIG.volume;
    el.volume = 0;
    const play = el.play();
    if (play && typeof play.catch === 'function') {
      play.catch(err => console.warn('[BGM] Playback blocked or failed:', err?.message || err));
    }
    this.fadeTo(el, target);
  }

  /** Sync to the active theme; crossfades if the resolved track changed. */
  syncTheme(): void {
    if (!this.started) return;
    const next = trackForTheme(getCurrentTheme());
    if (next === this.current) return;

    const oldEl = this.current ? this.elements[this.current] : null;
    const newEl = this.elements[next];
    this.current = next;

    newEl.volume = 0;
    const play = newEl.play();
    if (play && typeof play.catch === 'function') {
      play.catch(err => console.warn('[BGM] Playback blocked or failed:', err?.message || err));
    }

    const target = this.muted ? 0 : BGM_CONFIG.volume;
    this.crossfade(oldEl, newEl, target);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.started || !this.current) return;
    const el = this.elements[this.current];
    this.fadeTo(el, muted ? 0 : BGM_CONFIG.volume);
  }

  isMuted(): boolean {
    return this.muted;
  }

  private crossfade(oldEl: HTMLAudioElement | null, newEl: HTMLAudioElement, target: number): void {
    const dur = BGM_CONFIG.fadeDurationMs;
    const startTime = performance.now();
    const oldStart = oldEl ? oldEl.volume : 0;
    if (this.fadeTimer !== null) window.clearInterval(this.fadeTimer);

    this.fadeTimer = window.setInterval(() => {
      const t = Math.min((performance.now() - startTime) / dur, 1);
      newEl.volume = target * t;
      if (oldEl) oldEl.volume = oldStart * (1 - t);
      if (t >= 1) {
        if (oldEl) { oldEl.pause(); oldEl.currentTime = 0; }
        if (this.fadeTimer !== null) { window.clearInterval(this.fadeTimer); this.fadeTimer = null; }
      }
    }, 16);
  }

  private fadeTo(el: HTMLAudioElement, target: number): void {
    const dur = BGM_CONFIG.fadeDurationMs;
    const startTime = performance.now();
    const startVol = el.volume;
    if (this.fadeTimer !== null) window.clearInterval(this.fadeTimer);

    this.fadeTimer = window.setInterval(() => {
      const t = Math.min((performance.now() - startTime) / dur, 1);
      el.volume = startVol + (target - startVol) * t;
      if (t >= 1 && this.fadeTimer !== null) {
        window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    }, 16);
  }
}
