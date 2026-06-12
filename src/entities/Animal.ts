import * as THREE from 'three';
import { WATER_LEVEL, BiomeType } from '../world/Biome';
import { canAnimalExistAt } from './AnimalTypes';
import type { AnimalTypeConfig } from './AnimalTypes';
import { createAnimalMesh } from './AnimalMeshes';

export interface AnimalWorldContext {
  getHeight: (x: number, z: number) => number;
  getBiome: (x: number, z: number) => BiomeType;
}

export class Animal {
  readonly config: AnimalTypeConfig;
  readonly mesh: THREE.Group;
  readonly id: string;

  hp: number;
  position: THREE.Vector3;
  wanderTarget: THREE.Vector3;
  wanderTimer = 0;
  hitFlashTimer = 0;
  dead = false;

  private fleeTimer = 0;
  private aggroTimer = 0;
  private attackCooldown = 0;

  private static nextId = 0;

  constructor(config: AnimalTypeConfig, position: THREE.Vector3) {
    this.id = `animal-${Animal.nextId++}`;
    this.config = config;
    this.position = position.clone();
    this.hp = config.hp;
    this.wanderTarget = position.clone();
    this.mesh = Animal.createMesh(config);
    this.mesh.position.copy(position);
  }

  takeDamage(amount: number): boolean {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlashTimer = 0.15;

    if (this.config.behavior === 'aggressive') {
      this.aggroTimer = 10;
    } else {
      this.fleeTimer = 4;
    }

    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt: number, world: AnimalWorldContext, playerPos: THREE.Vector3, peacefulMode: boolean): number {
    if (this.dead) return 0;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.fleeTimer = Math.max(0, this.fleeTimer - dt);
    this.aggroTimer = Math.max(0, this.aggroTimer - dt);

    const currentBiome = world.getBiome(this.position.x, this.position.z);
    if (!canAnimalExistAt(this.config, currentBiome)) {
      this.pickWanderTarget(world, 8);
      this.wanderTimer = 0.5;
    }

    const toPlayer = playerPos.clone().sub(this.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();
    let damageToPlayer = 0;

    if (
      !peacefulMode
      && this.config.behavior === 'aggressive'
      && distToPlayer < (this.config.aggroRange ?? 22) * 0.45
    ) {
      this.aggroTimer = Math.max(this.aggroTimer, 6);
    }

    if (
      !peacefulMode
      && this.config.behavior === 'aggressive'
      && this.aggroTimer > 0
      && distToPlayer < (this.config.aggroRange ?? 22)
    ) {
      if (distToPlayer > 2.2) {
        toPlayer.normalize();
        this.moveInDirection(toPlayer, this.config.speed * 1.35, dt, world);
      } else if (this.attackCooldown <= 0) {
        this.attackCooldown = 1.2;
        damageToPlayer = this.config.attackDamage ?? 10;
        this.hitFlashTimer = 0.1;
      }
    } else if (this.fleeTimer > 0 && distToPlayer > 0.1) {
      toPlayer.normalize().multiplyScalar(-1);
      this.moveInDirection(toPlayer, this.config.speed * 1.8, dt, world);
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.pickWanderTarget(world);
        this.wanderTimer = 2 + Math.random() * 3;
      }

      const dir = this.wanderTarget.clone().sub(this.position);
      dir.y = 0;
      if (dir.length() > 0.5) {
        dir.normalize();
        this.moveInDirection(dir, this.config.speed, dt, world);
      }
    }

    const groundY = world.getHeight(this.position.x, this.position.z);
    const bob = Math.sin(Date.now() * 0.002 + this.position.x) * 0.3;

    switch (this.config.movement) {
      case 'fly':
        this.position.y = groundY + 3 + bob * 0.5;
        break;
      case 'swim':
        this.position.y = WATER_LEVEL - 0.8 + bob * 0.4;
        break;
      default:
        this.position.y = groundY + 0.5 * this.config.scale;
        break;
    }

    this.mesh.position.copy(this.position);

    const toTarget = this.wanderTarget.clone().sub(this.position);
    toTarget.y = 0;
    const moving = this.fleeTimer > 0 || this.aggroTimer > 0 || toTarget.length() > 0.5;
    if (moving && this.config.movement === 'ground') {
      const stride = Math.sin(Date.now() * 0.014 + this.position.x) * 0.04;
      this.mesh.rotation.x = stride;
      this.mesh.rotation.z = Math.sin(Date.now() * 0.01 + this.position.z) * 0.02;
    } else if (this.config.movement === 'fly') {
      this.mesh.rotation.x = Math.sin(Date.now() * 0.003) * 0.08;
      this.mesh.rotation.z = Math.cos(Date.now() * 0.0025) * 0.12;
    } else if (this.config.movement === 'swim') {
      this.mesh.rotation.x = Math.sin(Date.now() * 0.009) * 0.05;
    } else {
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, Math.min(1, dt * 8));
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, Math.min(1, dt * 8));
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.setEmissive(0xff4444);
    } else {
      this.setEmissive(0x000000);
    }

    return damageToPlayer;
  }

  private moveInDirection(
    dir: THREE.Vector3,
    speed: number,
    dt: number,
    world: AnimalWorldContext,
  ): void {
    const nextX = this.position.x + dir.x * speed * dt;
    const nextZ = this.position.z + dir.z * speed * dt;
    const nextBiome = world.getBiome(nextX, nextZ);
    if (canAnimalExistAt(this.config, nextBiome)) {
      this.position.x = nextX;
      this.position.z = nextZ;
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    } else {
      this.pickWanderTarget(world, 4);
      this.wanderTimer = 1;
    }
  }

  private pickWanderTarget(world: AnimalWorldContext, maxAttempts = 12): void {
    for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 8;
      const x = this.position.x + Math.cos(angle) * dist;
      const z = this.position.z + Math.sin(angle) * dist;
      const biome = world.getBiome(x, z);
      if (canAnimalExistAt(this.config, biome)) {
        this.wanderTarget.set(x, 0, z);
        return;
      }
    }
    this.wanderTarget.copy(this.position);
  }

  private setEmissive(hex: number): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
          if ('emissive' in material && material.emissive instanceof THREE.Color) {
            material.emissive.setHex(hex);
          }
        }
      }
    });
  }

  private static createMesh(config: AnimalTypeConfig): THREE.Group {
    return createAnimalMesh(config);
  }
}
