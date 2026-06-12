import * as THREE from 'three';
import type { InputManager } from '../input/InputManager';
import { FlyingMovement } from './FlyingMovement';
import { GroundMovement } from './GroundMovement';
import { VehicleMovement, createVehicleMesh } from '../vehicles/VehicleMovement';
import { VEHICLES, type VehicleId } from '../vehicles/VehicleTypes';

export type MovementMode = 'fly' | 'walk';

export interface PlayerUpdateResult {
  forward: THREE.Vector3;
  modeToggled?: MovementMode;
  fuelUsed: number;
}

export class PlayerController {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3();
  readonly flying = new FlyingMovement();
  readonly walking = new GroundMovement();
  readonly vehicleMovement = new VehicleMovement();
  mode: MovementMode = 'fly';
  mountedVehicle: VehicleId | null = null;
  private vehicleMesh: THREE.Group | null = null;
  private characterParts: THREE.Object3D[] = [];
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private walkPhase = 0;
  yaw = 0;
  pitch = 0;

  constructor() {
    this.mesh = this.createMesh();
    this.mesh.children.forEach((child) => this.characterParts.push(child));
  }

  update(
    dt: number,
    input: InputManager,
    getGroundHeight: (x: number, z: number) => number,
    hasFuel: boolean,
  ): PlayerUpdateResult {
    const s = input.state;
    let modeToggled: MovementMode | undefined;
    let fuelUsed = 0;

    if (s.walkModeToggle && !this.mountedVehicle) {
      modeToggled = this.toggleMode(getGroundHeight);
      input.setWalkMode(this.mode === 'walk');
    }

    this.yaw -= s.look.x * 0.002;
    this.pitch = THREE.MathUtils.clamp(this.pitch - s.look.y * 0.002, -0.6, 0.8);

    if (this.mountedVehicle) {
      const config = VEHICLES[this.mountedVehicle];
      fuelUsed = this.vehicleMovement.update(
        dt,
        config,
        s,
        this.yaw,
        getGroundHeight,
        this.position,
        hasFuel,
      );
      this.mode = 'fly';
    } else if (this.mode === 'walk') {
      this.walking.update(dt, s, this.yaw, getGroundHeight, this.position, s.boost);
    } else {
      this.flying.update(dt, s, this.yaw, getGroundHeight, this.position, s.boost);
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
    this.updateWalkAnimation(dt);

    return { forward: this.getForward(), modeToggled, fuelUsed };
  }

  mountVehicle(vehicleId: VehicleId): void {
    if (this.mountedVehicle) this.dismountVehicle();
    this.mountedVehicle = vehicleId;
    this.mode = 'fly';
    this.flying.velocity.set(0, 0, 0);
    this.walking.velocity.set(0, 0, 0);
    this.vehicleMovement.reset();

    this.characterParts.forEach((part) => {
      part.visible = false;
    });

    this.vehicleMesh = createVehicleMesh(vehicleId);
    this.mesh.add(this.vehicleMesh);
  }

  dismountVehicle(): void {
    if (this.vehicleMesh) {
      this.mesh.remove(this.vehicleMesh);
      this.vehicleMesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.vehicleMesh = null;
    }
    this.characterParts.forEach((part) => {
      part.visible = true;
    });
    this.mountedVehicle = null;
    this.vehicleMovement.reset();
  }

  isMounted(): boolean {
    return this.mountedVehicle !== null;
  }

  getMountedVehicleName(): string | null {
    return this.mountedVehicle ? VEHICLES[this.mountedVehicle].name : null;
  }

  getAimDirection(): THREE.Vector3 {
    const cosPitch = Math.cos(this.pitch);
    return new THREE.Vector3(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch,
    ).normalize();
  }

  getAttackOrigin(): THREE.Vector3 {
    const height = this.mountedVehicle ? 1.8 : 1.4;
    return this.position.clone().add(new THREE.Vector3(0, height, 0));
  }

  toggleMode(getGroundHeight: (x: number, z: number) => number): MovementMode {
    this.mode = this.mode === 'fly' ? 'walk' : 'fly';
    if (this.mode === 'walk') {
      const ground = getGroundHeight(this.position.x, this.position.z);
      this.position.y = ground + this.walking.heightOffset;
      this.flying.velocity.set(0, 0, 0);
      this.walking.velocity.set(0, 0, 0);
    } else {
      const ground = getGroundHeight(this.position.x, this.position.z);
      this.position.y = Math.max(this.position.y, ground + this.flying.minAltitude);
      this.walking.velocity.set(0, 0, 0);
    }
    return this.mode;
  }

  getForward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
  }

  getCameraPosition(): THREE.Vector3 {
    if (this.mountedVehicle) {
      const config = VEHICLES[this.mountedVehicle];
      const offset = new THREE.Vector3(
        -Math.sin(this.yaw) * config.cameraDistance,
        config.cameraHeight + this.pitch * 1.5,
        -Math.cos(this.yaw) * config.cameraDistance,
      );
      return this.position.clone().add(offset);
    }

    const isWalk = this.mode === 'walk';
    const distance = isWalk ? 4.5 : 6;
    const height = isWalk ? 2.2 + this.pitch * 0.5 : 3 + this.pitch * 2;
    const offset = new THREE.Vector3(
      -Math.sin(this.yaw) * distance,
      height,
      -Math.cos(this.yaw) * distance,
    );
    return this.position.clone().add(offset);
  }

  getLookTarget(): THREE.Vector3 {
    const look = this.getForward();
    look.y = this.mode === 'walk' && !this.mountedVehicle
      ? 0.5 + Math.sin(this.pitch)
      : Math.sin(this.pitch) * 2;
    return this.position.clone().add(look.multiplyScalar(10));
  }

  resetTo(position: THREE.Vector3): void {
    this.dismountVehicle();
    this.position.copy(position);
    this.mode = 'fly';
    this.flying.velocity.set(0, 0, 0);
    this.walking.velocity.set(0, 0, 0);
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x43a047, flatShading: true });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x212121, flatShading: true });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a574, flatShading: true });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 8), shirtMat);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    this.leftArm = this.createLimb(new THREE.BoxGeometry(0.15, 0.6, 0.15), shirtMat, -0.55, 1.4, 0.6);
    this.rightArm = this.createLimb(new THREE.BoxGeometry(0.15, 0.6, 0.15), shirtMat, 0.55, 1.4, 0.6);
    this.leftLeg = this.createLimb(new THREE.BoxGeometry(0.18, 0.7, 0.18), pantsMat, -0.2, 0.7, 0.7);
    this.rightLeg = this.createLimb(new THREE.BoxGeometry(0.18, 0.7, 0.18), pantsMat, 0.2, 0.7, 0.7);
    group.add(this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);

    return group;
  }

  private createLimb(
    geometry: THREE.BoxGeometry,
    material: THREE.Material,
    pivotX: number,
    pivotY: number,
    length: number,
  ): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(pivotX, pivotY, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  }

  private updateWalkAnimation(dt: number): void {
    const limbs = [this.leftArm, this.rightArm, this.leftLeg, this.rightLeg];

    if (this.mountedVehicle || this.mode !== 'walk') {
      this.walkPhase = 0;
      this.resetLimbRotations(limbs, dt);
      return;
    }

    const speed = this.walking.velocity.length();
    if (speed < 0.25) {
      this.resetLimbRotations(limbs, dt);
      return;
    }

    this.walkPhase += dt * (5 + speed * 0.4);
    const swing = Math.sin(this.walkPhase) * 0.55;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.65;
    this.rightArm.rotation.x = swing * 0.65;
  }

  private resetLimbRotations(limbs: THREE.Group[], dt: number): void {
    const blend = Math.min(1, dt * 12);
    for (const limb of limbs) {
      limb.rotation.x = THREE.MathUtils.lerp(limb.rotation.x, 0, blend);
    }
  }
}
