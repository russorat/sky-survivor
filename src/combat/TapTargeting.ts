import * as THREE from 'three';
import type { Animal } from '../entities/Animal';
import { getHarvestableData } from '../world/Harvestable';

export type TapTarget =
  | { kind: 'animal'; animal: Animal; point: THREE.Vector3 }
  | { kind: 'harvestable'; object: THREE.Object3D; point: THREE.Vector3 };

const raycaster = new THREE.Raycaster();

export function pickTapTarget(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  screenX: number,
  screenY: number,
  animals: Animal[],
  harvestables: THREE.Object3D[],
): TapTarget | null {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((screenX - rect.left) / rect.width) * 2 - 1,
    -((screenY - rect.top) / rect.height) * 2 + 1,
  );

  raycaster.setFromCamera(ndc, camera);

  const roots: THREE.Object3D[] = [];
  for (const animal of animals) {
    if (!animal.dead) roots.push(animal.mesh);
  }
  roots.push(...harvestables);

  const hits = raycaster.intersectObjects(roots, true);
  if (hits.length === 0) return null;

  const hit = hits[0]!;
  const animal = findAnimalFromObject(hit.object, animals);
  if (animal) {
    return { kind: 'animal', animal, point: hit.point.clone() };
  }

  const harvestable = findHarvestableFromObject(hit.object);
  if (harvestable) {
    return { kind: 'harvestable', object: harvestable, point: hit.point.clone() };
  }

  return null;
}

function findAnimalFromObject(obj: THREE.Object3D, animals: Animal[]): Animal | null {
  let current: THREE.Object3D | null = obj;
  while (current) {
    for (const animal of animals) {
      if (current === animal.mesh) return animal;
    }
    current = current.parent;
  }
  return null;
}

function findHarvestableFromObject(obj: THREE.Object3D): THREE.Object3D | null {
  let current: THREE.Object3D | null = obj;
  while (current) {
    if (getHarvestableData(current)) return current;
    current = current.parent;
  }
  return null;
}
