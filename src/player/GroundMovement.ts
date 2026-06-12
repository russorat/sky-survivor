import * as THREE from 'three';

export class GroundMovement {
  velocity = new THREE.Vector3();
  readonly maxSpeed = 10;
  readonly sprintSpeed = 15;
  readonly heightOffset = 0;

  update(
    dt: number,
    input: { move: THREE.Vector2 },
    yaw: number,
    getGroundHeight: (x: number, z: number) => number,
    position: THREE.Vector3,
    boosting: boolean,
  ): void {
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, input.move.y);
    wishDir.addScaledVector(right, -input.move.x);
    if (wishDir.lengthSq() > 0) wishDir.normalize();

    const speed = boosting ? this.sprintSpeed : this.maxSpeed;
    const targetVel = wishDir.multiplyScalar(speed);
    targetVel.y = 0;

    this.velocity.lerp(targetVel, Math.min(1, dt * 8));
    position.addScaledVector(this.velocity, dt);

    const ground = getGroundHeight(position.x, position.z);
    position.y = ground + this.heightOffset;
  }
}
