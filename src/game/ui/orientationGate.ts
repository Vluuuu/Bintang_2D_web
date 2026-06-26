/**
 * OrientationGate — retro pixel-art overlay that appears on mobile/tablet devices
 * when they are in portrait orientation, instructing the player to rotate their
 * device to landscape to play.
 *
 * It disables background interaction and dispatches `orientation-lock-changed`
 * to inform Phaser to freeze movement and keyboard inputs.
 */
export class OrientationGate {
  private overlay: HTMLElement;
  private isLocked = false;

  constructor() {
    // Build overlay HTML structure
    const el = document.createElement('div');
    el.id = 'orientation-gate';
    el.style.display = 'none'; // Hidden by default
    el.innerHTML = `
      <div class="orientation-panel">
        <div class="pixel-phone-icon"></div>
        <div class="orientation-title">PUTAR HP KAMU</div>
        <div class="orientation-text">
          Mainkan Bintang Journey<br>
          dalam posisi landscape.
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.overlay = el;

    this.setupListeners();
    this.checkOrientation();
  }

  private setupListeners(): void {
    const handler = () => this.checkOrientation();

    // Listen to resize and orientation changes
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);

    // Listen to media query changes directly
    const portraitQuery = window.matchMedia('(orientation: portrait)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');

    try {
      portraitQuery.addEventListener('change', handler);
      coarseQuery.addEventListener('change', handler);
    } catch (e) {
      // Fallback for older browsers
      portraitQuery.addListener(handler);
      coarseQuery.addListener(handler);
    }
  }

  private checkOrientation(): void {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const shouldLock = isTouch && isPortrait;

    if (shouldLock) {
      if (!this.isLocked) {
        this.isLocked = true;
        this.overlay.style.display = 'flex';
        // Dispatch event to freeze inputs in Phaser JourneyScene
        window.dispatchEvent(new CustomEvent('orientation-lock-changed', {
          detail: { locked: true }
        }));
      }
    } else {
      if (this.isLocked) {
        this.isLocked = false;
        this.overlay.style.display = 'none';
        // Dispatch event to resume inputs in Phaser JourneyScene
        window.dispatchEvent(new CustomEvent('orientation-lock-changed', {
          detail: { locked: false }
        }));
      }
    }
  }
}
