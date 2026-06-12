export type ItemId =
  | 'raw_meat'
  | 'cooked_meat'
  | 'hide'
  | 'bone'
  | 'fang'
  | 'stick'
  | 'stone'
  | 'wooden_sword'
  | 'stone_sword'
  | 'stone_axe'
  | 'stone_pickaxe'
  | 'bow'
  | 'arrow'
  | 'workbench'
  | 'engine'
  | 'fuel'
  | 'metal_plate'
  | 'glider'
  | 'plane'
  | 'rocket_ship';

export interface ItemDef {
  id: ItemId;
  name: string;
  stackSize: number;
  food?: number;
  damage?: number;
  ranged?: boolean;
  vehicle?: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  raw_meat: { id: 'raw_meat', name: 'Raw Meat', stackSize: 64, food: 15 },
  cooked_meat: { id: 'cooked_meat', name: 'Cooked Meat', stackSize: 64, food: 35 },
  hide: { id: 'hide', name: 'Hide', stackSize: 64 },
  bone: { id: 'bone', name: 'Bone', stackSize: 64 },
  fang: { id: 'fang', name: 'Fang', stackSize: 64 },
  stick: { id: 'stick', name: 'Stick', stackSize: 64 },
  stone: { id: 'stone', name: 'Stone', stackSize: 64 },
  wooden_sword: { id: 'wooden_sword', name: 'Wooden Sword', stackSize: 1, damage: 10 },
  stone_sword: { id: 'stone_sword', name: 'Stone Sword', stackSize: 1, damage: 25 },
  stone_axe: { id: 'stone_axe', name: 'Stone Axe', stackSize: 1, damage: 12 },
  stone_pickaxe: { id: 'stone_pickaxe', name: 'Stone Pickaxe', stackSize: 1, damage: 8 },
  bow: { id: 'bow', name: 'Bow', stackSize: 1, damage: 18, ranged: true },
  arrow: { id: 'arrow', name: 'Arrow', stackSize: 64, damage: 18 },
  workbench: { id: 'workbench', name: 'Workbench', stackSize: 1 },
  engine: { id: 'engine', name: 'Engine', stackSize: 4 },
  fuel: { id: 'fuel', name: 'Fuel', stackSize: 64 },
  metal_plate: { id: 'metal_plate', name: 'Metal Plate', stackSize: 64 },
  glider: { id: 'glider', name: 'Glider', stackSize: 1, vehicle: true },
  plane: { id: 'plane', name: 'Plane', stackSize: 1, vehicle: true },
  rocket_ship: { id: 'rocket_ship', name: 'Rocket Ship', stackSize: 1, vehicle: true },
};

export interface InventorySlot {
  itemId: ItemId;
  count: number;
}

export class Inventory {
  readonly slots: (InventorySlot | null)[];
  readonly size: number;

  constructor(size = 20) {
    this.size = size;
    this.slots = Array.from({ length: size }, () => null);
  }

  addItem(itemId: ItemId, count: number): number {
    const def = ITEMS[itemId];
    let remaining = count;

    for (const slot of this.slots) {
      if (remaining <= 0) break;
      if (slot && slot.itemId === itemId && slot.count < def.stackSize) {
        const space = def.stackSize - slot.count;
        const added = Math.min(space, remaining);
        slot.count += added;
        remaining -= added;
      }
    }

    for (let i = 0; i < this.slots.length; i++) {
      if (remaining <= 0) break;
      if (!this.slots[i]) {
        const added = Math.min(def.stackSize, remaining);
        this.slots[i] = { itemId, count: added };
        remaining -= added;
      }
    }

    return count - remaining;
  }

  removeItem(itemId: ItemId, count: number): boolean {
    if (this.countItem(itemId) < count) return false;
    let remaining = count;
    for (const slot of this.slots) {
      if (!slot || slot.itemId !== itemId) continue;
      const removed = Math.min(slot.count, remaining);
      slot.count -= removed;
      remaining -= removed;
      if (slot.count <= 0) {
        const idx = this.slots.indexOf(slot);
        this.slots[idx] = null;
      }
      if (remaining <= 0) break;
    }
    return true;
  }

  countItem(itemId: ItemId): number {
    return this.slots.reduce((sum, slot) => {
      if (slot?.itemId === itemId) return sum + slot.count;
      return sum;
    }, 0);
  }

  hasIngredients(ingredients: Partial<Record<ItemId, number>>): boolean {
    return Object.entries(ingredients).every(([id, amount]) => {
      return this.countItem(id as ItemId) >= (amount ?? 0);
    });
  }

  removeIngredients(ingredients: Partial<Record<ItemId, number>>): boolean {
    if (!this.hasIngredients(ingredients)) return false;
    for (const [id, amount] of Object.entries(ingredients)) {
      this.removeItem(id as ItemId, amount ?? 0);
    }
    return true;
  }

  toJSON(): (InventorySlot | null)[] {
    return this.slots.map((slot) => (slot ? { ...slot } : null));
  }

  loadFromJSON(data: (InventorySlot | null)[]): void {
    for (let i = 0; i < this.size; i++) {
      this.slots[i] = data[i] ? { ...data[i]! } : null;
    }
    this.consolidateStacks();
  }

  consolidateStacks(): void {
    const totals = new Map<ItemId, number>();
    for (const slot of this.slots) {
      if (!slot) continue;
      totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.count);
    }

    this.slots.fill(null);

    for (const [itemId, total] of totals) {
      let remaining = total;
      const stackSize = ITEMS[itemId].stackSize;
      while (remaining > 0) {
        const idx = this.slots.findIndex((slot) => slot === null);
        if (idx === -1) break;
        const count = Math.min(remaining, stackSize);
        this.slots[idx] = { itemId, count };
        remaining -= count;
      }
    }
  }
}
