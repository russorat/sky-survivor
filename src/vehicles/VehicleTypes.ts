export type VehicleId = 'glider' | 'plane' | 'rocket_ship';

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  maxSpeed: number;
  boostSpeed: number;
  canBoost: boolean;
  minAltitude: number;
  maxAltitude: number;
  ascendPower: number;
  sinkRate: number;
  usesFuel: boolean;
  fuelRate: number;
  cameraDistance: number;
  cameraHeight: number;
}

export const VEHICLES: Record<VehicleId, VehicleConfig> = {
  glider: {
    id: 'glider',
    name: 'Glider',
    maxSpeed: 22,
    boostSpeed: 22,
    canBoost: false,
    minAltitude: 3,
    maxAltitude: 55,
    ascendPower: 0.35,
    sinkRate: 1.2,
    usesFuel: false,
    fuelRate: 0,
    cameraDistance: 7,
    cameraHeight: 3.5,
  },
  plane: {
    id: 'plane',
    name: 'Plane',
    maxSpeed: 34,
    boostSpeed: 50,
    canBoost: true,
    minAltitude: 2,
    maxAltitude: 85,
    ascendPower: 0.65,
    sinkRate: 0,
    usesFuel: false,
    fuelRate: 0,
    cameraDistance: 8,
    cameraHeight: 4,
  },
  rocket_ship: {
    id: 'rocket_ship',
    name: 'Rocket Ship',
    maxSpeed: 52,
    boostSpeed: 78,
    canBoost: true,
    minAltitude: 2,
    maxAltitude: 130,
    ascendPower: 0.85,
    sinkRate: 0,
    usesFuel: true,
    fuelRate: 1 / 2.5,
    cameraDistance: 9,
    cameraHeight: 4.5,
  },
};

export const VEHICLE_PRIORITY: VehicleId[] = ['rocket_ship', 'plane', 'glider'];

export function vehicleItemToId(itemId: string): VehicleId | null {
  if (itemId === 'glider' || itemId === 'plane' || itemId === 'rocket_ship') {
    return itemId;
  }
  return null;
}
