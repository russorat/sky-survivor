import type { InputManager } from './InputManager';

export class TouchControls {
  readonly element: HTMLElement;
  private input: InputManager;
  private joystickActive = false;
  private joystickCenter = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;
  private lookPointerId: number | null = null;
  private lastLook = { x: 0, y: 0 };
  private lastDownTapTime = 0;

  constructor(input: InputManager, root: HTMLElement) {
    this.input = input;
    this.element = document.createElement('div');
    this.element.className = input.touchMode ? 'touch-controls' : 'touch-controls hidden';
    this.element.innerHTML = `
      <div class="joystick-zone" id="move-joystick">
        <div class="joystick-knob" id="move-knob"></div>
      </div>
      <div class="look-zone" id="look-zone"></div>
      <div class="touch-actions">
        <button class="touch-btn" data-action="up">UP</button>
        <button class="touch-btn" data-action="down">DN</button>
        <button class="touch-btn" data-action="inv">INV</button>
        <button class="touch-btn" data-action="craft">CRF</button>
        <button class="touch-btn" data-action="vehicle">VEH</button>
        <button class="touch-btn attack" data-action="attack">ATTACK</button>
        <button class="touch-btn" data-action="eat">EAT</button>
      </div>
    `;
    root.appendChild(this.element);

    if (!input.touchMode) return;

    const joystick = this.element.querySelector('#move-joystick') as HTMLElement;
    const knob = this.element.querySelector('#move-knob') as HTMLElement;
    const lookZone = this.element.querySelector('#look-zone') as HTMLElement;

    joystick.addEventListener('pointerdown', (e) => {
      if (this.joystickPointerId !== null) return;
      e.preventDefault();
      this.joystickActive = true;
      this.joystickPointerId = e.pointerId;
      const rect = joystick.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      joystick.setPointerCapture(e.pointerId);
    });

    joystick.addEventListener('pointermove', (e) => {
      if (!this.joystickActive || e.pointerId !== this.joystickPointerId) return;
      e.preventDefault();
      const dx = e.clientX - this.joystickCenter.x;
      const dy = e.clientY - this.joystickCenter.y;
      const max = 40;
      const len = Math.hypot(dx, dy);
      const clamped = len > max ? max / len : 1;
      const nx = (dx * clamped) / max;
      const ny = -(dy * clamped) / max;
      knob.style.transform = `translate(${nx * 30}px, ${-ny * 30}px)`;
      this.input.setTouchMove(nx, ny);
    });

    const endJoystick = (e: PointerEvent) => {
      if (e.pointerId !== this.joystickPointerId) return;
      this.joystickActive = false;
      this.joystickPointerId = null;
      knob.style.transform = 'translate(0, 0)';
      this.input.setTouchMove(0, 0);
    };
    joystick.addEventListener('pointerup', endJoystick);
    joystick.addEventListener('pointercancel', endJoystick);

    lookZone.addEventListener('pointerdown', (e) => {
      if (this.lookPointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      this.lookPointerId = e.pointerId;
      this.lastLook = { x: e.clientX, y: e.clientY };
      lookZone.setPointerCapture(e.pointerId);
    });

    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookPointerId) return;
      e.preventDefault();
      const dx = e.clientX - this.lastLook.x;
      const dy = e.clientY - this.lastLook.y;
      this.lastLook = { x: e.clientX, y: e.clientY };
      this.input.setTouchLook(dx * 0.55, dy * 0.55);
    });

    const endLook = (e: PointerEvent) => {
      if (e.pointerId !== this.lookPointerId) return;
      this.lookPointerId = null;
    };
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);

    let ascend = 0;
    this.element.querySelectorAll('.touch-btn').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'up') {
          if (!this.input.isWalkMode()) ascend = 1;
        }
        if (action === 'down') {
          const now = performance.now();
          if (now - this.lastDownTapTime < 350) {
            this.input.requestWalkModeToggle();
            this.lastDownTapTime = 0;
          } else {
            this.lastDownTapTime = now;
            if (!this.input.isWalkMode()) ascend = -1;
          }
        }
        if (action === 'attack') this.input.setTouchAttack(true);
        if (action === 'inv' || action === 'craft') this.input.state.inventoryPressed = true;
        if (action === 'vehicle') this.input.state.vehicleToggle = true;
        if (action === 'eat') this.input.state.eatPressed = true;
        this.input.setTouchAscend(ascend);
      });
      btn.addEventListener('pointerup', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'up' || action === 'down') {
          ascend = 0;
          this.input.setTouchAscend(ascend);
        }
        if (action === 'attack') this.input.setTouchAttack(false);
      });
      btn.addEventListener('pointercancel', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'attack') this.input.setTouchAttack(false);
      });
    });
  }

  setActive(active: boolean): void {
    this.element.classList.toggle('inactive', !active);
  }
}
