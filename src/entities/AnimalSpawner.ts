import * as THREE from 'three';
import { Animal } from './Animal';
import { getAnimalTypesForBiome, canAnimalExistAt } from './AnimalTypes';
import type { WorldGenerator } from '../world/WorldGenerator';

const MAX_ANIMALS = 36;
const SPAWN_RADIUS = 40;
const DESPAWN_RADIUS = 80;
const ANIMALS_PER_BIOME_PATCH = 3;

export class AnimalSpawner {
  readonly scene: THREE.Scene;
  private readonly animals: Animal[] = [];
  private spawnTimer = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  getAnimals(): Animal[] {
    return this.animals;
  }

  getAliveAnimals(): Animal[] {
    return this.animals.filter((a) => !a.dead);
  }

  removeAnimal(animal: Animal): void {
    const idx = this.animals.indexOf(animal);
    if (idx >= 0) {
      this.animals.splice(idx, 1);
      this.scene.remove(animal.mesh);
    }
  }

  update(dt: number, playerPos: THREE.Vector3, world: WorldGenerator): number {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.getAliveAnimals().length < MAX_ANIMALS) {
      this.trySpawn(playerPos, world);
      this.spawnTimer = 1.5;
    }

    const worldCtx = {
      getHeight: (x: number, z: number) => world.getHeightAt(x, z),
      getBiome: (x: number, z: number) => world.getBiomeAt(x, z),
    };

    let playerDamage = 0;
    for (const animal of [...this.animals]) {
      if (animal.dead) continue;

      playerDamage += animal.update(dt, worldCtx, playerPos);

      const dist = animal.position.distanceTo(playerPos);
      if (dist > DESPAWN_RADIUS) {
        this.removeAnimal(animal);
      }
    }
    return playerDamage;
  }

  private trySpawn(playerPos: THREE.Vector3, world: WorldGenerator): void {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * SPAWN_RADIUS;
      const x = playerPos.x + Math.cos(angle) * dist;
      const z = playerPos.z + Math.sin(angle) * dist;
      const biome = world.getBiomeAt(x, z);
      const types = getAnimalTypesForBiome(biome);
      if (types.length === 0) continue;

      const nearby = this.getAliveAnimals().filter(
        (a) => a.position.distanceTo(new THREE.Vector3(x, 0, z)) < 12,
      ).length;
      if (nearby >= ANIMALS_PER_BIOME_PATCH) continue;

      const config = types[Math.floor(Math.random() * types.length)]!;
      if (!canAnimalExistAt(config, biome)) continue;

      const y = world.getHeightAt(x, z);
      const animal = new Animal(config, new THREE.Vector3(x, y, z));
      this.animals.push(animal);
      this.scene.add(animal.mesh);
      return;
    }
  }
}
