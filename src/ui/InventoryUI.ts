import type { Inventory } from '../inventory/Inventory';
import { ITEMS, type ItemId } from '../inventory/Inventory';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { getVisibleRecipes } from '../crafting/recipes';

export class InventoryUI {
  readonly element: HTMLElement;
  private root: HTMLElement;
  private backdrop: HTMLElement;
  private panelCard: HTMLElement;
  private grid: HTMLElement;
  private recipeList: HTMLElement;
  private open = false;
  private dismissGuardUntil = 0;
  private crafting = new CraftingSystem();
  private onClose?: () => void;
  private onCraft?: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.element = document.createElement('div');
    this.element.className = 'overlay-panel';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <div class="overlay-backdrop" id="inventory-backdrop"></div>
      <div class="panel-card">
        <h2>Inventory & Crafting</h2>
        <h3 class="panel-section-title">Items</h3>
        <div class="inventory-grid" id="inventory-grid"></div>
        <h3 class="panel-section-title">Recipes</h3>
        <div class="recipe-list" id="recipe-list"></div>
        <button class="panel-close" id="inventory-close" type="button">Close</button>
      </div>
    `;
    this.backdrop = this.element.querySelector('#inventory-backdrop') as HTMLElement;
    this.panelCard = this.element.querySelector('.panel-card') as HTMLElement;
    this.grid = this.element.querySelector('#inventory-grid') as HTMLElement;
    this.recipeList = this.element.querySelector('#recipe-list') as HTMLElement;

    this.panelCard.addEventListener('pointerdown', (e) => e.stopPropagation());

    const closeButton = this.element.querySelector('#inventory-close');
    closeButton?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });

    this.backdrop.addEventListener('click', (e) => {
      if (performance.now() < this.dismissGuardUntil) return;
      if (e.target !== this.backdrop) return;
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });
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

  isMounted(): boolean {
    return this.element.isConnected;
  }

  openPanel(inventory: Inventory): void {
    this.open = true;
    this.dismissGuardUntil = performance.now() + 500;
    inventory.consolidateStacks();
    this.root.appendChild(this.element);
    this.element.classList.add('open');
    this.element.setAttribute('aria-hidden', 'false');
    this.element.inert = false;
    this.render(inventory);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.dismissGuardUntil = 0;
    this.element.classList.remove('open');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.inert = true;
    this.element.remove();
    this.onClose?.();
  }

  forceClose(): void {
    const wasActive = this.open || this.element.isConnected;
    if (!wasActive) return;
    this.open = false;
    this.dismissGuardUntil = 0;
    this.element.classList.remove('open');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.inert = true;
    this.element.remove();
    this.onClose?.();
  }

  toggle(inventory: Inventory, force?: boolean): void {
    const nextOpen = force ?? !this.open;
    if (nextOpen === this.open) return;
    if (nextOpen) {
      this.openPanel(inventory);
    } else {
      this.close();
    }
  }

  render(inventory: Inventory): void {
    this.grid.replaceChildren();
    for (let i = 0; i < inventory.size; i++) {
      const slot = inventory.slots[i];
      const el = document.createElement('div');
      el.className = 'inventory-slot';
      if (slot) {
        const name = document.createElement('span');
        name.textContent = ITEMS[slot.itemId].name;
        const count = document.createElement('span');
        count.className = 'count';
        count.textContent = String(slot.count);
        el.append(name, count);
      } else {
        el.textContent = '—';
      }
      this.grid.appendChild(el);
    }

    this.recipeList.replaceChildren();
    const hasWorkbench = inventory.countItem('workbench') > 0;
    const recipes = getVisibleRecipes();

    for (const recipe of recipes) {
      const canCraft = inventory.hasIngredients(recipe.ingredients);
      const needsBench = recipe.requiresWorkbench && !hasWorkbench;
      const item = document.createElement('div');
      item.className = `recipe-item${canCraft && !needsBench ? '' : ' disabled'}`;
      const ingredientText = Object.entries(recipe.ingredients)
        .map(([id, count]) => `${count} ${ITEMS[id as ItemId].name}`)
        .join(', ');
      const benchTag = recipe.requiresWorkbench ? ' · Workbench' : '';

      const missing = Object.entries(recipe.ingredients)
        .filter(([id, count]) => inventory.countItem(id as ItemId) < (count ?? 0))
        .map(([id, count]) => {
          const have = inventory.countItem(id as ItemId);
          return `${have}/${count} ${ITEMS[id as ItemId].name}`;
        });

      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = ITEMS[recipe.output].name;
      const details = document.createElement('div');
      details.className = 'recipe-ingredients';
      details.textContent = `${ingredientText}${benchTag}`;
      info.append(title, details);

      if (needsBench) {
        const hint = document.createElement('div');
        hint.className = 'recipe-missing';
        hint.textContent = 'Craft a workbench first and keep it in your inventory';
        info.append(hint);
      } else if (missing.length > 0) {
        const hint = document.createElement('div');
        hint.className = 'recipe-missing';
        hint.textContent = `Need: ${missing.join(', ')}`;
        info.append(hint);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Craft';
      button.disabled = !(canCraft && !needsBench);
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canCraft || needsBench) return;
        if (this.crafting.craft(inventory, recipe.id)) {
          this.onCraft?.();
          this.render(inventory);
        }
      });

      item.append(info, button);
      this.recipeList.appendChild(item);
    }
  }
}
