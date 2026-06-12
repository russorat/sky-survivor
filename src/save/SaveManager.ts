import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { InventorySlot } from '../inventory/Inventory';

interface SaveData {
  position: { x: number; y: number; z: number };
  hunger: number;
  health: number;
  inventory: (InventorySlot | null)[];
  timeOfDay?: number;
}

interface SkySurvivorDB extends DBSchema {
  saves: {
    key: string;
    value: SaveData;
  };
}

const DB_NAME = 'sky-survivor';
const STORE = 'saves';
const SAVE_KEY = 'current';

export class SaveManager {
  private db: IDBPDatabase<SkySurvivorDB> | null = null;
  private saveTimer = 0;

  async init(): Promise<void> {
    this.db = await openDB<SkySurvivorDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE);
      },
    });
  }

  async load(): Promise<SaveData | null> {
    if (!this.db) return null;
    return (await this.db.get(STORE, SAVE_KEY)) ?? null;
  }

  async save(data: SaveData): Promise<void> {
    if (!this.db) return;
    await this.db.put(STORE, data, SAVE_KEY);
  }

  tick(dt: number, data: SaveData, onSave: () => void): void {
    this.saveTimer += dt;
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      void this.save(data);
      onSave();
    }
  }
}

export type { SaveData };
