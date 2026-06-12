import type { Inventory } from '../inventory/Inventory';
import { ITEMS, type ItemId } from '../inventory/Inventory';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { getVisibleRecipes } from '../crafting/recipes';

export class InventoryUI {
  readonly element: HTMLElement;
  private grid: HTMLElement;
  private recipeList: HTMLElement;
  private open = false;
  private crafting = new CraftingSystem();
  private onClose?: () => void;
  private onCraft?: () => void;

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'overlay-panel';
    this.element.innerHTML = `
      <div class="panel-card">
        <h2>Inventory & Crafting</h2>
        <h3 class="panel-section-title">Items</h3>
        <div class="inventory-grid" id="inventory-grid"></div>
        <h3 class="panel-section-title">Recipes</h3>
        <div class="recipe-list" id="recipe-list"></div>
        <button class="panel-close" id="inventory-close">Close</button>
      </div>
    `;
    root.appendChild(this.element);
    this.grid = this.element.querySelector('#inventory-grid') as HTMLElement;
    this.recipeList = this.element.querySelector('#recipe-list') as HTMLElement;
    this.element.querySelector('#inventory-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle(false);
    });
    this.element.addEventListener('click', (e) => e.stopPropagation());
  }

  setOnClose(fn: () => void): void {
    this.onClose = fn;
  }

  setOnCraft(fn: () => void): void {
    this.onCraft = fn;
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    const wasOpen = this.open;
    this.open = force ?? !this.open;
    this.element.classList.toggle('open', this.open);
    if (wasOpen && !this.open) this.onClose?.();
  }

  render(inventory: Inventory): void {
    this.grid.innerHTML = '';
    for (let i = 0; i < inventory.size; i++) {
      const slot = inventory.slots[i];
      const el = document.createElement('div');
      el.className = 'inventory-slot';
      if (slot) {
        el.innerHTML = `<span>${ITEMS[slot.itemId].name}</span><span class="count">${slot.count}</span>`;
      } else {
        el.textContent = '—';
      }
      this.grid.appendChild(el);
    }

    this.recipeList.innerHTML = '';
    const hasWorkbench = inventory.countItem('workbench') > 0;
    const recipes = getVisibleRecipes(hasWorkbench);

    for (const recipe of recipes) {
      const canCraft = inventory.hasIngredients(recipe.ingredients);
      const needsBench = recipe.requiresWorkbench && !hasWorkbench;
      const item = document.createElement('div');
      item.className = `recipe-item${canCraft && !needsBench ? '' : ' disabled'}`;
      const ingredientText = Object.entries(recipe.ingredients)
        .map(([id, count]) => `${count} ${ITEMS[id as ItemId].name}`)
        .join(', ');
      const benchTag = recipe.requiresWorkbench ? ' · Workbench' : '';
      item.innerHTML = `
        <div>
          <strong>${ITEMS[recipe.output].name}</strong>
          <div class="recipe-ingredients">${ingredientText}${benchTag}</div>
        </div>
        <button type="button" ${canCraft && !needsBench ? '' : 'disabled'}>Craft</button>
      `;
      const button = item.querySelector('button');
      button?.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!canCraft || needsBench) return;
        if (this.crafting.craft(inventory, recipe.id)) {
          this.onCraft?.();
          this.render(inventory);
        }
      });
      this.recipeList.appendChild(item);
    }
  }
}
