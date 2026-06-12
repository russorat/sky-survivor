export class HungerSystem {
  hunger = 100;
  maxHunger = 100;
  drainRate = 0.1; // per second (~17 min to empty)

  update(dt: number): void {
    this.hunger = Math.max(0, this.hunger - this.drainRate * dt);
  }

  eat(amount: number): void {
    this.hunger = Math.min(this.maxHunger, this.hunger + amount);
  }

  isStarving(): boolean {
    return this.hunger <= 0;
  }

  resetPartial(): void {
    this.hunger = 25;
  }

  toJSON(): number {
    return this.hunger;
  }

  load(value: number): void {
    this.hunger = value;
  }
}

export class HealthSystem {
  health = 100;
  maxHealth = 100;
  starveDamageRate = 5; // per second when starving

  update(dt: number, starving: boolean): boolean {
    if (starving) {
      this.health -= this.starveDamageRate * dt;
    }
    if (this.health <= 0) {
      this.health = 0;
      return true;
    }
    return false;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  resetPartial(): void {
    this.health = 50;
  }

  toJSON(): number {
    return this.health;
  }

  load(value: number): void {
    this.health = value;
  }
}
