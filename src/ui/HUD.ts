export class HUD {
  readonly element: HTMLElement;
  private hungerFill: HTMLElement;
  private healthFill: HTMLElement;
  private biomeLabel: HTMLElement;
  private modeLabel: HTMLElement;
  private ammoLabel: HTMLElement;
  private vehicleLabel: HTMLElement;

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'hud';
    this.element.innerHTML = `
      <div class="hud-bar-label" id="hunger-label">Hunger</div>
      <div class="hud-bar" id="hunger-bar"><div class="hud-bar-fill hunger" id="hunger-fill"></div></div>
      <div class="hud-bar-label" id="health-label">Health</div>
      <div class="hud-bar" id="health-bar"><div class="hud-bar-fill health" id="health-fill"></div></div>
      <div class="biome-badge" id="biome-badge">Forest</div>
      <div class="mode-badge" id="mode-badge">Flying</div>
      <div class="ammo-badge" id="ammo-badge"></div>
      <div class="vehicle-badge" id="vehicle-badge"></div>
      <div class="crosshair"></div>
      <div class="toast" id="toast"></div>
    `;
    root.appendChild(this.element);
    this.hungerFill = this.element.querySelector('#hunger-fill') as HTMLElement;
    this.healthFill = this.element.querySelector('#health-fill') as HTMLElement;
    this.biomeLabel = this.element.querySelector('#biome-badge') as HTMLElement;
    this.modeLabel = this.element.querySelector('#mode-badge') as HTMLElement;
    this.ammoLabel = this.element.querySelector('#ammo-badge') as HTMLElement;
    this.vehicleLabel = this.element.querySelector('#vehicle-badge') as HTMLElement;
  }

  setVehicleDisplay(vehicleName: string | null, fuelCount?: number): void {
    if (!vehicleName) {
      this.vehicleLabel.style.display = 'none';
      return;
    }
    this.vehicleLabel.style.display = 'block';
    const fuelText = fuelCount !== undefined ? ` · Fuel: ${fuelCount}` : '';
    this.vehicleLabel.textContent = `${vehicleName}${fuelText}`;
  }

  setAmmoDisplay(hasBow: boolean, arrowCount: number): void {
    if (!hasBow) {
      this.ammoLabel.style.display = 'none';
      return;
    }
    this.ammoLabel.style.display = 'block';
    this.ammoLabel.textContent = `Arrows: ${arrowCount}`;
  }

  setMovementMode(mode: 'fly' | 'walk'): void {
    this.modeLabel.textContent = mode === 'walk' ? 'Walking' : 'Flying';
    this.modeLabel.classList.toggle('walking', mode === 'walk');
  }

  update(hunger: number, maxHunger: number, health: number, maxHealth: number, biomeName?: string): void {
    this.hungerFill.style.width = `${(hunger / maxHunger) * 100}%`;
    this.healthFill.style.width = `${(health / maxHealth) * 100}%`;
    if (biomeName) this.biomeLabel.textContent = biomeName;
  }

  showToast(message: string): void {
    const toast = this.element.querySelector('#toast') as HTMLElement;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}
