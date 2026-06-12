import * as THREE from 'three';

export type TimePhase = 'night' | 'dawn' | 'day' | 'dusk';

const CYCLE_SECONDS = 480;

const SKY_STOPS: [number, number][] = [
  [0, 0x0d1b2a],
  [0.18, 0x1a237e],
  [0.23, 0xff7043],
  [0.28, 0x87ceeb],
  [0.72, 0x87ceeb],
  [0.77, 0xff7043],
  [0.82, 0x3949ab],
  [1, 0x0d1b2a],
];

function sampleSkyColor(t: number): THREE.Color {
  const wrapped = ((t % 1) + 1) % 1;
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [t0, c0] = SKY_STOPS[i];
    const [t1, c1] = SKY_STOPS[i + 1];
    if (wrapped >= t0 && wrapped <= t1) {
      const alpha = t1 === t0 ? 0 : (wrapped - t0) / (t1 - t0);
      return new THREE.Color(c0).lerp(new THREE.Color(c1), alpha);
    }
  }
  return new THREE.Color(SKY_STOPS[0][1]);
}

function formatClock(t: number): string {
  const hours24 = Math.floor(((t % 1) + 1) % 1 * 24);
  const minutes = Math.floor((((t % 1) + 1) % 1 * 24 - hours24) * 60);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export class DayNightCycle {
  timeOfDay = 0.32;

  constructor(
    private scene: THREE.Scene,
    private ambient: THREE.AmbientLight,
    private sun: THREE.DirectionalLight,
    private fog: THREE.Fog,
  ) {
    this.apply();
  }

  load(timeOfDay: number): void {
    this.timeOfDay = ((timeOfDay % 1) + 1) % 1;
    this.apply();
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  update(dt: number): void {
    this.timeOfDay = (this.timeOfDay + dt / CYCLE_SECONDS) % 1;
    this.apply();
  }

  getPhase(): TimePhase {
    const t = this.timeOfDay;
    if (t < 0.22 || t >= 0.8) return 'night';
    if (t < 0.28) return 'dawn';
    if (t < 0.74) return 'day';
    return 'dusk';
  }

  getClockLabel(): string {
    return formatClock(this.timeOfDay);
  }

  private apply(): void {
    const sky = sampleSkyColor(this.timeOfDay);
    this.scene.background = sky;
    this.fog.color.copy(sky);

    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);

    if (sunHeight > 0.05) {
      this.sun.position.set(Math.cos(sunAngle) * 80, sunHeight * 80, 20);
      this.sun.color.setHex(0xfff5e6);
      this.sun.intensity = 0.2 + sunHeight * 0.65;
      this.ambient.intensity = 0.18 + sunHeight * 0.37;
      this.ambient.color.setHex(0xffffff);
    } else {
      const moonAngle = sunAngle + Math.PI;
      const moonHeight = Math.max(0.2, Math.sin(moonAngle));
      this.sun.position.set(Math.cos(moonAngle) * 70, moonHeight * 50, 15);
      this.sun.color.setHex(0x8899bb);
      this.sun.intensity = 0.1 + moonHeight * 0.08;
      this.ambient.intensity = 0.1;
      this.ambient.color.setHex(0x334466);
    }
  }
}
