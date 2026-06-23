/**
 * DialogueBubble — a cute retro pixel-art chat bubble that appears above the
 * motor/couple in the viewport. It is a DOM overlay (not a Phaser GameObject)
 * so it can use CSS pixel-art styling and remain crisp at any zoom level.
 *
 * Lifecycle:
 *   const bubble = new DialogueBubble();
 *   bubble.show({ label: 'UPNVJ', text: '...' });
 *   // ... user presses E / clicks / taps ...
 *   bubble.hide();
 *
 * The bubble dispatches `dialogue-closed` on `window` when dismissed.
 * While visible, it sets `pointer-events: auto` on its container so taps/clicks
 * on the bubble are captured (preventing background interaction).
 */
export interface DialogueBubbleData {
    label: string;
    text: string;
}

export class DialogueBubble {
    private containerId = 'dialogue-bubble-container';
    private container: HTMLElement;
    private bubbleEl: HTMLElement;
    private labelEl: HTMLElement;
    private textEl: HTMLElement;
    private _visible = false;

    constructor() {
        // Create container if not exists
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            const wrapper = document.getElementById('game-wrapper') || document.body;
            wrapper.appendChild(container);
        }
        this.container = container;

        // Build bubble HTML
        this.container.innerHTML = `
      <div class="dialogue-bubble" id="dialogue-bubble">
        <div class="dialogue-bubble-tail" id="dialogue-bubble-tail"></div>
        <div class="dialogue-bubble-label" id="dialogue-bubble-label"></div>
        <div class="dialogue-bubble-text" id="dialogue-bubble-text"></div>
        <div class="dialogue-bubble-hint" id="dialogue-bubble-hint">E / Klik untuk lanjut</div>
      </div>
    `;

        this.bubbleEl = document.getElementById('dialogue-bubble')!;
        this.labelEl = document.getElementById('dialogue-bubble-label')!;
        this.textEl = document.getElementById('dialogue-bubble-text')!;

        // Hide by default
        this.container.style.display = 'none';

        // Click/tap on bubble to close
        this.bubbleEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });
        this.bubbleEl.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hide();
        });
    }

    /** Show the bubble with the given label and text. */
    show(data: DialogueBubbleData): void {
        this.labelEl.textContent = data.label;
        this.textEl.textContent = data.text;
        this.container.style.display = 'flex';
        this._visible = true;

        // Re-trigger entrance animation
        this.bubbleEl.classList.remove('dialogue-bubble-enter');
        void this.bubbleEl.offsetWidth; // force reflow
        this.bubbleEl.classList.add('dialogue-bubble-enter');
    }

    /** Hide the bubble and dispatch dialogue-closed event. */
    hide(): void {
        if (!this._visible) return;
        this.container.style.display = 'none';
        this._visible = false;
        window.dispatchEvent(new CustomEvent('dialogue-closed'));
    }

    /** Whether the bubble is currently visible. */
    get visible(): boolean {
        return this._visible;
    }
}
