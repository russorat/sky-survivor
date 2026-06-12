import { SimplexNoise } from '../utils/SimplexNoise';
import { biomeFromClimate, BIOMES, BiomeType, WATER_LEVEL } from './Biome';

export class BiomeSampler {
  private readonly noise: SimplexNoise;

  constructor(noise: SimplexNoise) {
    this.noise = noise;
  }

  getClimate(worldX: number, worldZ: number): { temperature: number; moisture: number } {
    return {
      temperature: this.noise.fbm2D(worldX * 0.003, worldZ * 0.003, 3),
      moisture: this.noise.fbm2D(worldX * 0.003 + 50, worldZ * 0.003 + 50, 3),
    };
  }

  getBiomeAt(worldX: number, worldZ: number): BiomeType {
    const { temperature, moisture } = this.getClimate(worldX, worldZ);
    return biomeFromClimate(temperature, moisture);
  }

  sampleHeight(worldX: number, worldZ: number): number {
    const biome = this.getBiomeAt(worldX, worldZ);
    const config = BIOMES[biome];
    const heightNoise = this.noise.fbm2D(worldX * 0.008, worldZ * 0.008, 4);
    let height = config.baseHeight + heightNoise * config.heightVariation;

    if (biome === BiomeType.Ocean) {
      height = Math.min(height, WATER_LEVEL - 0.5);
    }
    if (biome === BiomeType.Swamp) {
      height = Math.min(height + 0.5, WATER_LEVEL - 0.2);
    }

    return height;
  }
}
