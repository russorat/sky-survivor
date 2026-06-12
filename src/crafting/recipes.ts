import type { ItemId } from '../inventory/Inventory';

export interface Recipe {
  id: string;
  output: ItemId;
  outputCount: number;
  ingredients: Partial<Record<ItemId, number>>;
  requiresWorkbench?: boolean;
}

export const RECIPES: Recipe[] = [
  {
    id: 'stone_axe',
    output: 'stone_axe',
    outputCount: 1,
    ingredients: { stone: 3, stick: 2 },
  },
  {
    id: 'stone_pickaxe',
    output: 'stone_pickaxe',
    outputCount: 1,
    ingredients: { stone: 3, stick: 2 },
  },
  {
    id: 'wooden_sword',
    output: 'wooden_sword',
    outputCount: 1,
    ingredients: { stick: 2, hide: 1 },
  },
  {
    id: 'stone_sword',
    output: 'stone_sword',
    outputCount: 1,
    ingredients: { stone: 3, stick: 1, hide: 1 },
  },
  {
    id: 'cooked_meat',
    output: 'cooked_meat',
    outputCount: 1,
    ingredients: { raw_meat: 1 },
  },
  {
    id: 'bow',
    output: 'bow',
    outputCount: 1,
    ingredients: { stick: 3, hide: 2 },
  },
  {
    id: 'arrows',
    output: 'arrow',
    outputCount: 4,
    ingredients: { stick: 2, bone: 1 },
  },
  {
    id: 'workbench',
    output: 'workbench',
    outputCount: 1,
    ingredients: { stick: 4, stone: 4, hide: 2 },
  },
  {
    id: 'metal_plate',
    output: 'metal_plate',
    outputCount: 2,
    ingredients: { stone: 3, fang: 1 },
    requiresWorkbench: true,
  },
  {
    id: 'engine',
    output: 'engine',
    outputCount: 1,
    ingredients: { metal_plate: 2, stone: 2, bone: 1 },
    requiresWorkbench: true,
  },
  {
    id: 'fuel',
    output: 'fuel',
    outputCount: 4,
    ingredients: { stick: 2, raw_meat: 1 },
    requiresWorkbench: true,
  },
  {
    id: 'glider',
    output: 'glider',
    outputCount: 1,
    ingredients: { stick: 4, hide: 3, metal_plate: 2 },
    requiresWorkbench: true,
  },
  {
    id: 'plane',
    output: 'plane',
    outputCount: 1,
    ingredients: { engine: 1, metal_plate: 4, stick: 4, hide: 2 },
    requiresWorkbench: true,
  },
  {
    id: 'rocket_ship',
    output: 'rocket_ship',
    outputCount: 1,
    ingredients: { engine: 2, metal_plate: 6, fuel: 4, stick: 4 },
    requiresWorkbench: true,
  },
];

export function getVisibleRecipes(hasWorkbench: boolean): Recipe[] {
  return RECIPES.filter((r) => !r.requiresWorkbench || hasWorkbench);
}
