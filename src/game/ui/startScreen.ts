/**
 * Opening overlay shown before gameplay starts.
 *
 * While visible: world is frozen, HUD/controls hidden, no music.
 * On "Mulai Perjalanan": fades out, dispatches `game-start` (consumed by
 * main.ts to reveal HUD + enable input, and by JourneyScene to unfreeze the
 * world). Music begins from that same click gesture. Shown once per page load.
 */
export class StartScreen {
  private overlay: HTMLElement;

  constructor() {
    const el = document.createElement('div');
    el.id = 'start-screen';
    el.innerHTML = `
      <button class="start-btn" id="start-btn" type="button">MULAI</button>
    `;
    const mount = document.getElementById('game-wrapper') || document.body;
    mount.appendChild(el);
    this.overlay = el;

    const btn = el.querySelector('#start-btn') as HTMLButtonElement;
    btn.addEventListener('click', () => this.begin());
  }

  private begin(): void {
    if (this.overlay.classList.contains('fade-out')) return;

    // Try requesting fullscreen and locking screen orientation for mobile/touch
    this.tryFullscreenAndLock();

    // Dispatch synchronously inside the click gesture so audio playback is allowed.
    window.dispatchEvent(new CustomEvent('game-start'));
    this.overlay.classList.add('fade-out');
    window.setTimeout(() => this.overlay.remove(), 350);
  }

  private tryFullscreenAndLock(): void {
    // Only attempt on touch devices to avoid desktop fullscreen issues
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) return;

    const docEl = document.documentElement;
    const requestFS = docEl.requestFullscreen || 
                      (docEl as any).webkitRequestFullscreen || 
                      (docEl as any).mozRequestFullScreen || 
                      (docEl as any).msRequestFullscreen;

    if (requestFS) {
      requestFS.call(docEl).then(() => {
        this.lockOrientation();
      }).catch((err) => {
        console.warn("Fullscreen request silently failed/denied:", err);
        // Try orientation lock even if fullscreen request fails (some agents support it independently)
        this.lockOrientation();
      });
    } else {
      this.lockOrientation();
    }
  }

  private lockOrientation(): void {
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock('landscape').catch((err: any) => {
          console.warn("Orientation lock silently failed/denied:", err);
        });
      } else if ((screen as any).lockOrientation) {
        (screen as any).lockOrientation('landscape');
      } else if ((screen as any).mozLockOrientation) {
        (screen as any).mozLockOrientation('landscape');
      } else if ((screen as any).msLockOrientation) {
        (screen as any).msLockOrientation('landscape');
      }
    } catch (e) {
      console.warn("Orientation lock error:", e);
    }
  }
}
