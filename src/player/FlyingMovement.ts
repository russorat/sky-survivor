import * as THREE from 'three';

export class FlyingMovement {
  velocity = new THREE.Vector3();
  readonly maxSpeed = 18;
  readonly boostSpeed = 28;
  readonly minAltitude = 2;
  readonly maxAltitude = 80;

  update(
    dt: number,
    input: { move: THREE.Vector2; ascend: number; look: THREE.Vector2 },
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

    const speed = boosting ? this.boostSpeed : this.maxSpeed;
    const targetVel = wishDir.multiplyScalar(speed);
    targetVel.y = input.ascend * speed * 0.6;

    this.velocity.lerp(targetVel, Math.min(1, dt * 6));
    position.addScaledVector(this.velocity, dt);

    const ground = getGroundHeight(position.x, position.z);
    position.y = THREE.MathUtils.clamp(position.y, ground + this.minAltitude, this.maxAltitude);
  }
}
