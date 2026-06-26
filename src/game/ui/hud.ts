import { formatLocalTime } from '../config/timeTheme';

export class GameHUD {
  private containerId = 'game-hud-container';
  private locationEl!: HTMLElement;
  private timeEl!: HTMLElement;
  private soundBtn!: HTMLElement;
  private fullscreenBtn!: HTMLElement;
  private leftBtn!: HTMLElement;
  private rightBtn!: HTMLElement;
  private interactPromptEl!: HTMLElement;
  private toastContainerEl!: HTMLElement;

  // Sound state
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem('bintang_journey_muted') === 'true';
    this.initDOM();
    this.setupListeners();
    this.startClock();
  }

  private initDOM(): void {
    // Check if container already exists
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      document.body.appendChild(container);
    }

    // Set inner HTML for HUD overlay elements
    container.innerHTML = `
      <!-- Top HUD Area -->
      <div class="hud-top">
        <div class="hud-top-right">
          <div class="hud-location-card">
            <span class="location-icon">📍</span>
            <span id="hud-location-text">Kota Jakarta</span>
          </div>
          <div class="hud-time-card" id="hud-time-text">00:00 WIB</div>
          <button class="hud-sound-btn" id="hud-sound-toggle" title="Toggle Sound">
            ${this.getSoundIconHTML()}
          </button>
          <button class="hud-sound-btn" id="hud-fullscreen-toggle" title="Toggle Fullscreen">
            ${this.getFullscreenIconHTML()}
          </button>
        </div>
      </div>

      <!-- Lower Interaction Prompt -->
      <div class="hud-center-bottom">
        <div class="hud-interact-prompt" id="hud-interact-prompt" style="display: none;">
          <span class="key-box">E</span>
          <span class="prompt-text">Interaksi</span>
        </div>
      </div>

      <!-- Bottom Touch Controls Area -->
      <div class="hud-bottom-controls">
        <div class="control-group left-group">
          <button class="control-btn" id="ctrl-left" aria-label="Mundur">◀</button>
          <div class="control-hint">A / ◀</div>
        </div>
        <div class="control-group right-group">
          <button class="control-btn" id="ctrl-right" aria-label="Maju">▶</button>
          <div class="control-hint">D / ▶</div>
        </div>
      </div>

      <!-- Toast Notifications Container -->
      <div class="hud-toast-container" id="hud-toast-container"></div>
    `;

    // Cache element references
    this.locationEl = document.getElementById('hud-location-text')!;
    this.timeEl = document.getElementById('hud-time-text')!;
    this.soundBtn = document.getElementById('hud-sound-toggle')!;
    this.fullscreenBtn = document.getElementById('hud-fullscreen-toggle')!;
    this.leftBtn = document.getElementById('ctrl-left')!;
    this.rightBtn = document.getElementById('ctrl-right')!;
    this.interactPromptEl = document.getElementById('hud-interact-prompt')!;
    this.toastContainerEl = document.getElementById('hud-toast-container')!;
  }

  private setupListeners(): void {
    // 1. Listen to Phaser game events
    window.addEventListener('journey-update', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.updateLocation(detail.location);
      this.toggleInteractPrompt(detail.nearLandmark);
    });

    window.addEventListener('hud-show-toast', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.showToast(detail.message);
    });

    window.addEventListener('time-theme-update', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.updateTimeText(detail.timeStr);
    });

    // 2. Sound Toggle Click
    this.soundBtn.addEventListener('click', () => {
      this.toggleMute();
    });

    // Fullscreen Toggle Click
    this.fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', () => {
      this.fullscreenBtn.innerHTML = this.getFullscreenIconHTML();
    });

    // 3. Prompt Interaction Trigger (on click / touch)
    this.interactPromptEl.addEventListener('click', () => {
      this.triggerInteraction();
    });

    // 4. Touch hold controls
    this.bindTouchEvents(this.leftBtn, 'hud-move-backward-start', 'hud-move-backward-end');
    this.bindTouchEvents(this.rightBtn, 'hud-move-forward-start', 'hud-move-forward-end');
  }

  private bindTouchEvents(btn: HTMLElement, startEvent: string, endEvent: string): void {
    // Flags to ensure we don't trigger duplicates
    let isPressed = false;

    const start = (e: Event) => {
      e.preventDefault();
      if (!isPressed) {
        isPressed = true;
        btn.classList.add('active');
        window.dispatchEvent(new Event(startEvent));
      }
    };

    const stop = (e: Event) => {
      e.preventDefault();
      if (isPressed) {
        isPressed = false;
        btn.classList.remove('active');
        window.dispatchEvent(new Event(endEvent));
      }
    };

    // Touch support
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', stop, { passive: false });
    btn.addEventListener('touchcancel', stop, { passive: false });

    // Mouse support (for testing on desktop)
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
  }

  private triggerInteraction(): void {
    window.dispatchEvent(new Event('hud-trigger-interaction'));
  }

  private updateLocation(location: string): void {
    this.locationEl.textContent = location;
  }

  private toggleInteractPrompt(visible: boolean): void {
    this.interactPromptEl.style.display = visible ? 'flex' : 'none';
  }

  private toggleMute(): void {
    this.isMuted = !this.isMuted;
    localStorage.setItem('bintang_journey_muted', String(this.isMuted));
    this.soundBtn.innerHTML = this.getSoundIconHTML();
    this.showToast(this.isMuted ? 'Mute' : 'Unmute');
    window.dispatchEvent(new CustomEvent('hud-mute-changed', { detail: { muted: this.isMuted } }));
  }

  private getSoundIconHTML(): string {
    if (this.isMuted) {
      // Sound Muted Icon (Speaker with an X or crossed out)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-pixel-icon" fill="currentColor">
          <path d="M4 9h4l5-5v16l-5-5H4V9zm16 3l-2-2-1 1 1 1-1 1 1 1 2-2zm-2-6l-1.5 1.5 1.5 1.5.5-.5-1-1 .5-.5z"/>
        </svg>
      `;
    } else {
      // Sound On Icon (Speaker with sound waves)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-pixel-icon" fill="currentColor">
          <path d="M4 9h4l5-5v16l-5-5H4V9zm12 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      `;
    }
  }

  private getFullscreenIconHTML(): string {
    if (document.fullscreenElement) {
      // Exit Fullscreen Icon (pixel brackets pointing in)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-pixel-icon" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
        </svg>
      `;
    } else {
      // Enter Fullscreen Icon (pixel brackets pointing out)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-pixel-icon" fill="currentColor">
          <path d="M5 5h5V3H3v7h2V5zm0 14H3v7h7v-2H5v-5zm14 5h-5v2h7v-7h-2v5zm0-19v5h2V3h-7v2h5z"/>
        </svg>
      `;
    }
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.warn("Exit fullscreen failed:", err);
      });
    } else {
      const docEl = document.documentElement;
      const requestFS = docEl.requestFullscreen || 
                        (docEl as any).webkitRequestFullscreen || 
                        (docEl as any).mozRequestFullScreen || 
                        (docEl as any).msRequestFullscreen;
      if (requestFS) {
        requestFS.call(docEl).then(() => {
          this.lockOrientation();
        }).catch((err) => {
          console.warn("Fullscreen request failed:", err);
          this.lockOrientation();
        });
      } else {
        this.lockOrientation();
      }
    }
  }

  private lockOrientation(): void {
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock('landscape').catch((err: any) => {
          console.warn("Orientation lock failed:", err);
        });
      } else if ((screen as any).lockOrientation) {
        (screen as any).lockOrientation('landscape');
      }
    } catch (e) {
      console.warn("Orientation lock error:", e);
    }
  }

  private startClock(): void {
    const tick = () => {
      this.updateTimeText(formatLocalTime());
    };
    tick(); // Initial call
    setInterval(tick, 1000); // Update every second
  }

  private updateTimeText(timeStr: string): void {
    this.timeEl.textContent = timeStr;
  }

  public showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'hud-toast';
    toast.textContent = message;

    this.toastContainerEl.appendChild(toast);

    // Fade out and remove toast
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 2000);
  }
}
