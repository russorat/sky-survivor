import * as THREE from 'three';
import type { Animal } from '../entities/Animal';
import type { ItemId } from '../inventory/Inventory';
import { ProjectileSystem } from './ProjectileSystem';
import {
  flashHarvestable,
  getHarvestableData,
  getHarvestableWorldPosition,
  HARVEST_DROPS,
  type HarvestableType,
} from '../world/Harvestable';

export interface LootDrop {
  id: string;
  itemId: ItemId;
  count: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  lifetime: number;
}

export class CombatSystem {
  readonly scene: THREE.Scene;
  readonly lootDrops: LootDrop[] = [];
  readonly projectiles: ProjectileSystem;
  attackCooldown = 0;
  rangedCooldown = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.projectiles = new ProjectileSystem(scene);
  }

  tryRangedAttack(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    damage: number,
  ): boolean {
    if (this.rangedCooldown > 0) return false;
    this.rangedCooldown = 0.65;
    this.projectiles.fire(origin, direction, damage);
    return true;
  }

  updateProjectiles(dt: number, animals: Animal[]): { animal: Animal; killed: boolean }[] {
    return this.projectiles.update(dt, animals);
  }

  tryAttack(
    playerPos: THREE.Vector3,
    forward: THREE.Vector3,
    damage: number,
    animals: Animal[],
  ): Animal | null {
    if (this.attackCooldown > 0) return null;

    let closest: Animal | null = null;
    let closestDist = Infinity;

    for (const animal of animals) {
      if (animal.dead) continue;
      const toAnimal = animal.position.clone().sub(playerPos);
      toAnimal.y = 0;
      const dist = toAnimal.length();
      if (dist > 5) continue;

      toAnimal.normalize();
      const dot = forward.dot(toAnimal);
      if (dot < 0.4) continue;

      if (dist < closestDist) {
        closestDist = dist;
        closest = animal;
      }
    }

    if (closest) {
      this.attackCooldown = 0.4;
      closest.takeDamage(damage);
    }
    return closest;
  }

  tryAttackHarvestable(
    playerPos: THREE.Vector3,
    aimDir: THREE.Vector3,
    damage: number,
    harvestables: THREE.Object3D[],
  ): { type: HarvestableType; position: THREE.Vector3; destroyed: boolean } | null {
    if (this.attackCooldown > 0) return null;

    let closest: THREE.Object3D | null = null;
    let closestDist = Infinity;

    for (const obj of harvestables) {
      const data = getHarvestableData(obj);
      if (!data) continue;

      const objPos = getHarvestableWorldPosition(obj);
      const toObj = objPos.clone().sub(playerPos);
      const dist = toObj.length();
      if (dist > 12) continue;

      toObj.normalize();
      const dot = aimDir.dot(toObj);
      if (dot < 0.45) continue;

      if (dist < closestDist) {
        closestDist = dist;
        closest = obj;
      }
    }

    if (!closest) return null;

    this.attackCooldown = 0.4;
    const data = getHarvestableData(closest)!;
    data.hp -= damage;
    data.hitFlash = 0.12;
    flashHarvestable(closest, true);

    const position = getHarvestableWorldPosition(closest);
    const destroyed = data.hp <= 0;

    if (destroyed) {
      data.depleted = true;
      const drop = HARVEST_DROPS[data.type];
      const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
      this.spawnResourceLoot(drop.itemId, count, position);
      closest.parent?.remove(closest);
    }

    return { type: data.type, position, destroyed };
  }

  updateHarvestableFlashes(dt: number, harvestables: THREE.Object3D[]): void {
    for (const obj of harvestables) {
      const data = getHarvestableData(obj);
      if (!data || data.hitFlash <= 0) continue;
      data.hitFlash -= dt;
      if (data.hitFlash <= 0) flashHarvestable(obj, false);
    }
  }

  spawnResourceLoot(itemId: ItemId, count: number, position: THREE.Vector3): void {
    this.createLootDrop(itemId, count, position);
  }

  spawnLoot(animal: Animal): void {
    const drops: { itemId: ItemId; count: number }[] = [];
    const meatCount =
      animal.config.meatMin +
      Math.floor(Math.random() * (animal.config.meatMax - animal.config.meatMin + 1));
    drops.push({ itemId: 'raw_meat', count: meatCount });

    for (const drop of animal.config.extraDrops) {
      if (drop.chance !== undefined && Math.random() > drop.chance) continue;
      const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
      if (count > 0) drops.push({ itemId: drop.itemId, count });
    }

    for (let i = 0; i < drops.length; i++) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.5, (Math.random() - 0.5) * 1.5);
      const pos = animal.position.clone().add(offset);
      this.createLootDrop(drops[i]!.itemId, drops[i]!.count, pos);
    }
  }

  private createLootDrop(itemId: ItemId, count: number, position: THREE.Vector3): void {
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const color = itemId === 'raw_meat' || itemId === 'cooked_meat' ? 0xe57373 : 0x90caf9;
    const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.lootDrops.push({
      id: `loot-${Date.now()}-${Math.random()}`,
      itemId,
      count,
      position: position.clone(),
      mesh,
      lifetime: 60,
    });
  }

  update(dt: number, playerPos: THREE.Vector3): LootDrop[] {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - dt);
    const collected: LootDrop[] = [];

    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i]!;
      drop.lifetime -= dt;
      drop.mesh.rotation.y += dt * 2;
      drop.mesh.position.y = drop.position.y + Math.sin(Date.now() * 0.003 + i) * 0.05;

      if (drop.position.distanceTo(playerPos) < 2.5) {
        collected.push(drop);
        this.scene.remove(drop.mesh);
        drop.mesh.geometry.dispose();
        (drop.mesh.material as THREE.Material).dispose();
        this.lootDrops.splice(i, 1);
        continue;
      }

      if (drop.lifetime <= 0) {
        this.scene.remove(drop.mesh);
        drop.mesh.geometry.dispose();
        (drop.mesh.material as THREE.Material).dispose();
        this.lootDrops.splice(i, 1);
      }
    }

    return collected;
  }
}
