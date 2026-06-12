import * as THREE from 'three';
import { WATER_LEVEL, BiomeType } from '../world/Biome';
import { canAnimalExistAt } from './AnimalTypes';
import type { AnimalTypeConfig } from './AnimalTypes';

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

  private static nextId = 0;

  constructor(config: AnimalTypeConfig, position: THREE.Vector3) {
    this.id = `animal-${Animal.nextId++}`;
    this.config = config;
    this.position = position.clone();
    this.hp = config.hp;
    this.wanderTarget = position.clone();
    this.mesh = this.createMesh(config);
    this.mesh.position.copy(position);
  }

  takeDamage(amount: number): boolean {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlashTimer = 0.15;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt: number, world: AnimalWorldContext): void {
    if (this.dead) return;

    const currentBiome = world.getBiome(this.position.x, this.position.z);
    if (!canAnimalExistAt(this.config, currentBiome)) {
      this.pickWanderTarget(world, 8);
      this.wanderTimer = 0.5;
    }

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.pickWanderTarget(world);
      this.wanderTimer = 2 + Math.random() * 3;
    }

    const dir = this.wanderTarget.clone().sub(this.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist > 0.5) {
      dir.normalize();
      const nextX = this.position.x + dir.x * this.config.speed * dt;
      const nextZ = this.position.z + dir.z * this.config.speed * dt;
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

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.setEmissive(0xff4444);
    } else {
      this.setEmissive(0x000000);
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
        (obj.material as THREE.MeshLambertMaterial).emissive.setHex(hex);
      }
    });
  }

  private createMesh(config: AnimalTypeConfig): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: config.color, flatShading: true });

    switch (config.shape) {
      case 'quadruped':
        this.addBox(group, mat, 0, 0.6, 0, 1.2, 0.8, 0.6);
        this.addBox(group, mat, 0.7, 0.9, 0, 0.5, 0.5, 0.5);
        this.addLegs(group, mat);
        break;
      case 'bird':
        this.addBox(group, mat, 0, 0.5, 0, 0.8, 0.5, 0.5);
        this.addBox(group, mat, -0.5, 0.7, 0, 1.2, 0.1, 0.4);
        this.addBox(group, mat, 0.4, 0.7, 0, 0.3, 0.3, 0.3);
        break;
      case 'snake':
        for (let i = 0; i < 5; i++) {
          this.addBox(group, mat, -0.8 + i * 0.35, 0.15, 0, 0.35, 0.2, 0.25);
        }
        this.addBox(group, mat, 1, 0.25, 0, 0.4, 0.3, 0.3);
        break;
      case 'scorpion':
        this.addBox(group, mat, 0, 0.2, 0, 1, 0.3, 0.5);
        this.addBox(group, mat, -0.6, 0.5, 0, 0.5, 0.15, 0.15);
        for (let i = 0; i < 4; i++) {
          this.addBox(group, mat, -0.3 + i * 0.2, 0.05, 0.2, 0.05, 0.2, 0.05);
          this.addBox(group, mat, -0.3 + i * 0.2, 0.05, -0.2, 0.05, 0.2, 0.05);
        }
        break;
      case 'fish':
        this.addBox(group, mat, 0, 0, 0, 1.2, 0.4, 0.35);
        this.addBox(group, mat, -0.7, 0, 0, 0.4, 0.5, 0.08);
        this.addBox(group, mat, 0.65, 0.1, 0, 0.2, 0.2, 0.2);
        break;
      case 'crab':
        this.addBox(group, mat, 0, 0.15, 0, 0.9, 0.25, 0.7);
        for (const [x, z] of [[-0.5, 0.4], [0.5, 0.4], [-0.5, -0.4], [0.5, -0.4]] as [number, number][]) {
          this.addBox(group, mat, x, 0.05, z, 0.12, 0.15, 0.12);
        }
        this.addBox(group, mat, 0.5, 0.25, 0.35, 0.35, 0.08, 0.08);
        this.addBox(group, mat, 0.5, 0.25, -0.35, 0.35, 0.08, 0.08);
        break;
      case 'amphibian':
        this.addBox(group, mat, 0, 0.15, 0, 0.7, 0.25, 0.6);
        this.addBox(group, mat, 0.35, 0.25, 0, 0.3, 0.25, 0.3);
        for (const x of [-0.25, 0.25]) {
          this.addBox(group, mat, x, 0.05, 0.25, 0.15, 0.1, 0.15);
          this.addBox(group, mat, x, 0.05, -0.25, 0.15, 0.1, 0.15);
        }
        break;
    }

    group.scale.setScalar(config.scale);
    return group;
  }

  private addBox(
    group: THREE.Group,
    mat: THREE.Material,
    x: number, y: number, z: number,
    w: number, h: number, d: number,
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
  }

  private addLegs(group: THREE.Group, mat: THREE.Material): void {
    const positions: [number, number][] = [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.4], [0.3, -0.4]];
    for (const [x, z] of positions) {
      this.addBox(group, mat, x, 0.2, z, 0.15, 0.4, 0.15);
    }
  }
}
