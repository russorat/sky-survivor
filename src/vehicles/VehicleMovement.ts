import * as THREE from 'three';
import type { VehicleConfig } from './VehicleTypes';

export class VehicleMovement {
  velocity = new THREE.Vector3();
  fuelTimer = 0;

  update(
    dt: number,
    config: VehicleConfig,
    input: { move: THREE.Vector2; ascend: number; boost: boolean },
    yaw: number,
    getGroundHeight: (x: number, z: number) => number,
    position: THREE.Vector3,
    hasFuel: boolean,
  ): number {
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, input.move.y);
    wishDir.addScaledVector(right, -input.move.x);
    if (wishDir.lengthSq() > 0) wishDir.normalize();

    const canBoost = config.canBoost && input.boost && hasFuel;
    const speed = canBoost ? config.boostSpeed : config.maxSpeed;
    const targetVel = wishDir.multiplyScalar(speed);

    let vertical = input.ascend * speed * config.ascendPower;
    if (config.sinkRate > 0 && input.ascend <= 0) {
      vertical -= config.sinkRate;
    }
    targetVel.y = vertical;

    if (config.usesFuel && !hasFuel) {
      targetVel.multiplyScalar(0.45);
      targetVel.y = Math.min(targetVel.y, config.sinkRate > 0 ? -config.sinkRate : 0);
    }

    this.velocity.lerp(targetVel, Math.min(1, dt * 5));
    position.addScaledVector(this.velocity, dt);

    const ground = getGroundHeight(position.x, position.z);
    position.y = THREE.MathUtils.clamp(position.y, ground + config.minAltitude, config.maxAltitude);

    let fuelUsed = 0;
    if (config.usesFuel && hasFuel && (input.boost || input.ascend > 0 || input.move.lengthSq() > 0)) {
      this.fuelTimer += dt;
      if (this.fuelTimer >= 1 / config.fuelRate) {
        this.fuelTimer = 0;
        fuelUsed = 1;
      }
    }

    return fuelUsed;
  }

  reset(): void {
    this.velocity.set(0, 0, 0);
    this.fuelTimer = 0;
  }
}

export function createVehicleMesh(id: string): THREE.Group {
  const group = new THREE.Group();

  switch (id) {
    case 'glider': {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.08, 0.8),
        new THREE.MeshLambertMaterial({ color: 0xffeb3b, flatShading: true }),
      );
      wing.position.y = 1.2;
      group.add(wing);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 1.2),
        new THREE.MeshLambertMaterial({ color: 0x795548, flatShading: true }),
      );
      body.position.set(0, 1, 0);
      group.add(body);
      break;
    }
    case 'plane': {
      const fuselage = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 2.5),
        new THREE.MeshLambertMaterial({ color: 0xeceff1, flatShading: true }),
      );
      fuselage.position.y = 1;
      group.add(fuselage);
      const wings = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.1, 0.7),
        new THREE.MeshLambertMaterial({ color: 0x90caf9, flatShading: true }),
      );
      wings.position.y = 1;
      group.add(wings);
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.6, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x90caf9, flatShading: true }),
      );
      tail.position.set(0, 1.4, -1.1);
      group.add(tail);
      break;
    }
    case 'rocket_ship': {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 2.2, 8),
        new THREE.MeshLambertMaterial({ color: 0xf44336, flatShading: true }),
      );
      body.position.y = 1.1;
      group.add(body);
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.8, 8),
        new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      );
      nose.position.y = 2.5;
      group.add(nose);
      const finMat = new THREE.MeshLambertMaterial({ color: 0x757575, flatShading: true });
      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.4), finMat);
        fin.position.set(side * 0.55, 0.6, -0.5);
        group.add(fin);
      }
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.6, 6),
        new THREE.MeshLambertMaterial({ color: 0xff9800, flatShading: true, emissive: 0xff5722 }),
      );
      flame.rotation.x = Math.PI;
      flame.position.y = 0.1;
      group.add(flame);
      break;
    }
  }

  return group;
}
