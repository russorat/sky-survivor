import * as THREE from 'three';
import { SimplexNoise } from '../utils/SimplexNoise';
import { BIOMES, BiomeType, WATER_LEVEL } from './Biome';
import { BiomeSampler } from './BiomeSampler';
import { tagHarvestable } from './Harvestable';

export const CHUNK_SIZE = 64;
export const CHUNK_RESOLUTION = 32;

export class TerrainChunk {
  readonly key: string;
  readonly mesh: THREE.Group;
  private readonly cx: number;
  private readonly cz: number;
  private readonly sampler: BiomeSampler;

  constructor(cx: number, cz: number, noise: SimplexNoise) {
    this.cx = cx;
    this.cz = cz;
    this.key = `${cx},${cz}`;
    this.sampler = new BiomeSampler(noise);
    this.mesh = new THREE.Group();
    this.mesh.name = `chunk-${this.key}`;
    this.build();
  }

  getBiomeAt(worldX: number, worldZ: number): BiomeType {
    return this.sampler.getBiomeAt(worldX, worldZ);
  }

  sampleHeight(worldX: number, worldZ: number): number {
    return this.sampler.sampleHeight(worldX, worldZ);
  }

  private build(): void {
    const originX = this.cx * CHUNK_SIZE;
    const originZ = this.cz * CHUNK_SIZE;
    const step = CHUNK_SIZE / CHUNK_RESOLUTION;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const colorA = new THREE.Color();
    const colorB = new THREE.Color();
    let hasOcean = false;
    let hasSwamp = false;

    for (let z = 0; z <= CHUNK_RESOLUTION; z++) {
      for (let x = 0; x <= CHUNK_RESOLUTION; x++) {
        const worldX = originX + x * step;
        const worldZ = originZ + z * step;
        const height = this.sampleHeight(worldX, worldZ);
        const biome = this.getBiomeAt(worldX, worldZ);
        const config = BIOMES[biome];

        if (biome === BiomeType.Ocean) hasOcean = true;
        if (biome === BiomeType.Swamp) hasSwamp = true;

        positions.push(worldX, height, worldZ);

        const blend = (Math.sin(worldX * 0.1) + Math.cos(worldZ * 0.13)) * 0.5 + 0.5;
        colorA.setHex(config.groundColor);
        colorB.setHex(config.groundColorAlt);
        const c = colorA.clone().lerp(colorB, blend);
        colors.push(c.r, c.g, c.b);
      }
    }

    const vertsPerRow = CHUNK_RESOLUTION + 1;
    for (let z = 0; z < CHUNK_RESOLUTION; z++) {
      for (let x = 0; x < CHUNK_RESOLUTION; x++) {
        const a = z * vertsPerRow + x;
        const b = a + 1;
        const c = a + vertsPerRow;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    this.mesh.add(terrain);

    if (hasOcean || hasSwamp) {
      this.addWaterPlane(originX, originZ);
    }

    this.scatterProps(originX, originZ, step);
  }

  private addWaterPlane(originX: number, originZ: number): void {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
      new THREE.MeshLambertMaterial({
        color: 0x0288d1,
        transparent: true,
        opacity: 0.55,
        flatShading: true,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(originX + CHUNK_SIZE / 2, WATER_LEVEL, originZ + CHUNK_SIZE / 2);
    this.mesh.add(water);
  }

  private scatterProps(originX: number, originZ: number, step: number): void {
    const noise = new SimplexNoise(this.cx * 1000 + this.cz);

    for (let z = 0; z < CHUNK_RESOLUTION; z += 2) {
      for (let x = 0; x < CHUNK_RESOLUTION; x += 2) {
        const worldX = originX + x * step + step;
        const worldZ = originZ + z * step + step;
        const propNoise = noise.noise2D(worldX * 0.05, worldZ * 0.05);
        if (propNoise < 0.35) continue;

        const biome = this.getBiomeAt(worldX, worldZ);
        const height = this.sampleHeight(worldX, worldZ);
        const prop = this.createPropForBiome(biome);
        if (!prop) continue;

        const surfaceY = prop.userData.waterSurface ? WATER_LEVEL : height;
        prop.position.set(worldX, surfaceY, worldZ);
        prop.rotation.y = propNoise * Math.PI;
        this.mesh.add(prop);
      }
    }
  }

  private createPropForBiome(biome: BiomeType): THREE.Group | null {
    switch (biome) {
      case BiomeType.Desert:
        return propNoisePick() ? this.createCactus() : this.createRock(0xb8956f);
      case BiomeType.Forest:
        return propNoisePick() ? this.createTree(0x2e7d32) : this.createRock(0x757575);
      case BiomeType.Tundra:
        return propNoisePick() ? this.createSnowRock() : this.createTree(0x1b5e20);
      case BiomeType.Ocean:
        return propNoisePick() ? this.createCoral() : this.createDriftwood();
      case BiomeType.Swamp:
        return propNoisePick() ? this.createDeadTree() : this.createLilyPad();
      default:
        return null;
    }
  }

  private createCactus(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 2.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true }),
    );
    body.position.y = 1.25;
    group.add(body);
    return group;
  }

  private createTree(canopyColor: number): THREE.Group {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 2, 6),
      new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true }),
    );
    trunk.position.y = 1;
    group.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 3, 6),
      new THREE.MeshLambertMaterial({ color: canopyColor, flatShading: true }),
    );
    canopy.position.y = 3;
    group.add(canopy);
    tagHarvestable(group, 'tree');
    return group;
  }

  private createRock(color: number): THREE.Group {
    const group = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.MeshLambertMaterial({ color, flatShading: true }),
    );
    rock.position.y = 0.45;
    rock.castShadow = true;
    group.add(rock);
    tagHarvestable(group, 'rock');
    return group;
  }

  private createSnowRock(): THREE.Group {
    const group = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.8, 0),
      new THREE.MeshLambertMaterial({ color: 0x90a4ae, flatShading: true }),
    );
    rock.position.y = 0.5;
    group.add(rock);
    tagHarvestable(group, 'rock');
    return group;
  }

  private createCoral(): THREE.Group {
    const group = new THREE.Group();
    const coral = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.2, 5),
      new THREE.MeshLambertMaterial({ color: 0xff7043, flatShading: true }),
    );
    coral.position.y = 0.6;
    group.add(coral);
    return group;
  }

  private createDriftwood(): THREE.Group {
    const group = new THREE.Group();
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 2, 5),
      new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true }),
    );
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.2;
    group.add(log);
    tagHarvestable(group, 'tree');
    return group;
  }

  private createDeadTree(): THREE.Group {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2.5, 5),
      new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true }),
    );
    trunk.position.y = 1.25;
    group.add(trunk);

    const branch = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.12, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true }),
    );
    branch.position.set(0.4, 2, 0);
    group.add(branch);
    tagHarvestable(group, 'tree');
    return group;
  }

  private createLilyPad(): THREE.Group {
    const group = new THREE.Group();
    group.userData.waterSurface = true;
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.08, 8),
      new THREE.MeshLambertMaterial({ color: 0x33691e, flatShading: true }),
    );
    pad.position.y = 0.05;
    group.add(pad);
    return group;
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}

function propNoisePick(): boolean {
  return Math.random() > 0.5;
}

export function worldToChunkCoord(value: number): number {
  return Math.floor(value / CHUNK_SIZE);
}
