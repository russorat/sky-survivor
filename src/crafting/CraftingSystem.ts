import type { Inventory } from '../inventory/Inventory';
import { RECIPES, getVisibleRecipes, type Recipe } from './recipes';

export class CraftingSystem {
  getAvailableRecipes(inventory: Inventory): Recipe[] {
    const hasWorkbench = inventory.countItem('workbench') > 0;
    return getVisibleRecipes(hasWorkbench).filter((recipe) =>
      inventory.hasIngredients(recipe.ingredients),
    );
  }

  getAllVisibleRecipes(inventory: Inventory): Recipe[] {
    const hasWorkbench = inventory.countItem('workbench') > 0;
    return getVisibleRecipes(hasWorkbench);
  }

  craft(inventory: Inventory, recipeId: string): boolean {
    const hasWorkbench = inventory.countItem('workbench') > 0;
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe || (recipe.requiresWorkbench && !hasWorkbench)) return false;
    if (!inventory.hasIngredients(recipe.ingredients)) return false;
    if (!inventory.removeIngredients(recipe.ingredients)) return false;
    inventory.addItem(recipe.output, recipe.outputCount);
    return true;
  }
}
