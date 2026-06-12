import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { WorldGenerator } from '../world/WorldGenerator';
import { PlayerController } from '../player/PlayerController';
import { HungerSystem, HealthSystem } from '../player/HungerSystem';
import { AnimalSpawner } from '../entities/AnimalSpawner';
import { CombatSystem } from '../combat/CombatSystem';
import { Inventory, ITEMS, type ItemId } from '../inventory/Inventory';
import { InputManager } from '../input/InputManager';
import { TouchControls } from '../input/TouchControls';
import { HUD } from '../ui/HUD';
import { InventoryUI } from '../ui/InventoryUI';
import { SaveManager } from '../save/SaveManager';
import { getBiomeDisplayName } from '../world/Biome';
import { VEHICLE_PRIORITY, type VehicleId } from '../vehicles/VehicleTypes';

type GameState = 'menu' | 'playing' | 'dead' | 'paused';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private loop = new GameLoop();

  private world: WorldGenerator;
  private player: PlayerController;
  private hunger = new HungerSystem();
  private health = new HealthSystem();
  private spawner: AnimalSpawner;
  private combat: CombatSystem;
  private inventory = new Inventory();
  private input: InputManager;
  private touchControls: TouchControls;
  private hud: HUD;
  private inventoryUI: InventoryUI;
  private saveManager = new SaveManager();

  private state: GameState = 'menu';
  private startScreen: HTMLElement;
  private deathScreen: HTMLElement;
  private equippedWeapon: ItemId | null = null;
  private hasBow = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 180);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(40, 80, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    this.scene.add(ambient, sun);

    this.world = new WorldGenerator(this.scene);
    this.player = new PlayerController();
    this.scene.add(this.player.mesh);
    this.spawner = new AnimalSpawner(this.scene);
    this.combat = new CombatSystem(this.scene);

    this.input = new InputManager(canvas);
    this.touchControls = new TouchControls(this.input, uiRoot);
    this.hud = new HUD(uiRoot);
    this.inventoryUI = new InventoryUI(uiRoot);

    this.startScreen = this.createStartScreen();
    this.deathScreen = this.createDeathScreen();
    uiRoot.appendChild(this.startScreen);
    uiRoot.appendChild(this.deathScreen);

    if (this.input.touchMode) {
      this.touchControls.setActive(false);
    }

    this.inventoryUI.setOnClose(() => this.onOverlayClosed());
    this.inventoryUI.setOnCraft(() => {
      this.updateEquippedWeapon();
      this.hud.showToast('Crafted!');
      this.refreshUI();
    });

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  async init(): Promise<void> {
    await this.saveManager.init();
    const save = await this.saveManager.load();
    if (save) {
      this.player.position.set(save.position.x, save.position.y, save.position.z);
      this.hunger.load(save.hunger);
      this.health.load(save.health);
      this.inventory.loadFromJSON(save.inventory);
      this.updateEquippedWeapon();
    } else {
      this.resetPlayerPosition();
    }
    this.world.update(this.player.position);
  }

  start(): void {
    this.loop.start((dt) => this.update(dt), () => this.render());
  }

  private createStartScreen(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'start-screen';
    el.innerHTML = `
      <div class="start-card">
        <h1>Sky Survivor</h1>
        <p>Fly across five biomes — desert, forest, tundra, ocean, and swamp. Hunt 20 unique animals, craft tools and weapons, and survive as long as you can.</p>
        <button class="primary-btn" id="start-btn">Play</button>
        <p class="help-text">
          Desktop: WASD move, Space/Ctrl altitude, mouse look, F attack, E eat, Tab inventory & crafting<br/>
          Double-tap Ctrl to toggle walking on the ground<br/>
          Attack trees (sticks) and rocks (stone) with F — aim at them and hit a few times<br/>
          Craft a bow (3 sticks + 2 hide) and arrows (2 sticks + 1 bone) for ranged combat<br/>
          Craft a workbench, then build gliders, planes, and rocket ships. Press V to mount<br/>
          Mobile: left thumb on joystick to move, right thumb drag the open area to look around<br/>
          Action buttons sit on the far right — drag camera in the space to their left
        </p>
      </div>
    `;
    el.querySelector('#start-btn')?.addEventListener('pointerup', (e) => {
      e.preventDefault();
      this.state = 'playing';
      el.style.display = 'none';
      this.touchControls.setActive(true);
      if (!this.input.touchMode) this.canvas.requestPointerLock();
    });
    return el;
  }

  private createDeathScreen(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'death-screen';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="death-card">
        <h1>You collapsed</h1>
        <p>Hunger got the better of you. You respawn at the origin with your inventory intact.</p>
        <button class="primary-btn" id="respawn-btn">Continue</button>
      </div>
    `;
    el.querySelector('#respawn-btn')?.addEventListener('pointerup', (e) => {
      e.preventDefault();
      this.respawn();
      el.style.display = 'none';
      this.state = 'playing';
      this.touchControls.setActive(true);
    });
    return el;
  }

  private update(dt: number): void {
    if (this.state === 'paused') {
      this.input.update();
      if (this.input.state.pause) {
        this.state = 'playing';
        if (!this.input.touchMode) this.canvas.requestPointerLock();
      }
      this.input.endFrame();
      return;
    }

    if (this.state !== 'playing') return;

    this.input.update();

    if (this.input.state.inventoryPressed || this.input.state.craftPressed) {
      this.toggleInventoryOverlay();
    }
    if (this.input.state.eatPressed) this.tryEat();
    if (this.input.state.vehicleToggle) this.handleVehicleToggle();

    const overlayOpen = this.inventoryUI.isOpen();
    if (this.input.state.pause && !overlayOpen) {
      this.state = 'paused';
      document.exitPointerLock();
      this.input.endFrame();
      return;
    }

    if (overlayOpen) {
      this.refreshUI();
      this.input.endFrame();
      return;
    }

    const { forward, modeToggled, fuelUsed } = this.player.update(
      dt,
      this.input,
      (x, z) => this.world.getHeightAt(x, z),
      this.inventory.countItem('fuel') > 0,
    );
    if (fuelUsed > 0) {
      this.inventory.removeItem('fuel', fuelUsed);
    }
    if (modeToggled) {
      this.input.setWalkMode(modeToggled === 'walk');
      this.hud.setMovementMode(modeToggled);
      this.hud.showToast(modeToggled === 'walk' ? 'Walking mode' : 'Flying mode');
    }
    this.world.update(this.player.position);
    this.spawner.update(dt, this.player.position, this.world);

    if (this.input.state.attackPressed) {
      this.handleAttack(forward);
    }

    const projectileHits = this.combat.updateProjectiles(dt, this.spawner.getAliveAnimals());
    for (const { animal, killed } of projectileHits) {
      if (killed) {
        this.combat.spawnLoot(animal);
        this.spawner.removeAnimal(animal);
        this.hud.showToast(`Defeated ${animal.config.name}`);
      }
    }

    this.combat.updateHarvestableFlashes(dt, this.world.getHarvestables());

    const collected = this.combat.update(dt, this.player.position);
    for (const drop of collected) {
      const added = this.inventory.addItem(drop.itemId, drop.count);
      if (added > 0) this.hud.showToast(`+${added} ${ITEMS[drop.itemId].name}`);
    }

    this.hunger.update(dt);
    const died = this.health.update(dt, this.hunger.isStarving());
    if (died) {
      this.state = 'dead';
      this.deathScreen.style.display = 'flex';
      this.touchControls.setActive(false);
      document.exitPointerLock();
    }

    const biome = getBiomeDisplayName(this.world.getBiomeAt(this.player.position.x, this.player.position.z));
    this.hud.update(
      this.hunger.hunger,
      this.hunger.maxHunger,
      this.health.health,
      this.health.maxHealth,
      biome,
    );
    this.hud.setAmmoDisplay(this.hasBow && !this.player.isMounted(), this.inventory.countItem('arrow'));
    if (this.player.isMounted()) {
      const fuel = this.player.mountedVehicle === 'rocket_ship'
        ? this.inventory.countItem('fuel')
        : undefined;
      this.hud.setVehicleDisplay(this.player.getMountedVehicleName(), fuel);
    } else {
      this.hud.setVehicleDisplay(null);
    }
    this.refreshUI();

    this.saveManager.tick(
      dt,
      {
        position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
        hunger: this.hunger.hunger,
        health: this.health.health,
        inventory: this.inventory.toJSON(),
      },
      () => {},
    );

    this.input.endFrame();
  }

  private render(): void {
    this.camera.position.copy(this.player.getCameraPosition());
    this.camera.lookAt(this.player.getLookTarget());
    this.renderer.render(this.scene, this.camera);
  }

  private handleVehicleToggle(): void {
    if (this.player.isMounted()) {
      this.player.dismountVehicle();
      this.hud.showToast('Dismounted');
      return;
    }

    const vehicle = this.findBestVehicle();
    if (!vehicle) {
      this.hud.showToast('No vehicle in inventory');
      return;
    }

    this.player.mountVehicle(vehicle);
    this.input.setWalkMode(false);
    this.hud.setMovementMode('fly');
    this.hud.showToast(`Mounted ${this.player.getMountedVehicleName()}`);
  }

  private findBestVehicle(): VehicleId | null {
    for (const id of VEHICLE_PRIORITY) {
      if (this.inventory.countItem(id) > 0) return id;
    }
    return null;
  }

  private handleAttack(forward: THREE.Vector3): void {
    const damage = this.getAttackDamage();
    const aim = this.player.getAimDirection();

    // Harvest trees/rocks first — uses 3D aim so it works while flying
    const harvested = this.combat.tryAttackHarvestable(
      this.player.getAttackOrigin(),
      aim,
      damage,
      this.world.getHarvestables(),
    );
    if (harvested) {
      const label = harvested.type === 'tree' ? 'Tree' : 'Rock';
      if (harvested.destroyed) {
        this.hud.showToast(`${label} harvested!`);
      }
      return;
    }

    const arrowCount = this.inventory.countItem('arrow');
    if (this.hasBow && arrowCount > 0) {
      if (this.combat.tryRangedAttack(
        this.player.getAttackOrigin(),
        aim,
        ITEMS.bow.damage ?? 18,
      )) {
        this.inventory.removeItem('arrow', 1);
      }
      return;
    }

    if (this.hasBow && arrowCount === 0) {
      this.hud.showToast('Out of arrows — using melee');
    }

    const hit = this.combat.tryAttack(
      this.player.position,
      forward,
      damage,
      this.spawner.getAliveAnimals(),
    );
    if (hit?.dead) {
      this.combat.spawnLoot(hit);
      this.spawner.removeAnimal(hit);
      this.hud.showToast(`Defeated ${hit.config.name}`);
    }
  }

  private tryEat(): void {
    for (const foodId of ['cooked_meat', 'raw_meat'] as ItemId[]) {
      if (this.inventory.countItem(foodId) > 0) {
        this.inventory.removeItem(foodId, 1);
        this.hunger.eat(ITEMS[foodId].food ?? 20);
        this.hud.showToast(`Ate ${ITEMS[foodId].name}`);
        return;
      }
    }
    this.hud.showToast('No food in inventory');
  }

  private getAttackDamage(): number {
    let damage = 5;
    if (this.equippedWeapon) {
      damage = ITEMS[this.equippedWeapon].damage ?? 5;
    }
    // Tools are better for gathering
    if (this.equippedWeapon === 'stone_axe') damage = Math.max(damage, 15);
    if (this.equippedWeapon === 'stone_pickaxe') damage = Math.max(damage, 15);
    return damage;
  }

  private updateEquippedWeapon(): void {
    this.hasBow = this.inventory.countItem('bow') > 0;

    for (const weaponId of ['stone_sword', 'wooden_sword', 'stone_axe', 'stone_pickaxe'] as ItemId[]) {
      if (this.inventory.countItem(weaponId) > 0) {
        this.equippedWeapon = weaponId;
        return;
      }
    }
    this.equippedWeapon = null;
  }

  private respawn(): void {
    this.health.resetPartial();
    this.hunger.resetPartial();
    this.resetPlayerPosition();
    this.input.setWalkMode(false);
    this.hud.setMovementMode('fly');
    this.hud.setVehicleDisplay(null);
    this.updateEquippedWeapon();
  }

  private resetPlayerPosition(): void {
    const spawn = this.world.getSpawnPosition();
    this.player.resetTo(spawn);
  }

  private toggleInventoryOverlay(): void {
    const willOpen = !this.inventoryUI.isOpen();
    this.inventoryUI.toggle();
    if (willOpen) {
      document.exitPointerLock();
      this.input.setUiBlocking(true);
      this.touchControls.setActive(false);
      this.refreshUI();
    } else {
      this.onOverlayClosed();
    }
  }

  private onOverlayClosed(): void {
    this.input.setUiBlocking(false);
    if (this.state === 'playing') {
      this.touchControls.setActive(true);
    }
    if (this.state === 'playing' && !this.input.touchMode) {
      this.canvas.requestPointerLock();
    }
  }

  private refreshUI(): void {
    if (this.inventoryUI.isOpen()) this.inventoryUI.render(this.inventory);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
