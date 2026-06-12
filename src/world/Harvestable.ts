import * as THREE from 'three';
import type { ItemId } from '../inventory/Inventory';

export type HarvestableType = 'tree' | 'rock';

export interface HarvestableData {
  type: HarvestableType;
  hp: number;
  maxHp: number;
  depleted: boolean;
  hitFlash: number;
}

const HARVEST_HP: Record<HarvestableType, number> = {
  tree: 15,
  rock: 18,
};

export const HARVEST_DROPS: Record<HarvestableType, { itemId: ItemId; min: number; max: number }> = {
  tree: { itemId: 'stick', min: 2, max: 4 },
  rock: { itemId: 'stone', min: 2, max: 3 },
};

export function tagHarvestable(group: THREE.Group, type: HarvestableType): void {
  group.userData.harvestable = {
    type,
    hp: HARVEST_HP[type],
    maxHp: HARVEST_HP[type],
    depleted: false,
    hitFlash: 0,
  } satisfies HarvestableData;
}

export function getHarvestableData(obj: THREE.Object3D): HarvestableData | null {
  const data = obj.userData.harvestable as HarvestableData | undefined;
  if (!data || data.depleted) return null;
  return data;
}

export function collectHarvestables(root: THREE.Object3D): THREE.Object3D[] {
  const results: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (getHarvestableData(obj)) results.push(obj);
  });
  return results;
}

export function getHarvestableWorldPosition(obj: THREE.Object3D): THREE.Vector3 {
  const pos = new THREE.Vector3();
  obj.getWorldPosition(pos);
  return pos;
}

export function flashHarvestable(obj: THREE.Object3D, active: boolean): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
      child.material.emissive.setHex(active ? 0x444444 : 0x000000);
    }
  });
}
