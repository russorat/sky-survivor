import * as THREE from 'three';
import type { Animal } from '../entities/Animal';

export interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  traveled: number;
  maxRange: number;
}

export class ProjectileSystem {
  readonly projectiles: Projectile[] = [];
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  fire(origin: THREE.Vector3, direction: THREE.Vector3, damage: number, speed = 50): void {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true }),
    );
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      velocity: direction.clone().normalize().multiplyScalar(speed),
      damage,
      traveled: 0,
      maxRange: 45,
    });
  }

  update(
    dt: number,
    animals: Animal[],
  ): { animal: Animal; killed: boolean }[] {
    const hits: { animal: Animal; killed: boolean }[] = [];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]!;
      const step = proj.velocity.clone().multiplyScalar(dt);
      proj.mesh.position.add(step);
      proj.traveled += step.length();

      let hit = false;
      for (const animal of animals) {
        if (animal.dead) continue;
        const dist = proj.mesh.position.distanceTo(animal.position);
        if (dist > 1.8) continue;
        const killed = animal.takeDamage(proj.damage);
        hits.push({ animal, killed });
        hit = true;
        break;
      }

      if (hit || proj.traveled >= proj.maxRange) {
        this.removeProjectile(i);
      }
    }

    return hits;
  }

  private removeProjectile(index: number): void {
    const proj = this.projectiles[index]!;
    this.scene.remove(proj.mesh);
    proj.mesh.geometry.dispose();
    (proj.mesh.material as THREE.Material).dispose();
    this.projectiles.splice(index, 1);
  }
}
