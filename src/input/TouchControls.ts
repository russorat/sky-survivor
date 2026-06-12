import type { InputManager } from './InputManager';

export class TouchControls {
  readonly element: HTMLElement;
  readonly buttonsElement: HTMLElement;
  private input: InputManager;
  private onInventoryToggle?: () => void;
  private joystick: HTMLElement;
  private knob: HTMLElement;
  private lookZone: HTMLElement;
  private joystickActive = false;
  private joystickCenter = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;
  private lookPointerId: number | null = null;
  private lastLook = { x: 0, y: 0 };
  private lastDownTapTime = 0;

  private readonly onJoystickMove = (e: PointerEvent) => {
    if (!this.joystickActive || e.pointerId !== this.joystickPointerId) return;
    const dx = e.clientX - this.joystickCenter.x;
    const dy = e.clientY - this.joystickCenter.y;
    const max = 40;
    const len = Math.hypot(dx, dy);
    const clamped = len > max ? max / len : 1;
    const nx = (dx * clamped) / max;
    const ny = -(dy * clamped) / max;
    this.knob.style.transform = `translate(${nx * 30}px, ${-ny * 30}px)`;
    this.input.setTouchMove(nx, ny);
  };

  private readonly onJoystickEnd = (e: PointerEvent) => {
    if (e.pointerId !== this.joystickPointerId) return;
    this.detachJoystickListeners();
    this.clearJoystick();
  };

  private readonly onLookMove = (e: PointerEvent) => {
    if (e.pointerId !== this.lookPointerId) return;
    const dx = e.clientX - this.lastLook.x;
    const dy = e.clientY - this.lastLook.y;
    this.lastLook = { x: e.clientX, y: e.clientY };
    this.input.setTouchLook(dx * 0.55, dy * 0.55);
  };

  private readonly onLookEnd = (e: PointerEvent) => {
    if (e.pointerId !== this.lookPointerId) return;
    this.detachLookListeners();
    this.lookPointerId = null;
  };

  constructor(input: InputManager, root: HTMLElement) {
    this.input = input;
    const visible = input.touchMode;

    this.element = document.createElement('div');
    this.element.className = visible ? 'touch-controls' : 'touch-controls hidden';
    this.element.innerHTML = `
      <div class="joystick-zone" id="move-joystick">
        <div class="joystick-knob" id="move-knob"></div>
      </div>
      <div class="look-zone" id="look-zone"></div>
    `;

    this.buttonsElement = document.createElement('div');
    this.buttonsElement.className = visible ? 'touch-buttons' : 'touch-buttons hidden';
    this.buttonsElement.innerHTML = `
      <button type="button" class="touch-btn" data-action="up">UP</button>
      <button type="button" class="touch-btn" data-action="down">DN</button>
      <button type="button" class="touch-btn" data-action="inv">INV</button>
      <button type="button" class="touch-btn" data-action="craft">CRF</button>
      <button type="button" class="touch-btn" data-action="vehicle">VEH</button>
      <button type="button" class="touch-btn attack" data-action="attack">ATTACK</button>
      <button type="button" class="touch-btn" data-action="eat">EAT</button>
    `;

    root.appendChild(this.element);
    root.appendChild(this.buttonsElement);

    this.joystick = this.element.querySelector('#move-joystick') as HTMLElement;
    this.knob = this.element.querySelector('#move-knob') as HTMLElement;
    this.lookZone = this.element.querySelector('#look-zone') as HTMLElement;

    if (!visible) return;

    this.setupJoystick();
    this.setupLook();
    this.setupButtons();
  }

  setActive(active: boolean): void {
    if (!active) {
      this.resetPointerState();
    }
    this.element.classList.toggle('inactive', !active);
    this.buttonsElement.classList.toggle('inactive', !active);
  }

  /** Hide joystick/look only — keeps action buttons reachable (e.g. to close inventory). */
  setMovementActive(active: boolean): void {
    if (!active) {
      this.resetPointerState();
    }
    this.element.classList.toggle('inactive', !active);
  }

  setInventoryToggleHandler(handler: () => void): void {
    this.onInventoryToggle = handler;
  }

  resetPointerState(): void {
    this.detachJoystickListeners();
    this.detachLookListeners();
    this.joystickActive = false;
    this.joystickPointerId = null;
    this.lookPointerId = null;
    this.knob.style.transform = 'translate(0, 0)';
    this.input.setTouchMove(0, 0);
    this.input.setTouchAscend(0);
    this.input.setTouchAttack(false);
  }

  private setupJoystick(): void {
    this.joystick.addEventListener('pointerdown', (e) => {
      if (this.joystickPointerId !== null) return;
      e.stopPropagation();
      this.joystickActive = true;
      this.joystickPointerId = e.pointerId;
      const rect = this.joystick.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.attachJoystickListeners();
    });
  }

  private setupLook(): void {
    this.lookZone.addEventListener('pointerdown', (e) => {
      if (this.lookPointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();
      this.lookPointerId = e.pointerId;
      this.lastLook = { x: e.clientX, y: e.clientY };
      this.attachLookListeners();
    });
  }

  private setupButtons(): void {
    this.buttonsElement.querySelectorAll('.touch-btn').forEach((btn) => {
      const action = (btn as HTMLElement).dataset.action;
      if (!action) return;

      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });

      if (action === 'up' || action === 'down' || action === 'attack') {
        btn.addEventListener('pointerdown', () => {
          if (action === 'up' && !this.input.isWalkMode()) {
            this.input.setTouchAscend(1);
          }
          if (action === 'down' && !this.input.isWalkMode()) {
            this.input.setTouchAscend(-1);
          }
          if (action === 'attack') {
            this.input.setTouchAttack(true);
          }
        });

        btn.addEventListener('pointerup', (e) => {
          e.stopPropagation();
          if (action === 'up' || action === 'down') {
            if (action === 'down') {
              const now = performance.now();
              if (now - this.lastDownTapTime < 350) {
                this.input.requestWalkModeToggle();
                this.lastDownTapTime = 0;
              } else {
                this.lastDownTapTime = now;
              }
            }
            this.input.setTouchAscend(0);
          }
          if (action === 'attack') {
            this.input.setTouchAttack(false);
          }
        });

        btn.addEventListener('pointercancel', () => {
          if (action === 'up' || action === 'down') {
            this.input.setTouchAscend(0);
          }
          if (action === 'attack') {
            this.input.setTouchAttack(false);
          }
        });
        return;
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (action === 'inv' || action === 'craft') {
          this.onInventoryToggle?.();
          return;
        }
        if (action === 'vehicle') {
          this.input.state.vehicleToggle = true;
        }
        if (action === 'eat') {
          this.input.state.eatPressed = true;
        }
      });
    });
  }

  private attachJoystickListeners(): void {
    window.addEventListener('pointermove', this.onJoystickMove);
    window.addEventListener('pointerup', this.onJoystickEnd);
    window.addEventListener('pointercancel', this.onJoystickEnd);
  }

  private detachJoystickListeners(): void {
    window.removeEventListener('pointermove', this.onJoystickMove);
    window.removeEventListener('pointerup', this.onJoystickEnd);
    window.removeEventListener('pointercancel', this.onJoystickEnd);
  }

  private attachLookListeners(): void {
    window.addEventListener('pointermove', this.onLookMove);
    window.addEventListener('pointerup', this.onLookEnd);
    window.addEventListener('pointercancel', this.onLookEnd);
  }

  private detachLookListeners(): void {
    window.removeEventListener('pointermove', this.onLookMove);
    window.removeEventListener('pointerup', this.onLookEnd);
    window.removeEventListener('pointercancel', this.onLookEnd);
  }

  private clearJoystick(): void {
    this.joystickActive = false;
    this.joystickPointerId = null;
    this.knob.style.transform = 'translate(0, 0)';
    this.input.setTouchMove(0, 0);
  }
}
