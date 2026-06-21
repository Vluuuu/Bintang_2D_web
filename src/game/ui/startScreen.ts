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
      <div class="start-panel">
        <h1 class="start-title">BINTANG JOURNEY</h1>
        <p class="start-subtitle">Sebuah perjalanan kecil.</p>
        <button class="start-btn" id="start-btn" type="button">MULAI PERJALANAN</button>
      </div>
    `;
    const mount = document.getElementById('game-wrapper') || document.body;
    mount.appendChild(el);
    this.overlay = el;

    const btn = el.querySelector('#start-btn') as HTMLButtonElement;
    btn.addEventListener('click', () => this.begin());
  }

  private begin(): void {
    if (this.overlay.classList.contains('fade-out')) return;
    // Dispatch synchronously inside the click gesture so audio playback is allowed.
    window.dispatchEvent(new CustomEvent('game-start'));
    this.overlay.classList.add('fade-out');
    window.setTimeout(() => this.overlay.remove(), 350);
  }
}
