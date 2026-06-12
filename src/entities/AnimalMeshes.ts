import * as THREE from 'three';
import type { AnimalTypeConfig } from './AnimalTypes';

interface AnimalPalette {
  body: number;
  detail: number;
  belly: number;
  eye: number;
}

const PALETTES: Record<string, Partial<AnimalPalette>> = {
  deer: { detail: 0x8d6e63, belly: 0xd7ccc8 },
  wolf: { body: 0x616161, detail: 0x424242, belly: 0x9e9e9e },
  rabbit: { body: 0xc8b8a8, belly: 0xf5f0ea, detail: 0xb0a090 },
  boar: { body: 0x4e342e, detail: 0x3e2723, belly: 0x6d4c41 },
  moose: { body: 0x5d4037, detail: 0x3e2723, belly: 0x795548 },
  jackal: { body: 0xc4a882, detail: 0x8d6e63, belly: 0xe8dcc8 },
  seal: { body: 0x546e7a, detail: 0x37474f, belly: 0x78909c },
  arctic_fox: { body: 0xf0f4f8, detail: 0xdce4ec, belly: 0xffffff },
  polar_hare: { body: 0xf5f5f5, detail: 0xe0e0e0, belly: 0xffffff },
  vulture: { body: 0x424242, detail: 0x212121, belly: 0x616161 },
  snow_owl: { body: 0xf5f5f5, detail: 0xe0e0e0, belly: 0xffffff },
  seagull: { body: 0xfafafa, detail: 0xbdbdbd, belly: 0xffffff },
  heron: { body: 0x607d8b, detail: 0x455a64, belly: 0x90a4ae },
  snake: { body: 0x8d6e63, detail: 0x6d4c41, belly: 0xa1887f },
  scorpion: { body: 0x795548, detail: 0x5d4037, belly: 0x8d6e63 },
  tuna: { body: 0x1565c0, detail: 0x0d47a1, belly: 0x64b5f6 },
  crab: { body: 0xd84315, detail: 0xbf360c, belly: 0xff7043 },
  alligator: { body: 0x33691e, detail: 0x1b5e20, belly: 0x558b2f },
  frog: { body: 0x689f38, detail: 0x558b2f, belly: 0xaed581 },
  mud_turtle: { body: 0x558b2f, detail: 0x33691e, belly: 0x7cb342 },
};

function palette(config: AnimalTypeConfig): AnimalPalette {
  const custom = PALETTES[config.id];
  return {
    body: custom?.body ?? config.color,
    detail: custom?.detail ?? shade(config.color, 0.75),
    belly: custom?.belly ?? shade(config.color, 1.18),
    eye: custom?.eye ?? 0x1a1a1a,
  };
}

function shade(hex: number, factor: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((hex & 255) * factor));
  return (r << 16) | (g << 8) | b;
}

function mat(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: false });
}

function part(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function sphere(
  group: THREE.Group,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius: number,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Mesh {
  return part(group, new THREE.SphereGeometry(radius, 10, 8), material, x, y, z, 0, 0, 0, sx, sy, sz);
}

function capsule(
  group: THREE.Group,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius: number,
  length: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  return part(group, new THREE.CapsuleGeometry(radius, length, 4, 8), material, x, y, z, rx, ry, rz);
}

function cylinder(
  group: THREE.Group,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  return part(
    group,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8),
    material,
    x,
    y,
    z,
    rx,
    ry,
    rz,
  );
}

function cone(
  group: THREE.Group,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  return part(group, new THREE.ConeGeometry(radius, height, 8), material, x, y, z, rx, ry, rz);
}

function eye(group: THREE.Group, colors: AnimalPalette, x: number, y: number, z: number, size = 0.06): void {
  sphere(group, mat(colors.eye), x, y, z, size);
}

function addEyes(group: THREE.Group, colors: AnimalPalette, z: number, y: number, spread = 0.1): void {
  eye(group, colors, -spread, y, z);
  eye(group, colors, spread, y, z);
}

function buildQuadruped(group: THREE.Group, config: AnimalTypeConfig, colors: AnimalPalette): void {
  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);
  const bellyMat = mat(colors.belly);

  if (config.id === 'seal') {
    capsule(group, bodyMat, 0, 0.35, 0, 0.38, 0.9, 0, 0, Math.PI / 2);
    sphere(group, bellyMat, 0, 0.28, 0.05, 0.32, 1, 0.85, 0.9);
    sphere(group, bodyMat, 0, 0.42, 0.55, 0.28);
    sphere(group, bodyMat, 0, 0.38, -0.55, 0.22);
    addEyes(group, colors, 0.72, 0.44, 0.08);
    for (const side of [-1, 1]) {
      part(group, new THREE.SphereGeometry(0.14, 8, 6), bodyMat, side * 0.42, 0.18, 0.15, 0, 0, 0, 1, 0.35, 1.4);
      part(group, new THREE.SphereGeometry(0.12, 8, 6), bodyMat, side * 0.38, 0.16, -0.35, 0, 0, 0, 1, 0.3, 1.2);
    }
    return;
  }

  const bodyScale = config.id === 'moose' ? 1.25 : config.id === 'rabbit' || config.id === 'polar_hare' ? 0.85 : 1;
  const legHeight = config.id === 'moose' ? 0.65 : config.id === 'rabbit' || config.id === 'polar_hare' ? 0.32 : 0.48;

  capsule(group, bodyMat, 0, 0.55 * bodyScale, 0, 0.32 * bodyScale, 0.85 * bodyScale, 0, 0, Math.PI / 2);
  sphere(group, bellyMat, 0, 0.42 * bodyScale, 0.05, 0.28 * bodyScale, 1, 0.75, 1.1);

  const headZ = 0.62 * bodyScale;
  sphere(group, bodyMat, 0, 0.72 * bodyScale, headZ, 0.26 * bodyScale);
  sphere(group, detailMat, 0, 0.66 * bodyScale, headZ + 0.18 * bodyScale, 0.14 * bodyScale, 1, 0.85, 1.2);
  addEyes(group, colors, headZ + 0.14 * bodyScale, 0.76 * bodyScale, 0.09 * bodyScale);

  if (config.id === 'deer' || config.id === 'moose') {
    const antlerMat = mat(0xd7ccc8);
    const spread = config.id === 'moose' ? 0.55 : 0.35;
    const height = config.id === 'moose' ? 0.55 : 0.38;
    for (const side of [-1, 1]) {
      cylinder(group, antlerMat, side * 0.12, 0.95 * bodyScale, headZ - 0.05, 0.03, 0.05, height);
      cylinder(group, antlerMat, side * spread, 1.05 * bodyScale, headZ - 0.02, 0.02, 0.03, height * 0.55, 0, 0, side * 0.5);
      cylinder(group, antlerMat, side * spread * 0.7, 1.12 * bodyScale, headZ + 0.05, 0.015, 0.025, height * 0.35, 0, 0, -side * 0.4);
    }
  }

  if (config.id === 'wolf' || config.id === 'jackal') {
    for (const side of [-1, 1]) {
      cone(group, detailMat, side * 0.14, 0.92 * bodyScale, headZ - 0.02, 0.06, 0.22, -0.35, 0, side * 0.15);
    }
    sphere(group, detailMat, 0, 0.48 * bodyScale, -0.62 * bodyScale, 0.14);
    sphere(group, bodyMat, 0, 0.5 * bodyScale, -0.78 * bodyScale, 0.1);
  } else if (config.id === 'rabbit' || config.id === 'polar_hare') {
    for (const side of [-1, 1]) {
      capsule(group, bodyMat, side * 0.1, 1.05 * bodyScale, headZ, 0.05, 0.42, 0.15, side * 0.1, 0);
    }
    sphere(group, bellyMat, 0, 0.5 * bodyScale, -0.55 * bodyScale, 0.1);
  } else if (config.id === 'boar') {
    sphere(group, detailMat, 0, 0.62 * bodyScale, headZ + 0.28 * bodyScale, 0.18 * bodyScale, 1.1, 0.9, 1.3);
    for (const side of [-1, 1]) {
      cone(group, mat(0xf5f5f5), side * 0.08, 0.58 * bodyScale, headZ + 0.32 * bodyScale, 0.025, 0.12, Math.PI / 2, 0, side * 0.3);
    }
    cylinder(group, detailMat, 0, 0.52 * bodyScale, -0.45 * bodyScale, 0.04, 0.06, 0.18, Math.PI / 2, 0, 0);
  } else if (config.id === 'deer') {
    for (const side of [-1, 1]) {
      cone(group, detailMat, side * 0.16, 0.88 * bodyScale, headZ, 0.05, 0.16, -0.2, 0, side * 0.2);
    }
    cylinder(group, detailMat, 0, 0.5 * bodyScale, -0.55 * bodyScale, 0.025, 0.04, 0.12, Math.PI / 2, 0, 0);
  } else {
    for (const side of [-1, 1]) {
      cone(group, detailMat, side * 0.15, 0.86 * bodyScale, headZ, 0.05, 0.14, -0.25, 0, side * 0.15);
    }
    sphere(group, detailMat, 0, 0.5 * bodyScale, -0.58 * bodyScale, 0.1);
  }

  if (config.id === 'arctic_fox') {
    sphere(group, bodyMat, 0, 0.52 * bodyScale, -0.72 * bodyScale, 0.14);
    sphere(group, bellyMat, 0, 0.48 * bodyScale, -0.88 * bodyScale, 0.1);
  }

  const legPositions: [number, number][] = [
    [-0.26 * bodyScale, 0.28 * bodyScale],
    [0.26 * bodyScale, 0.28 * bodyScale],
    [-0.26 * bodyScale, -0.28 * bodyScale],
    [0.26 * bodyScale, -0.28 * bodyScale],
  ];
  for (const [x, z] of legPositions) {
    capsule(group, detailMat, x, legHeight * 0.45, z, 0.07, legHeight, 0, 0, 0);
    sphere(group, mat(shade(colors.detail, 0.85)), x, 0.04, z + (z > 0 ? 0.04 : -0.04), 0.06);
  }
}

function buildBird(group: THREE.Group, config: AnimalTypeConfig, colors: AnimalPalette): void {
  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);
  const bellyMat = mat(colors.belly);
  const wingMat = mat(shade(colors.body, 0.9));

  if (config.id === 'heron') {
    capsule(group, bodyMat, 0, 0.95, 0, 0.08, 0.55);
    capsule(group, bodyMat, 0, 0.72, 0.08, 0.1, 0.35, 0.35, 0, 0);
    sphere(group, bodyMat, 0, 1.05, 0.12, 0.14);
    cone(group, mat(0xffb300), 0, 1.02, 0.28, 0.04, 0.22, Math.PI / 2, 0, 0);
    addEyes(group, colors, 0.2, 1.08, 0.04);
    part(group, new THREE.SphereGeometry(0.28, 8, 6), wingMat, -0.32, 0.78, 0, 0, 0, 0.2, 0.08, 1.4, 0.5);
    part(group, new THREE.SphereGeometry(0.28, 8, 6), wingMat, 0.32, 0.78, 0, 0, 0, -0.2, 0.08, 1.4, 0.5);
    for (const side of [-1, 1]) {
      cylinder(group, mat(0xff7043), side * 0.08, 0.35, 0.1, 0.02, 0.025, 0.55);
    }
    return;
  }

  const bodyY = config.id === 'vulture' ? 0.55 : 0.5;
  sphere(group, bodyMat, 0, bodyY, 0, 0.28, 1.1, 0.95, 1.15);
  sphere(group, bellyMat, 0, bodyY - 0.06, 0.02, 0.22, 1, 0.8, 1);

  const headY = bodyY + 0.22;
  const headZ = 0.12;
  sphere(group, config.id === 'vulture' ? mat(0xd7ccc8) : bodyMat, 0, headY, headZ, 0.16);
  cone(group, mat(0xffb300), 0, headY - 0.02, headZ + 0.18, 0.035, 0.14, Math.PI / 2, 0, 0);
  addEyes(group, colors, headZ + 0.06, headY + 0.04, 0.05);

  if (config.id === 'snow_owl') {
    for (const side of [-1, 1]) {
      sphere(group, detailMat, side * 0.1, headY + 0.12, headZ - 0.02, 0.06);
    }
    sphere(group, mat(0xf9a825), 0, headY - 0.02, headZ + 0.04, 0.04, 1.6, 0.8, 0.6);
  }

  const wingSpan = config.id === 'vulture' ? 0.95 : 0.75;
  for (const side of [-1, 1]) {
    part(
      group,
      new THREE.SphereGeometry(0.35, 8, 6),
      wingMat,
      side * 0.42,
      bodyY + 0.05,
      -0.05,
      0,
      0,
      side * 0.15,
      wingSpan,
      0.12,
      0.45,
    );
    part(
      group,
      new THREE.SphereGeometry(0.22, 8, 6),
      detailMat,
      side * 0.72,
      bodyY + 0.02,
      -0.12,
      0,
      0,
      side * 0.25,
      0.55,
      0.08,
      0.3,
    );
  }

  if (config.id === 'vulture') {
    sphere(group, detailMat, 0, bodyY - 0.08, -0.18, 0.12, 1.2, 0.7, 1);
  } else {
    capsule(group, detailMat, 0, bodyY - 0.05, -0.22, 0.05, 0.18, Math.PI / 2, 0, 0);
  }

  for (const side of [-1, 1]) {
    cylinder(group, mat(0xff7043), side * 0.07, 0.12, 0.08, 0.015, 0.02, 0.12);
  }
}

function buildSnake(group: THREE.Group, config: AnimalTypeConfig, colors: AnimalPalette): void {
  if (config.id === 'alligator') {
    buildAlligator(group, colors);
    return;
  }

  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);
  const segments = 7;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const x = -0.75 + t * 1.5;
    const wave = Math.sin(t * Math.PI * 1.2) * 0.12;
    const radius = 0.11 - t * 0.025;
    sphere(group, i % 2 === 0 ? bodyMat : detailMat, x, 0.12 + wave, 0, radius, 1.15, 0.85, 1);
  }
  sphere(group, bodyMat, 0.82, 0.16, 0.04, 0.14, 1.1, 0.95, 1);
  sphere(group, detailMat, 0.95, 0.17, 0.06, 0.09, 1.2, 0.85, 0.9);
  addEyes(group, colors, 0.1, 0.2, 0.05);
  cone(group, detailMat, 1.02, 0.16, 0.06, 0.025, 0.08, Math.PI / 2, 0, 0);
}

function buildAlligator(group: THREE.Group, colors: AnimalPalette): void {
  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);
  const bellyMat = mat(colors.belly);

  capsule(group, bodyMat, 0, 0.22, 0, 0.28, 1.1, 0, 0, Math.PI / 2);
  sphere(group, bellyMat, 0, 0.14, 0.04, 0.22, 1, 0.65, 1.05);
  for (let i = -3; i <= 3; i++) {
    cone(group, detailMat, i * 0.14, 0.34, 0, 0.04, 0.08);
  }

  sphere(group, bodyMat, 0, 0.24, 0.72, 0.22);
  sphere(group, detailMat, 0, 0.18, 0.95, 0.14, 1.1, 0.75, 1.3);
  addEyes(group, colors, 0.88, 0.28, 0.07);
  for (const side of [-1, 1]) {
    sphere(group, detailMat, side * 0.1, 0.2, 1.02, 0.05);
  }

  for (let i = 0; i < 5; i++) {
    const z = -0.35 - i * 0.16;
    sphere(group, i % 2 === 0 ? bodyMat : detailMat, 0, 0.16 - i * 0.01, z, 0.18 - i * 0.02, 1.1, 0.8, 1);
  }

  for (const [x, z] of [[-0.32, 0.35], [0.32, 0.35], [-0.32, -0.35], [0.32, -0.35]] as [number, number][]) {
    capsule(group, detailMat, x, 0.1, z, 0.07, 0.18);
    sphere(group, mat(shade(colors.detail, 0.85)), x, 0.02, z, 0.05);
  }
}

function buildScorpion(group: THREE.Group, colors: AnimalPalette): void {
  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);

  capsule(group, bodyMat, 0, 0.18, 0, 0.16, 0.55, 0, 0, Math.PI / 2);
  sphere(group, bodyMat, 0, 0.22, 0.35, 0.18);
  addEyes(group, colors, 0.42, 0.24, 0.05);

  for (const side of [-1, 1]) {
    part(group, new THREE.SphereGeometry(0.12, 8, 6), detailMat, side * 0.28, 0.2, 0.42, 0, 0, side * 0.5, 1.2, 0.5, 0.8);
    cone(group, detailMat, side * 0.42, 0.18, 0.52, 0.04, 0.14, 0, 0, side * 0.4);
  }

  for (let i = 0; i < 4; i++) {
    const x = -0.22 + i * 0.14;
    for (const side of [-1, 1]) {
      cylinder(group, detailMat, x, 0.06, side * 0.22, 0.015, 0.02, 0.16, 0.15, 0, 0);
    }
  }

  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const z = -0.35 - t * 0.45;
    const y = 0.18 + t * 0.45;
    sphere(group, bodyMat, 0, y, z, 0.07 - t * 0.01);
  }
  cone(group, mat(0x212121), 0, 0.58, -0.82, 0.03, 0.1);
}

function buildFish(group: THREE.Group, colors: AnimalPalette): void {
  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);
  const bellyMat = mat(colors.belly);

  part(group, new THREE.SphereGeometry(0.35, 10, 8), bodyMat, 0, 0, 0, 0, 0, 0, 1.6, 0.85, 0.75);
  part(group, new THREE.SphereGeometry(0.28, 10, 8), bellyMat, 0, -0.08, 0.02, 0, 0, 0, 1.4, 0.55, 0.65);
  addEyes(group, colors, 0.38, 0.08, 0.1);

  part(group, new THREE.SphereGeometry(0.22, 8, 6), detailMat, -0.62, 0, 0, 0, 0, 0, 0.35, 0.75, 0.08);
  for (const side of [-1, 1]) {
    part(group, new THREE.SphereGeometry(0.18, 8, 6), detailMat, -0.55, side * 0.08, 0, 0, 0, side * 0.35, 0.3, 0.08, 0.45);
  }
  cone(group, detailMat, 0, 0.16, -0.05, 0.04, 0.18, 0.2, 0, 0);
}

function buildCrab(group: THREE.Group, colors: AnimalPalette): void {
  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);

  part(group, new THREE.SphereGeometry(0.42, 10, 8), bodyMat, 0, 0.16, 0, 0, 0, 0, 1.15, 0.55, 1.05);
  sphere(group, mat(shade(colors.body, 1.1)), 0, 0.2, 0, 0.18, 0.9, 0.35, 0.85);
  addEyes(group, colors, 0.34, 0.22, 0.08);

  for (const side of [-1, 1]) {
    part(group, new THREE.SphereGeometry(0.16, 8, 6), detailMat, side * 0.55, 0.2, 0.28, 0, 0, side * 0.35, 1.1, 0.45, 0.9);
    cone(group, detailMat, side * 0.72, 0.18, 0.38, 0.05, 0.16, 0, 0, side * 0.5);
  }

  for (const [x, z] of [[-0.42, 0.38], [0.42, 0.38], [-0.42, -0.38], [0.42, -0.38]] as [number, number][]) {
    cylinder(group, detailMat, x, 0.07, z, 0.025, 0.03, 0.18, 0.2, Math.atan2(x, z), 0);
  }
}

function buildAmphibian(group: THREE.Group, config: AnimalTypeConfig, colors: AnimalPalette): void {
  if (config.id === 'mud_turtle') {
    buildTurtle(group, colors);
    return;
  }

  const bodyMat = mat(colors.body);
  const detailMat = mat(colors.detail);
  const bellyMat = mat(colors.belly);

  part(group, new THREE.SphereGeometry(0.32, 10, 8), bodyMat, 0, 0.18, 0, 0, 0, 0, 1.25, 0.75, 1.05);
  sphere(group, bellyMat, 0, 0.12, 0.02, 0.24, 1, 0.55, 0.95);
  sphere(group, bodyMat, 0, 0.22, 0.28, 0.16);
  addEyes(group, colors, 0.32, 0.28, 0.1);
  sphere(group, mat(0x81c784), 0, 0.24, 0.34, 0.07, 1.3, 0.9, 0.7);

  for (const side of [-1, 1]) {
    part(group, new THREE.SphereGeometry(0.14, 8, 6), bodyMat, side * 0.34, 0.14, 0.05, 0, 0, side * 0.25, 0.55, 0.35, 0.75);
    capsule(group, detailMat, side * 0.28, 0.08, -0.22, 0.05, 0.28, 0.45, side * 0.35, 0);
    capsule(group, detailMat, side * 0.18, 0.1, 0.22, 0.04, 0.16);
  }
}

function buildTurtle(group: THREE.Group, colors: AnimalPalette): void {
  const shellMat = mat(colors.body);
  const detailMat = mat(colors.detail);
  const bellyMat = mat(colors.belly);

  part(group, new THREE.SphereGeometry(0.38, 10, 8), shellMat, 0, 0.2, 0, 0, 0, 0, 1.1, 0.55, 1.15);
  for (let i = -1; i <= 1; i++) {
    capsule(group, detailMat, i * 0.14, 0.28, 0, 0.04, 0.22, 0.25, 0, 0);
  }
  part(group, new THREE.SphereGeometry(0.3, 10, 8), bellyMat, 0, 0.1, 0, 0, 0, 0, 1, 0.35, 0.95);
  sphere(group, detailMat, 0, 0.16, 0.38, 0.12);
  addEyes(group, colors, 0.44, 0.18, 0.05);

  for (const [x, z] of [[-0.3, 0.24], [0.3, 0.24], [-0.3, -0.24], [0.3, -0.24]] as [number, number][]) {
    capsule(group, detailMat, x, 0.07, z, 0.04, 0.12);
  }
}

export function createAnimalMesh(config: AnimalTypeConfig): THREE.Group {
  const group = new THREE.Group();
  const colors = palette(config);

  switch (config.shape) {
    case 'quadruped':
      buildQuadruped(group, config, colors);
      break;
    case 'bird':
      buildBird(group, config, colors);
      break;
    case 'snake':
      buildSnake(group, config, colors);
      break;
    case 'scorpion':
      buildScorpion(group, colors);
      break;
    case 'fish':
      buildFish(group, colors);
      break;
    case 'crab':
      buildCrab(group, colors);
      break;
    case 'amphibian':
      buildAmphibian(group, config, colors);
      break;
  }

  group.scale.setScalar(config.scale);
  return group;
}
