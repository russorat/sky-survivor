import { BiomeType } from '../world/Biome';
import type { ItemId } from '../inventory/Inventory';

export interface AnimalDrop {
  itemId: ItemId;
  min: number;
  max: number;
  chance?: number;
}

export type AnimalShape =
  | 'quadruped'
  | 'bird'
  | 'snake'
  | 'scorpion'
  | 'fish'
  | 'crab'
  | 'amphibian';

export type AnimalMovement = 'ground' | 'fly' | 'swim';

export type AnimalHabitat = 'land' | 'water';

export interface AnimalTypeConfig {
  id: string;
  name: string;
  biome: BiomeType;
  habitat: AnimalHabitat;
  color: number;
  scale: number;
  hp: number;
  speed: number;
  meatMin: number;
  meatMax: number;
  extraDrops: AnimalDrop[];
  shape: AnimalShape;
  movement: AnimalMovement;
}

export const ANIMAL_TYPES: AnimalTypeConfig[] = [
  // Desert (land)
  {
    id: 'scorpion',
    name: 'Scorpion',
    biome: BiomeType.Desert,
    habitat: 'land',
    color: 0x8d6e63,
    scale: 0.8,
    hp: 20,
    speed: 2.5,
    meatMin: 1,
    meatMax: 1,
    extraDrops: [{ itemId: 'fang', min: 0, max: 1, chance: 0.5 }],
    shape: 'scorpion',
    movement: 'ground',
  },
  {
    id: 'snake',
    name: 'Snake',
    biome: BiomeType.Desert,
    habitat: 'land',
    color: 0xa1887f,
    scale: 0.9,
    hp: 15,
    speed: 3,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'fang', min: 1, max: 1 }],
    shape: 'snake',
    movement: 'ground',
  },
  {
    id: 'vulture',
    name: 'Vulture',
    biome: BiomeType.Desert,
    habitat: 'land',
    color: 0x424242,
    scale: 1,
    hp: 18,
    speed: 3.5,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'bone', min: 0, max: 1, chance: 0.6 }],
    shape: 'bird',
    movement: 'fly',
  },
  {
    id: 'jackal',
    name: 'Jackal',
    biome: BiomeType.Desert,
    habitat: 'land',
    color: 0xbcaaa4,
    scale: 1.1,
    hp: 30,
    speed: 4,
    meatMin: 2,
    meatMax: 3,
    extraDrops: [{ itemId: 'hide', min: 1, max: 1 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  // Forest (land)
  {
    id: 'deer',
    name: 'Deer',
    biome: BiomeType.Forest,
    habitat: 'land',
    color: 0xa1887f,
    scale: 1.2,
    hp: 25,
    speed: 5,
    meatMin: 2,
    meatMax: 3,
    extraDrops: [{ itemId: 'hide', min: 1, max: 1 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  {
    id: 'wolf',
    name: 'Wolf',
    biome: BiomeType.Forest,
    habitat: 'land',
    color: 0x757575,
    scale: 1.1,
    hp: 35,
    speed: 4.5,
    meatMin: 2,
    meatMax: 3,
    extraDrops: [{ itemId: 'hide', min: 1, max: 2 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    biome: BiomeType.Forest,
    habitat: 'land',
    color: 0xd7ccc8,
    scale: 0.7,
    hp: 10,
    speed: 6,
    meatMin: 1,
    meatMax: 1,
    extraDrops: [{ itemId: 'hide', min: 0, max: 1, chance: 0.4 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  {
    id: 'boar',
    name: 'Boar',
    biome: BiomeType.Forest,
    habitat: 'land',
    color: 0x6d4c41,
    scale: 1.3,
    hp: 40,
    speed: 3.5,
    meatMin: 2,
    meatMax: 4,
    extraDrops: [{ itemId: 'hide', min: 1, max: 2 }, { itemId: 'bone', min: 0, max: 1, chance: 0.5 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  // Tundra (land)
  {
    id: 'moose',
    name: 'Moose',
    biome: BiomeType.Tundra,
    habitat: 'land',
    color: 0x6d4c41,
    scale: 1.5,
    hp: 45,
    speed: 3.5,
    meatMin: 3,
    meatMax: 5,
    extraDrops: [{ itemId: 'hide', min: 2, max: 2 }, { itemId: 'bone', min: 1, max: 2 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  {
    id: 'arctic_fox',
    name: 'Arctic Fox',
    biome: BiomeType.Tundra,
    habitat: 'land',
    color: 0xeceff1,
    scale: 0.9,
    hp: 22,
    speed: 5,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'hide', min: 1, max: 1 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  {
    id: 'snow_owl',
    name: 'Snow Owl',
    biome: BiomeType.Tundra,
    habitat: 'land',
    color: 0xf5f5f5,
    scale: 0.85,
    hp: 16,
    speed: 3,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'bone', min: 0, max: 1, chance: 0.5 }],
    shape: 'bird',
    movement: 'fly',
  },
  {
    id: 'polar_hare',
    name: 'Polar Hare',
    biome: BiomeType.Tundra,
    habitat: 'land',
    color: 0xeeeeee,
    scale: 0.75,
    hp: 12,
    speed: 6.5,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'hide', min: 0, max: 1, chance: 0.5 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  // Ocean (water)
  {
    id: 'tuna',
    name: 'Tuna',
    biome: BiomeType.Ocean,
    habitat: 'water',
    color: 0x1565c0,
    scale: 1.1,
    hp: 28,
    speed: 5,
    meatMin: 2,
    meatMax: 4,
    extraDrops: [{ itemId: 'bone', min: 0, max: 1, chance: 0.3 }],
    shape: 'fish',
    movement: 'swim',
  },
  {
    id: 'crab',
    name: 'Crab',
    biome: BiomeType.Ocean,
    habitat: 'water',
    color: 0xd84315,
    scale: 0.8,
    hp: 18,
    speed: 2,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'fang', min: 0, max: 1, chance: 0.4 }],
    shape: 'crab',
    movement: 'ground',
  },
  {
    id: 'seal',
    name: 'Seal',
    biome: BiomeType.Ocean,
    habitat: 'water',
    color: 0x616161,
    scale: 1.2,
    hp: 35,
    speed: 3,
    meatMin: 2,
    meatMax: 4,
    extraDrops: [{ itemId: 'hide', min: 1, max: 2 }],
    shape: 'quadruped',
    movement: 'ground',
  },
  {
    id: 'seagull',
    name: 'Seagull',
    biome: BiomeType.Ocean,
    habitat: 'water',
    color: 0xffffff,
    scale: 0.9,
    hp: 14,
    speed: 4,
    meatMin: 1,
    meatMax: 1,
    extraDrops: [{ itemId: 'bone', min: 0, max: 1, chance: 0.4 }],
    shape: 'bird',
    movement: 'fly',
  },
  // Swamp
  {
    id: 'frog',
    name: 'Frog',
    biome: BiomeType.Swamp,
    habitat: 'land',
    color: 0x689f38,
    scale: 0.6,
    hp: 10,
    speed: 3,
    meatMin: 1,
    meatMax: 1,
    extraDrops: [{ itemId: 'hide', min: 0, max: 1, chance: 0.3 }],
    shape: 'amphibian',
    movement: 'ground',
  },
  {
    id: 'heron',
    name: 'Heron',
    biome: BiomeType.Swamp,
    habitat: 'land',
    color: 0x78909c,
    scale: 1,
    hp: 20,
    speed: 3.5,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'bone', min: 0, max: 1, chance: 0.5 }],
    shape: 'bird',
    movement: 'fly',
  },
  {
    id: 'alligator',
    name: 'Alligator',
    biome: BiomeType.Swamp,
    habitat: 'land',
    color: 0x33691e,
    scale: 1.4,
    hp: 50,
    speed: 3,
    meatMin: 3,
    meatMax: 4,
    extraDrops: [{ itemId: 'hide', min: 1, max: 2 }, { itemId: 'fang', min: 1, max: 2 }],
    shape: 'snake',
    movement: 'ground',
  },
  {
    id: 'mud_turtle',
    name: 'Mud Turtle',
    biome: BiomeType.Swamp,
    habitat: 'water',
    color: 0x558b2f,
    scale: 0.85,
    hp: 30,
    speed: 1.5,
    meatMin: 1,
    meatMax: 2,
    extraDrops: [{ itemId: 'hide', min: 1, max: 1 }],
    shape: 'amphibian',
    movement: 'swim',
  },
];

export function getAnimalTypesForBiome(biome: BiomeType): AnimalTypeConfig[] {
  return ANIMAL_TYPES.filter((a) => a.biome === biome && canAnimalExistAt(a, biome));
}

/** Land animals stay off ocean; water animals stay in ocean (or swamp for swamp species). */
export function canAnimalExistAt(config: AnimalTypeConfig, biome: BiomeType): boolean {
  if (config.habitat === 'land') {
    return biome !== BiomeType.Ocean;
  }
  if (config.biome === BiomeType.Swamp) {
    return biome === BiomeType.Swamp;
  }
  return biome === BiomeType.Ocean;
}
