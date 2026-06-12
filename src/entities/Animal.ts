import * as THREE from 'three';
import { WATER_LEVEL, BiomeType } from '../world/Biome';
import { canAnimalExistAt } from './AnimalTypes';
import type { AnimalTypeConfig } from './AnimalTypes';
import { ModelLoader, getModelKeyForAnimal } from '../assets/ModelLoader';

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

  update(dt: number, world: AnimalWorldContext, playerPos: THREE.Vector3): number {
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
      this.config.behavior === 'aggressive'
      && distToPlayer < (this.config.aggroRange ?? 22) * 0.45
    ) {
      this.aggroTimer = Math.max(this.aggroTimer, 6);
    }

    if (
      this.config.behavior === 'aggressive'
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
    const modelKey = getModelKeyForAnimal(config.shape);
    if (modelKey) {
      const modelScale = config.shape === 'bird' ? config.scale * 0.015 : config.scale * 0.012;
      const model = ModelLoader.getInstance().createInstance(modelKey, config.color, modelScale);
      if (model) return model;
    }
    return Animal.createPrimitiveMesh(config);
  }

  private static createPrimitiveMesh(config: AnimalTypeConfig): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: config.color, flatShading: true });

    switch (config.shape) {
      case 'quadruped':
        Animal.addBox(group, mat, 0, 0.6, 0, 1.2, 0.8, 0.6);
        Animal.addBox(group, mat, 0.7, 0.9, 0, 0.5, 0.5, 0.5);
        Animal.addLegs(group, mat);
        break;
      case 'bird':
        Animal.addBox(group, mat, 0, 0.5, 0, 0.8, 0.5, 0.5);
        Animal.addBox(group, mat, -0.5, 0.7, 0, 1.2, 0.1, 0.4);
        Animal.addBox(group, mat, 0.4, 0.7, 0, 0.3, 0.3, 0.3);
        break;
      case 'snake':
        for (let i = 0; i < 5; i++) {
          Animal.addBox(group, mat, -0.8 + i * 0.35, 0.15, 0, 0.35, 0.2, 0.25);
        }
        Animal.addBox(group, mat, 1, 0.25, 0, 0.4, 0.3, 0.3);
        break;
      case 'scorpion':
        Animal.addBox(group, mat, 0, 0.2, 0, 1, 0.3, 0.5);
        Animal.addBox(group, mat, -0.6, 0.5, 0, 0.5, 0.15, 0.15);
        for (let i = 0; i < 4; i++) {
          Animal.addBox(group, mat, -0.3 + i * 0.2, 0.05, 0.2, 0.05, 0.2, 0.05);
          Animal.addBox(group, mat, -0.3 + i * 0.2, 0.05, -0.2, 0.05, 0.2, 0.05);
        }
        break;
      case 'fish':
        Animal.addBox(group, mat, 0, 0, 0, 1.2, 0.4, 0.35);
        Animal.addBox(group, mat, -0.7, 0, 0, 0.4, 0.5, 0.08);
        Animal.addBox(group, mat, 0.65, 0.1, 0, 0.2, 0.2, 0.2);
        break;
      case 'crab':
        Animal.addBox(group, mat, 0, 0.15, 0, 0.9, 0.25, 0.7);
        for (const [x, z] of [[-0.5, 0.4], [0.5, 0.4], [-0.5, -0.4], [0.5, -0.4]] as [number, number][]) {
          Animal.addBox(group, mat, x, 0.05, z, 0.12, 0.15, 0.12);
        }
        Animal.addBox(group, mat, 0.5, 0.25, 0.35, 0.35, 0.08, 0.08);
        Animal.addBox(group, mat, 0.5, 0.25, -0.35, 0.35, 0.08, 0.08);
        break;
      case 'amphibian':
        Animal.addBox(group, mat, 0, 0.15, 0, 0.7, 0.25, 0.6);
        Animal.addBox(group, mat, 0.35, 0.25, 0, 0.3, 0.25, 0.3);
        for (const x of [-0.25, 0.25]) {
          Animal.addBox(group, mat, x, 0.05, 0.25, 0.15, 0.1, 0.15);
          Animal.addBox(group, mat, x, 0.05, -0.25, 0.15, 0.1, 0.15);
        }
        break;
    }

    group.scale.setScalar(config.scale);
    return group;
  }

  private static addBox(
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

  private static addLegs(group: THREE.Group, mat: THREE.Material): void {
    const positions: [number, number][] = [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.4], [0.3, -0.4]];
    for (const [x, z] of positions) {
      Animal.addBox(group, mat, x, 0.2, z, 0.15, 0.4, 0.15);
    }
  }
}
