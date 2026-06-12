import * as THREE from 'three';
import { SimplexNoise } from '../utils/SimplexNoise';
import { TerrainChunk, worldToChunkCoord, CHUNK_SIZE } from './TerrainChunk';
import { BiomeType } from './Biome';
import { collectHarvestables } from './Harvestable';

const LOAD_RADIUS = 3;

export class WorldGenerator {
  readonly scene: THREE.Scene;
  private readonly noise = new SimplexNoise(42);
  private readonly chunks = new Map<string, TerrainChunk>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(playerPosition: THREE.Vector3): void {
    const pcx = worldToChunkCoord(playerPosition.x);
    const pcz = worldToChunkCoord(playerPosition.z);
    const needed = new Set<string>();

    for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
      for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        needed.add(`${pcx + dx},${pcz + dz}`);
      }
    }

    for (const key of this.chunks.keys()) {
      if (!needed.has(key)) {
        const chunk = this.chunks.get(key)!;
        this.scene.remove(chunk.mesh);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }

    for (const key of needed) {
      if (this.chunks.has(key)) continue;
      const [cx, cz] = key.split(',').map(Number);
      const chunk = new TerrainChunk(cx, cz, this.noise);
      this.chunks.set(key, chunk);
      this.scene.add(chunk.mesh);
    }
  }

  getHeightAt(x: number, z: number): number {
    const cx = worldToChunkCoord(x);
    const cz = worldToChunkCoord(z);
    const key = `${cx},${cz}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new TerrainChunk(cx, cz, this.noise);
      this.chunks.set(key, chunk);
      this.scene.add(chunk.mesh);
    }
    return chunk.sampleHeight(x, z);
  }

  getBiomeAt(x: number, z: number): BiomeType {
    const cx = worldToChunkCoord(x);
    const cz = worldToChunkCoord(z);
    const key = `${cx},${cz}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new TerrainChunk(cx, cz, this.noise);
      this.chunks.set(key, chunk);
      this.scene.add(chunk.mesh);
    }
    return chunk.getBiomeAt(x, z);
  }

  getHarvestables(): THREE.Object3D[] {
    const harvestables: THREE.Object3D[] = [];
    for (const chunk of this.chunks.values()) {
      harvestables.push(...collectHarvestables(chunk.mesh));
    }
    return harvestables;
  }

  getSpawnPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, this.getHeightAt(0, 0) + 8, 0);
  }
}

export { CHUNK_SIZE };
