import * as THREE from 'three';

export interface InputState {
  move: THREE.Vector2;
  look: THREE.Vector2;
  ascend: number;
  attack: boolean;
  attackPressed: boolean;
  boost: boolean;
  inventory: boolean;
  inventoryPressed: boolean;
  craft: boolean;
  craftPressed: boolean;
  eat: boolean;
  eatPressed: boolean;
  pause: boolean;
  walkModeToggle: boolean;
  vehicleToggle: boolean;
}

export class InputManager {
  readonly state: InputState = {
    move: new THREE.Vector2(),
    look: new THREE.Vector2(),
    ascend: 0,
    attack: false,
    attackPressed: false,
    boost: false,
    inventory: false,
    inventoryPressed: false,
    craft: false,
    craftPressed: false,
    eat: false,
    eatPressed: false,
    pause: false,
    walkModeToggle: false,
    vehicleToggle: false,
  };

  private keys = new Set<string>();
  private pointerLocked = false;
  private isTouch: boolean;
  private uiBlocking = false;
  private walkMode = false;
  private lastDescendTapTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.keys.clear());

    if (!this.isTouch) {
      canvas.addEventListener('click', () => {
        if (!this.pointerLocked) canvas.requestPointerLock();
      });
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 && this.pointerLocked && !this.uiBlocking) {
          this.state.attackPressed = true;
          this.state.attack = true;
        }
      });
      canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.state.attack = false;
      });
      document.addEventListener('pointerlockchange', () => {
        this.pointerLocked = document.pointerLockElement === canvas;
      });
      document.addEventListener('mousemove', (e) => {
        if (!this.pointerLocked) return;
        this.state.look.x += e.movementX;
        this.state.look.y += e.movementY;
      });
    }
  }

  setUiBlocking(blocking: boolean): void {
    this.uiBlocking = blocking;
  }

  setWalkMode(walking: boolean): void {
    this.walkMode = walking;
  }

  isWalkMode(): boolean {
    return this.walkMode;
  }

  requestWalkModeToggle(): void {
    this.state.walkModeToggle = true;
  }

  get touchMode(): boolean {
    return this.isTouch;
  }

  setTouchMove(x: number, y: number): void {
    this.state.move.set(x, y);
  }

  setTouchLook(dx: number, dy: number): void {
    this.state.look.x += dx;
    this.state.look.y += dy;
  }

  setTouchAscend(value: number): void {
    this.state.ascend = value;
  }

  private pendingTouchTap: { x: number; y: number } | null = null;

  setTouchTap(x: number, y: number): void {
    this.pendingTouchTap = { x, y };
  }

  consumeTouchTap(): { x: number; y: number } | null {
    const tap = this.pendingTouchTap;
    this.pendingTouchTap = null;
    return tap;
  }

  setTouchAttack(pressed: boolean): void {
    if (pressed && !this.state.attack) this.state.attackPressed = true;
    this.state.attack = pressed;
  }

  endFrame(): void {
    this.state.attackPressed = false;
    this.state.inventoryPressed = false;
    this.state.craftPressed = false;
    this.state.eatPressed = false;
    this.state.walkModeToggle = false;
    this.state.vehicleToggle = false;
    this.state.look.set(0, 0);
  }

  private registerDescendTap(): void {
    const now = performance.now();
    if (now - this.lastDescendTapTime < 350) {
      this.state.walkModeToggle = true;
      this.lastDescendTapTime = 0;
    } else {
      this.lastDescendTapTime = now;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
    if (e.code === 'KeyE') this.state.eatPressed = true;
    if (e.code === 'Tab') {
      e.preventDefault();
      this.state.inventoryPressed = true;
    }
    if (e.code === 'KeyC') this.state.craftPressed = true;
    if (e.code === 'KeyV') this.state.vehicleToggle = true;
    if (e.code === 'Escape') this.state.pause = !this.state.pause;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      this.registerDescendTap();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  update(): void {
    const s = this.state;
    if (!this.isTouch) {
      s.move.set(0, 0);
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) s.move.y += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) s.move.y -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) s.move.x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) s.move.x += 1;
      if (s.move.lengthSq() > 0) s.move.normalize();

      s.ascend = 0;
      if (!this.walkMode) {
        if (this.keys.has('Space')) s.ascend += 1;
        if (this.keys.has('ControlLeft') || this.keys.has('ControlRight')) s.ascend -= 1;
      }

      s.boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      if (this.keys.has('KeyF') && !s.attack) s.attackPressed = true;
      s.attack = s.attack || this.keys.has('KeyF');
    }

    s.eat = this.keys.has('KeyE');
    s.inventory = this.keys.has('Tab');
    s.craft = this.keys.has('KeyC');
  }
}
