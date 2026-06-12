export enum BiomeType {
  Desert = 'desert',
  Forest = 'forest',
  Tundra = 'tundra',
  Ocean = 'ocean',
  Swamp = 'swamp',
}

export const WATER_LEVEL = 1.8;

export interface BiomeConfig {
  type: BiomeType;
  displayName: string;
  groundColor: number;
  groundColorAlt: number;
  propColor: number;
  baseHeight: number;
  heightVariation: number;
}

export const BIOMES: Record<BiomeType, BiomeConfig> = {
  [BiomeType.Desert]: {
    type: BiomeType.Desert,
    displayName: 'Desert',
    groundColor: 0xd4a574,
    groundColorAlt: 0xc9956a,
    propColor: 0x2e7d32,
    baseHeight: 2,
    heightVariation: 8,
  },
  [BiomeType.Forest]: {
    type: BiomeType.Forest,
    displayName: 'Forest',
    groundColor: 0x4caf50,
    groundColorAlt: 0x388e3c,
    propColor: 0x5d4037,
    baseHeight: 6,
    heightVariation: 14,
  },
  [BiomeType.Tundra]: {
    type: BiomeType.Tundra,
    displayName: 'Tundra',
    groundColor: 0xeceff1,
    groundColorAlt: 0xb0bec5,
    propColor: 0x37474f,
    baseHeight: 4,
    heightVariation: 10,
  },
  [BiomeType.Ocean]: {
    type: BiomeType.Ocean,
    displayName: 'Ocean',
    groundColor: 0xc2b280,
    groundColorAlt: 0xa89968,
    propColor: 0xff7043,
    baseHeight: -3,
    heightVariation: 2,
  },
  [BiomeType.Swamp]: {
    type: BiomeType.Swamp,
    displayName: 'Swamp',
    groundColor: 0x558b2f,
    groundColorAlt: 0x33691e,
    propColor: 0x4e342e,
    baseHeight: 0,
    heightVariation: 3,
  },
};

export function biomeFromClimate(temperature: number, moisture: number): BiomeType {
  if (moisture > 0.35) return BiomeType.Ocean;
  if (moisture > 0.12 && temperature > -0.15 && temperature < 0.35) return BiomeType.Swamp;
  if (temperature < -0.25) return BiomeType.Tundra;
  if (temperature > 0.25 && moisture < -0.05) return BiomeType.Desert;
  return BiomeType.Forest;
}

export function getBiomeDisplayName(type: BiomeType): string {
  return BIOMES[type].displayName;
}
