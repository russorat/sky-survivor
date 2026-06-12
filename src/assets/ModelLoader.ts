import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_PATHS = {
  player: '/models/player.glb',
  quadruped: '/models/fox.glb',
  bird: '/models/duck.glb',
} as const;

export type ModelKey = keyof typeof MODEL_PATHS;

export class ModelLoader {
  private static instance: ModelLoader | null = null;
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, THREE.Group>();
  private readonly loading = new Map<string, Promise<THREE.Group | null>>();

  static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  async preload(): Promise<void> {
    await Promise.all(Object.values(MODEL_PATHS).map((path) => this.loadTemplate(path)));
  }

  hasModel(key: ModelKey): boolean {
    return this.cache.has(MODEL_PATHS[key]);
  }

  createInstance(key: ModelKey, color: number, scale: number): THREE.Group | null {
    const template = this.cache.get(MODEL_PATHS[key]);
    if (!template) return null;

    const group = template.clone(true);
    group.scale.setScalar(scale);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        const cloned = materials.map((material) => {
          const next = material.clone();
          if ('color' in next && next.color instanceof THREE.Color) {
            next.color.setHex(color);
          }
          if ('flatShading' in next) {
            (next as THREE.MeshLambertMaterial).flatShading = true;
          }
          return next;
        });
        obj.material = cloned.length === 1 ? cloned[0]! : cloned;
      }
    });
    return group;
  }

  private async loadTemplate(path: string): Promise<THREE.Group | null> {
    if (this.cache.has(path)) return this.cache.get(path)!;
    if (!this.loading.has(path)) {
      this.loading.set(path, this.fetch(path));
    }
    return this.loading.get(path)!;
  }

  private async fetch(path: string): Promise<THREE.Group | null> {
    try {
      const gltf = await this.loader.loadAsync(path);
      const model = gltf.scene;
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      this.cache.set(path, model);
      return model;
    } catch {
      return null;
    }
  }
}

export function getModelKeyForAnimal(shape: string): ModelKey | null {
  if (shape === 'quadruped') return 'quadruped';
  if (shape === 'bird') return 'bird';
  return null;
}
