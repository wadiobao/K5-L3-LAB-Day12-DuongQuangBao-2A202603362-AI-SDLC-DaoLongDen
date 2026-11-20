/**
 * @file main.ts
 * @description Interactive 3D WebGL View for all 3 Nights adhering to PRD-1 color palette,
 * three-best-practices (VRAM disposal, InstancedMesh, zero-allocation loop), and 3d-games camera rules.
 */

import * as THREE from 'three';
import { GameEngine, DEFAULT_TUNING_V11 } from './core/engine.js';
import { getJumpPads } from './core/terrain.js';
import { soundFx } from './render/audio.js';

// Pre-allocated scratch objects (three-best-practices zero-allocation render loop)
const _cameraTarget = new THREE.Vector3();
const _scratchVec = new THREE.Vector3();
const _scratchMatrix = new THREE.Matrix4();
const _projVec = new THREE.Vector3();

// Official PRD-1 Color Palette
const COLORS = {
  sky: 0x0e1430,
  fog: 0x1b2350,
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  cloudSea: 0x12384a,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternOff: 0x5b5f6e,
  moteCore: 0xfff6c2,
  shadeBody: 0x120a1a,
  shadeRim: 0x7a3cff,
  shadeStunned: 0x3a3450,
  mayRobe: 0xe8e2d0,
  mayScarf: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8
};

const NIGHT_INTROS: Record<number, { title: string; quote: string }> = {
  1: {
    title: 'Đêm 1 — Đảo Bến',
    quote: '"Mây ơi, sương đen đã nuốt chửng bến thuyền. Hãy thắp lại 5 Đèn Lồng Lớn trước khi trời rạng!" — Ông Đăng'
  },
  2: {
    title: 'Đêm 2 — Đảo Cau',
    quote: '"Cầu tre hẹp và Gió Lạc rất ranh mãnh! Hãy tận dụng bục nhảy và Bùa Gió để thắp đủ 6 ngọn đèn." — Ông Đăng'
  },
  3: {
    title: 'Đêm 3 — Đảo Chuông',
    quote: '"Ba tầng đảo và gió giật dữ dội. Thắp sáng cả 7 ngọn đèn để đón Bình Minh cho quần đảo!" — Ông Đăng'
  }
};

class GameView {
  private engine: GameEngine;
  private currentNight: number = 1;
  private totalCampaignScore: number = 0;
  private isInGame: boolean = false;
  private settingsReturnTo: 'menu' | 'pause' = 'menu';
  private lastCountdownSec: number = -1;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private ambientLight!: THREE.AmbientLight;

  // Dynamic level group for clean VRAM disposal on night switch
  private levelGroup: THREE.Group = new THREE.Group();
  private playerMesh!: THREE.Group;
  private hatLanternLight!: THREE.PointLight;
  private lanternLamps: THREE.Mesh[] = [];
  private lanternLights: THREE.PointLight[] = [];
  private moteInstancedMesh!: THREE.InstancedMesh;
  private shadePool: THREE.Mesh[] = [];
  private drifterPool: THREE.Mesh[] = [];
  private charmPool: THREE.Group[] = [];

  // Input State
  private keyState: Record<string, boolean> = {};
  private pendingJump: boolean = false;
  private pendingDash: boolean = false;
  private pendingInteract: boolean = false;
  private pendingPulse: boolean = false;

  // HUD & Overlays
  private hudEl!: HTMLElement;
  private flamesUI!: HTMLElement;
  private nightLabelUI!: HTMLElement;
  private lanternCountUI!: HTMLElement;
  private timeDisplayUI!: HTMLElement;
  private scoreDisplayUI!: HTMLElement;
  private moteSlotsUI!: HTMLElement;
  private interactPromptUI!: HTMLElement;
  private dashBadgeUI!: HTMLElement;
  private dashCdUI!: HTMLElement;
  private pulseBadgeUI!: HTMLElement;
  private pulseCdUI!: HTMLElement;
  private charmBadgeUI!: HTMLElement;
  private charmCdUI!: HTMLElement;
  private arrowUI!: HTMLElement;

  private menuOverlay!: HTMLElement;
  private introOverlay!: HTMLElement;
  private pauseOverlay!: HTMLElement;
  private settingsOverlay!: HTMLElement;
  private modalOverlay!: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    this.engine = new GameEngine(42, 1, DEFAULT_TUNING_V11);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.012);
    this.scene.add(this.levelGroup);

    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 260);
    this.camera.position.set(0, 12, -16);

    this.bindUI();
    this.setupLighting();
    this.buildStaticBackdrop();
    this.buildPlayer();
    this.buildEntityPools();
    this.buildNightGeometry(1);
    this.setupControls();

    window.addEventListener('resize', () => this.onWindowResize());
    this.startLoop();
  }

  private bindUI(): void {
    this.hudEl = document.getElementById('hud')!;
    this.flamesUI = document.getElementById('flames-ui')!;
    this.nightLabelUI = document.getElementById('night-label')!;
    this.lanternCountUI = document.getElementById('lantern-count')!;
    this.timeDisplayUI = document.getElementById('time-display')!;
    this.scoreDisplayUI = document.getElementById('score-display')!;
    this.moteSlotsUI = document.getElementById('mote-slots')!;
    this.interactPromptUI = document.getElementById('interact-prompt')!;
    this.dashBadgeUI = document.getElementById('dash-badge')!;
    this.dashCdUI = document.getElementById('dash-cd')!;
    this.pulseBadgeUI = document.getElementById('pulse-badge')!;
    this.pulseCdUI = document.getElementById('pulse-cd')!;
    this.charmBadgeUI = document.getElementById('charm-badge')!;
    this.charmCdUI = document.getElementById('charm-cd')!;
    this.arrowUI = document.getElementById('lantern-arrow')!;

    this.menuOverlay = document.getElementById('menu-overlay')!;
    this.introOverlay = document.getElementById('intro-overlay')!;
    this.pauseOverlay = document.getElementById('pause-overlay')!;
    this.settingsOverlay = document.getElementById('settings-overlay')!;
    this.modalOverlay = document.getElementById('game-modal')!;

    // Build 10 mote slots
    this.moteSlotsUI.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const div = document.createElement('div');
      div.className = 'mote-slot';
      this.moteSlotsUI.appendChild(div);
    }

    // Menu buttons
    document.getElementById('btn-start-game')!.addEventListener('click', () => {
      this.totalCampaignScore = 0;
      this.showNightIntro(1);
    });
    document.getElementById('btn-start-n2')!.addEventListener('click', () => this.showNightIntro(2));
    document.getElementById('btn-start-n3')!.addEventListener('click', () => this.showNightIntro(3));
    document.getElementById('btn-enter-night')!.addEventListener('click', () => this.startNight(this.currentNight));

    // Pause buttons
    document.getElementById('btn-resume')!.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-restart-night')!.addEventListener('click', () => this.startNight(this.currentNight));
    document.getElementById('btn-back-menu')!.addEventListener('click', () => this.showMenu());

    // Settings
    const volSlider = document.getElementById('vol-slider') as HTMLInputElement;
    const volVal = document.getElementById('vol-val')!;
    const sensSlider = document.getElementById('sens-slider') as HTMLInputElement;
    const sensVal = document.getElementById('sens-val')!;

    volSlider.value = String(Math.round(soundFx.getVolume() * 100));
    volVal.innerText = `${volSlider.value}%`;
    const savedSens = localStorage.getItem('ddl_sens') ?? '10';
    sensSlider.value = savedSens;
    sensVal.innerText = `${(parseInt(savedSens, 10) / 10).toFixed(1)}x`;

    volSlider.addEventListener('input', () => {
      volVal.innerText = `${volSlider.value}%`;
      soundFx.setVolume(parseInt(volSlider.value, 10) / 100);
    });
    sensSlider.addEventListener('input', () => {
      sensVal.innerText = `${(parseInt(sensSlider.value, 10) / 10).toFixed(1)}x`;
      localStorage.setItem('ddl_sens', sensSlider.value);
    });

    document.getElementById('btn-open-settings-menu')!.addEventListener('click', () => {
      this.settingsReturnTo = 'menu';
      this.menuOverlay.classList.remove('active');
      this.settingsOverlay.classList.add('active');
    });
    document.getElementById('btn-open-settings-pause')!.addEventListener('click', () => {
      this.settingsReturnTo = 'pause';
      this.pauseOverlay.classList.remove('active');
      this.settingsOverlay.classList.add('active');
    });
    document.getElementById('btn-close-settings')!.addEventListener('click', () => {
      this.settingsOverlay.classList.remove('active');
      if (this.settingsReturnTo === 'menu') this.menuOverlay.classList.add('active');
      else this.pauseOverlay.classList.add('active');
    });

    // Modal buttons
    document.getElementById('btn-restart')!.addEventListener('click', () => this.startNight(this.currentNight));
    document.getElementById('btn-next-night')!.addEventListener('click', () => this.showNightIntro(this.currentNight + 1));
    document.getElementById('btn-modal-menu')!.addEventListener('click', () => this.showMenu());
  }

  private showMenu(): void {
    this.isInGame = false;
    this.hudEl.style.display = 'none';
    this.arrowUI.style.display = 'none';
    this.introOverlay.classList.remove('active');
    this.pauseOverlay.classList.remove('active');
    this.modalOverlay.classList.remove('active');
    this.menuOverlay.classList.add('active');
  }

  private showNightIntro(night: number): void {
    this.currentNight = night;
    this.isInGame = false;
    const info = NIGHT_INTROS[night] ?? NIGHT_INTROS[1];
    document.getElementById('intro-title')!.innerText = info.title;
    document.getElementById('intro-quote')!.innerText = info.quote;
    this.menuOverlay.classList.remove('active');
    this.modalOverlay.classList.remove('active');
    this.introOverlay.classList.add('active');
  }

  private startNight(night: number): void {
    this.currentNight = night;
    this.lastCountdownSec = -1;
    this.engine = new GameEngine(Date.now() & 0xfffffff, night, DEFAULT_TUNING_V11);
    this.buildNightGeometry(night);

    this.nightLabelUI.innerText = NIGHT_INTROS[night]?.title ?? `Đêm ${night}`;
    this.introOverlay.classList.remove('active');
    this.pauseOverlay.classList.remove('active');
    this.modalOverlay.classList.remove('active');
    this.menuOverlay.classList.remove('active');
    this.hudEl.style.display = 'flex';
    this.isInGame = true;
  }

  private togglePause(): void {
    if (!this.isInGame || (this.engine.state !== 'playing' && this.engine.state !== 'paused')) return;
    if (this.engine.state === 'playing') {
      this.engine.step({ tick: this.engine.tickCount, pause: true });
      this.pauseOverlay.classList.add('active');
    } else if (this.engine.state === 'paused') {
      this.engine.step({ tick: this.engine.tickCount, pause: false });
      this.engine.step({ tick: this.engine.tickCount, pause: true });
      this.pauseOverlay.classList.remove('active');
    }
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0xd8e0ff, 0.15);
    this.scene.add(this.ambientLight);

    const moonLight = new THREE.DirectionalLight(0x9fb8ff, 0.9);
    moonLight.position.set(30, 65, -30);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 180;
    moonLight.shadow.camera.left = -60;
    moonLight.shadow.camera.right = 90;
    moonLight.shadow.camera.top = 60;
    moonLight.shadow.camera.bottom = -60;
    this.scene.add(moonLight);
  }

  private buildStaticBackdrop(): void {
    // Cloud sea plane beneath islands (#12384A)
    const seaGeo = new THREE.PlaneGeometry(500, 500);
    const seaMat = new THREE.MeshBasicMaterial({ color: COLORS.cloudSea });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -11;
    sea.matrixAutoUpdate = false;
    sea.updateMatrix();
    this.scene.add(sea);
  }

  private buildPlayer(): void {
    this.playerMesh = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.45, 1.15, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.mayRobe, roughness: 0.75 })
    );
    body.position.y = 0.58;
    body.castShadow = true;
    this.playerMesh.add(body);

    // Red Scarf (#C8102E)
    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.08, 8, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, roughness: 0.6 })
    );
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.12;
    this.playerMesh.add(scarf);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.5 })
    );
    head.position.y = 1.32;
    head.castShadow = true;
    this.playerMesh.add(head);

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.85 })
    );
    hat.position.y = 1.58;
    hat.castShadow = true;
    this.playerMesh.add(hat);

    // Creative Feature: Hanging mini lantern on Mây's conical hat
    const miniLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 10),
      new THREE.MeshStandardMaterial({ color: COLORS.lanternLit, emissive: COLORS.lanternLit, emissiveIntensity: 1.0 })
    );
    miniLamp.position.set(0.42, 1.42, 0.42);
    this.playerMesh.add(miniLamp);

    this.hatLanternLight = new THREE.PointLight(COLORS.lanternLit, 1.5, 7);
    this.hatLanternLight.position.set(0.42, 1.42, 0.42);
    this.playerMesh.add(this.hatLanternLight);

    this.scene.add(this.playerMesh);
  }

  private buildEntityPools(): void {
    // Motes InstancedMesh (capacity 64 handles up to 30 random + dropped motes in 1 draw call)
    const moteGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const moteMat = new THREE.MeshBasicMaterial({ color: COLORS.moteCore });
    this.moteInstancedMesh = new THREE.InstancedMesh(moteGeo, moteMat, 64);
    this.moteInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.moteInstancedMesh);

    // Shade pool (max 10)
    const shadeGeo = new THREE.SphereGeometry(0.75, 14, 14);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS.shadeBody,
        emissive: COLORS.shadeRim,
        emissiveIntensity: 0.65,
        roughness: 0.3
      });
      const mesh = new THREE.Mesh(shadeGeo, mat);
      mesh.visible = false;
      mesh.castShadow = true;
      this.shadePool.push(mesh);
      this.scene.add(mesh);
    }

    // Drifter pool (max 2) — flowing grey-blue silk ribbon (#8FA3B8)
    const drifterGeo = new THREE.BoxGeometry(1.4, 0.25, 0.5);
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS.drifter,
        emissive: COLORS.drifter,
        emissiveIntensity: 0.35,
        roughness: 0.4
      });
      const mesh = new THREE.Mesh(drifterGeo, mat);
      mesh.visible = false;
      this.drifterPool.push(mesh);
      this.scene.add(mesh);
    }

    // Charm pool (max 2) — red talisman with gold border
    for (let i = 0; i < 2; i++) {
      const group = new THREE.Group();
      const talisman = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.85, 0.08),
        new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, emissive: COLORS.mayScarf, emissiveIntensity: 0.4 })
      );
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.92, 0.04),
        new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.5 })
      );
      group.add(trim, talisman);
      group.visible = false;
      this.charmPool.push(group);
      this.scene.add(group);
    }
  }

  /**
   * Disposes all GPU geometries and materials in levelGroup before loading a new Night (three-best-practices).
   */
  private disposeLevelGroup(): void {
    this.levelGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    });
    this.levelGroup.clear();
    this.lanternLamps = [];
    this.lanternLights = [];
  }

  private buildNightGeometry(night: number): void {
    this.disposeLevelGroup();
    const grassMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.88 });
    const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.85 });
    const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.9 });

    if (night === 1) {
      const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 38, 4, 48), grassMat);
      island.position.set(0, -2, 0);
      island.receiveShadow = true;
      island.matrixAutoUpdate = false;
      island.updateMatrix();
      this.levelGroup.add(island);
    } else if (night === 2) {
      const islandA = new THREE.Mesh(new THREE.CylinderGeometry(28, 26, 4, 40), grassMat);
      islandA.position.set(0, -2, 0);
      islandA.receiveShadow = true;
      islandA.matrixAutoUpdate = false;
      islandA.updateMatrix();
      this.levelGroup.add(islandA);

      const islandB = new THREE.Mesh(new THREE.CylinderGeometry(28, 26, 4, 40), grassMat);
      islandB.position.set(70, -2, 0);
      islandB.receiveShadow = true;
      islandB.matrixAutoUpdate = false;
      islandB.updateMatrix();
      this.levelGroup.add(islandB);

      // Bamboo bridge x in [26, 44], z in [-2, 2]
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 4), woodMat);
      bridge.position.set(35, -0.25, 0);
      bridge.receiveShadow = true;
      bridge.matrixAutoUpdate = false;
      bridge.updateMatrix();
      this.levelGroup.add(bridge);
    } else if (night === 3) {
      // Tier 0: R=45m, Y=0
      const tier0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 43, 4, 48), grassMat);
      tier0.position.set(0, -2, 0);
      tier0.receiveShadow = true;
      tier0.matrixAutoUpdate = false;
      tier0.updateMatrix();
      this.levelGroup.add(tier0);

      // Tier 1: Half-ring R=12..24, z > 0, Y=3
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 24, 0, Math.PI, false);
      shape.absarc(0, 0, 12, Math.PI, 0, true);
      const t1Geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
      t1Geo.rotateX(Math.PI / 2);
      const tier1 = new THREE.Mesh(t1Geo, sandMat);
      tier1.position.set(0, 3, 0);
      tier1.receiveShadow = true;
      tier1.matrixAutoUpdate = false;
      tier1.updateMatrix();
      this.levelGroup.add(tier1);

      // Tier 2: Central disk R=8, Y=6
      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 32), sandMat);
      tier2.position.set(0, 3, 0);
      tier2.receiveShadow = true;
      tier2.matrixAutoUpdate = false;
      tier2.updateMatrix();
      this.levelGroup.add(tier2);

      // Bell Tower: R=2, H=8 on Tier 2
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 20), woodMat);
      tower.position.set(0, 10, 0);
      tower.castShadow = true;
      tower.matrixAutoUpdate = false;
      tower.updateMatrix();
      this.levelGroup.add(tower);

      // 2 Ramps at 30 deg & 150 deg
      for (const deg of [30, 150]) {
        const rad = (deg * Math.PI) / 180;
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.4, 3), woodMat);
        ramp.position.set(Math.cos(rad) * 27, 1.5, Math.sin(rad) * 27);
        ramp.rotation.y = -rad;
        ramp.rotation.z = -Math.atan2(3, 6);
        ramp.receiveShadow = true;
        ramp.matrixAutoUpdate = false;
        ramp.updateMatrix();
        this.levelGroup.add(ramp);
      }
    }

    // Jump Pads
    const padMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.lanternLit, emissiveIntensity: 0.7 });
    for (const pad of getJumpPads(night)) {
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(pad.radius, pad.radius * 1.1, 0.25, 20), padMat);
      padMesh.position.set(pad.pos[0], pad.pos[1] + 0.12, pad.pos[2]);
      padMesh.matrixAutoUpdate = false;
      padMesh.updateMatrix();
      this.levelGroup.add(padMesh);
    }

    // Lanterns
    for (const lantern of this.engine.lanterns) {
      const group = new THREE.Group();
      group.position.set(lantern.pos[0], lantern.pos[1], lantern.pos[2]);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.42, 3.4, 12),
        new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.85 })
      );
      pillar.position.y = 1.7;
      pillar.castShadow = true;
      group.add(pillar);

      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.48, 1.0, 12),
        new THREE.MeshStandardMaterial({ color: COLORS.lanternOff, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.35 })
      );
      lamp.position.y = 3.6;
      group.add(lamp);

      const light = new THREE.PointLight(COLORS.lanternLit, 0, 18);
      light.position.y = 3.6;
      group.add(light);

      group.matrixAutoUpdate = false;
      group.updateMatrix();
      this.lanternLamps.push(lamp);
      this.lanternLights.push(light);
      this.levelGroup.add(group);
    }
  }

  private setupControls(): void {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') {
        this.togglePause();
        return;
      }
      this.keyState[k] = true;
      if (k === ' ') this.pendingJump = true;
      if (k === 'shift' || k === 'j') this.pendingDash = true;
      if (k === 'e') this.pendingInteract = true;
      if (k === 'f') this.pendingPulse = true;
    });

    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      this.keyState[k] = false;
      if (k === ' ') this.pendingJump = false;
      if (k === 'shift' || k === 'j') this.pendingDash = false;
      if (k === 'e') this.pendingInteract = false;
      if (k === 'f') this.pendingPulse = false;
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateHUD(): void {
    if (!this.isInGame) return;

    // 1. Flames
    const flameIcons = this.flamesUI.querySelectorAll('.flame-icon');
    flameIcons.forEach((el, idx) => {
      el.classList.toggle('lost', idx >= this.engine.player.flames);
    });

    // 2. Timer mm:ss (turns red & blinks when <= 30s; plays tick at <= 10s)
    const timeLeft = Math.ceil(this.engine.getTimeLeftSeconds());
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    this.timeDisplayUI.innerText = `${mins}:${secs}`;
    this.timeDisplayUI.classList.toggle('danger', timeLeft <= 30);
    if (timeLeft <= 10 && timeLeft > 0 && timeLeft !== this.lastCountdownSec && this.engine.state === 'playing') {
      this.lastCountdownSec = timeLeft;
      soundFx.playCountdownTick();
    }

    // 3. Lanterns & Score
    const litCount = this.engine.lanterns.filter(l => l.lit).length;
    this.lanternCountUI.innerText = `${litCount} / ${this.engine.lanterns.length}`;
    this.scoreDisplayUI.innerText = `${this.engine.score}`;

    // 4. 10-slot Mote Bar
    const slots = this.moteSlotsUI.children;
    for (let i = 0; i < slots.length; i++) {
      slots[i].classList.toggle('filled', i < this.engine.player.carried);
    }

    // 5. Proximity Interact Prompt
    let nearUnlit = null;
    let nearestOffscreen: { pos: [number, number, number]; dist: number } | null = null;
    for (const l of this.engine.lanterns) {
      if (l.lit) continue;
      const dx = l.pos[0] - this.engine.player.pos[0];
      const dz = l.pos[2] - this.engine.player.pos[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= this.engine.tuning.interact_radius) nearUnlit = l;
      if (!nearestOffscreen || d < nearestOffscreen.dist) {
        nearestOffscreen = { pos: l.pos, dist: d };
      }
    }
    if (nearUnlit) {
      this.interactPromptUI.style.display = 'block';
      this.interactPromptUI.innerText = `E — Nạp ánh sáng (${nearUnlit.deposited}/10)`;
    } else {
      this.interactPromptUI.style.display = 'none';
    }

    // 6. Off-screen Arrow to Nearest Unlit Lantern
    if (nearestOffscreen) {
      _projVec.set(nearestOffscreen.pos[0], nearestOffscreen.pos[1] + 3.6, nearestOffscreen.pos[2]);
      _projVec.project(this.camera);
      const offScreen = Math.abs(_projVec.x) > 0.95 || Math.abs(_projVec.y) > 0.95 || _projVec.z > 1;
      if (offScreen) {
        const dx = nearestOffscreen.pos[0] - this.engine.player.pos[0];
        const dz = nearestOffscreen.pos[2] - this.engine.player.pos[2];
        const dirText = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? '→ Phải' : '← Trái') : (dz > 0 ? '↑ Trước' : '↓ Sau');
        this.arrowUI.style.display = 'block';
        this.arrowUI.innerText = `${dirText} · Đèn gần nhất (${Math.round(nearestOffscreen.dist)}m)`;
      } else {
        this.arrowUI.style.display = 'none';
      }
    } else {
      this.arrowUI.style.display = 'none';
    }

    // 7. Cooldowns & Charm
    const dashCd = this.engine.player.dashCooldownTicks / 60;
    const pulseCd = this.engine.player.pulseCooldownTicks / 60;
    const charmSec = this.engine.player.charmTicks / 60;

    if (charmSec > 0) {
      this.charmBadgeUI.style.display = 'block';
      this.charmCdUI.innerText = `${charmSec.toFixed(1)}s`;
    } else {
      this.charmBadgeUI.style.display = 'none';
    }

    if (dashCd > 0 && charmSec <= 0) {
      this.dashBadgeUI.className = 'ability-badge cd';
      this.dashCdUI.innerText = `${dashCd.toFixed(1)}s`;
    } else {
      this.dashBadgeUI.className = 'ability-badge ready';
      this.dashCdUI.innerText = 'Sẵn sàng';
    }

    if (pulseCd > 0) {
      this.pulseBadgeUI.className = 'ability-badge cd';
      this.pulseCdUI.innerText = `${pulseCd.toFixed(1)}s`;
    } else if (this.engine.player.carried < this.engine.tuning.pulse_cost) {
      this.pulseBadgeUI.className = 'ability-badge cd';
      this.pulseCdUI.innerText = `Cần 3 đom đóm`;
    } else {
      this.pulseBadgeUI.className = 'ability-badge ready';
      this.pulseCdUI.innerText = 'Sẵn sàng';
    }

    // 8. End Screen Modal
    if ((this.engine.state === 'won' || this.engine.state === 'lost') && !this.modalOverlay.classList.contains('active')) {
      this.modalOverlay.classList.add('active');
      const titleEl = document.getElementById('modal-title')!;
      const descEl = document.getElementById('modal-desc')!;
      const nextBtn = document.getElementById('btn-next-night')!;

      if (this.engine.state === 'won') {
        soundFx.playWin();
        this.totalCampaignScore += this.engine.score;
        if (this.currentNight < 3) {
          titleEl.innerText = `HOÀN THÀNH ĐÊM ${this.currentNight}!`;
          titleEl.style.color = '#F2C14E';
          descEl.innerText = `Điểm Đêm ${this.currentNight}: ${this.engine.score} · Tổng điểm hành trình: ${this.totalCampaignScore}`;
          nextBtn.style.display = 'inline-block';
        } else {
          titleEl.innerText = 'BÌNH MINH ĐÃ ĐẾN!';
          titleEl.style.color = '#FFE9B0';
          descEl.innerText = `Bạn đã thắp sáng toàn bộ Ba Hòn Đảo! Tổng điểm chiến dịch: ${this.totalCampaignScore}`;
          nextBtn.style.display = 'none';
        }
      } else {
        soundFx.playLose();
        titleEl.innerText = 'ĐÊM TỐI BAO PHỦ';
        titleEl.style.color = '#FF5A5F';
        descEl.innerText = `Thử lại Đêm ${this.currentNight} để giữ ngọn lửa cho hòn đảo. Điểm hiện tại: ${this.engine.score}`;
        nextBtn.style.display = 'none';
      }
    }
  }

  private startLoop(): void {
    let lastTime = performance.now();
    let accumulatedTime = 0;
    const fixedStep = 1000 / 60;

    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);

      const delta = currentTime - lastTime;
      lastTime = currentTime;

      if (this.isInGame && this.engine.state === 'playing') {
        accumulatedTime += Math.min(delta, 100);
        while (accumulatedTime >= fixedStep) {
          accumulatedTime -= fixedStep;

          let moveX = 0;
          let moveZ = 0;
          if (this.keyState['w'] || this.keyState['arrowup']) moveZ += 1;
          if (this.keyState['s'] || this.keyState['arrowdown']) moveZ -= 1;
          if (this.keyState['a'] || this.keyState['arrowleft']) moveX -= 1;
          if (this.keyState['d'] || this.keyState['arrowright']) moveX += 1;

          const wasGrounded = this.engine.player.grounded;
          const events = this.engine.step({
            tick: this.engine.tickCount,
            move: [moveX, moveZ],
            cam_yaw_deg: 0,
            jump: this.pendingJump,
            dash: this.pendingDash,
            interact: this.pendingInteract,
            pulse: this.pendingPulse
          });

          if (wasGrounded && !this.engine.player.grounded && this.engine.player.vel[1] > 0) {
            soundFx.playJump();
          }
          for (const ev of events) {
            if (ev.name === 'mote_picked') soundFx.playMotePickup();
            else if (ev.name === 'lantern_lit') soundFx.playLanternLit();
            else if (ev.name === 'pulse') soundFx.playPulse();
            else if (ev.name === 'dash') soundFx.playDash();
            else if (ev.name === 'player_hit') soundFx.playHurt();
            else if (ev.name === 'shade_spawned') soundFx.playShadeSpawn();
          }
        }
      }

      this.updateVisuals();
      this.updateHUD();
      this.renderer.render(this.scene, this.camera);
    };

    requestAnimationFrame(animate);
  }

  private updateVisuals(): void {
    const time = performance.now() * 0.003;

    // 1. Dynamic Ambient Light per PRD-1: 0.15 + 0.55 * (lit / total)
    const litCount = this.engine.lanterns.filter(l => l.lit).length;
    const totalLanterns = Math.max(1, this.engine.lanterns.length);
    this.ambientLight.intensity = 0.15 + 0.55 * (litCount / totalLanterns);

    // 2. Player position & Hat Lantern dynamic glow
    this.playerMesh.position.set(this.engine.player.pos[0], this.engine.player.pos[1], this.engine.player.pos[2]);
    const carryRatio = this.engine.player.carried / this.engine.tuning.carry_capacity;
    this.hatLanternLight.intensity = 0.6 + carryRatio * 3.4;

    // 3. Smooth third-person camera follow
    _cameraTarget.set(this.engine.player.pos[0], this.engine.player.pos[1] + 1.4, this.engine.player.pos[2]);
    _scratchVec.set(this.engine.player.pos[0], this.engine.player.pos[1] + 9.5, this.engine.player.pos[2] - 14);
    this.camera.position.lerp(_scratchVec, 0.08);
    this.camera.lookAt(_cameraTarget);

    // 4. Lanterns
    this.engine.lanterns.forEach((l, idx) => {
      const lamp = this.lanternLamps[idx];
      const light = this.lanternLights[idx];
      if (!lamp || !light) return;
      const mat = lamp.material as THREE.MeshStandardMaterial;
      if (l.lit) {
        mat.color.setHex(COLORS.lanternCore);
        mat.emissive.setHex(COLORS.lanternLit);
        mat.emissiveIntensity = 1.8;
        light.intensity = 4.5;
      } else if (l.deposited > 0) {
        const ratio = l.deposited / this.engine.tuning.lantern_cost;
        mat.emissive.setHex(COLORS.lanternLit);
        mat.emissiveIntensity = ratio * 0.7;
        light.intensity = ratio * 1.2;
      }
    });

    // 5. Motes InstancedMesh (up to 64 active motes)
    const activeMotes = this.engine.motes.filter(m => m.active);
    for (let i = 0; i < 64; i++) {
      if (i < activeMotes.length) {
        const m = activeMotes[i];
        const floatY = m.pos[1] + 0.55 + Math.sin(time + i * 1.3) * 0.2;
        _scratchMatrix.makeTranslation(m.pos[0], floatY, m.pos[2]);
      } else {
        _scratchMatrix.makeTranslation(0, -999, 0);
      }
      this.moteInstancedMesh.setMatrixAt(i, _scratchMatrix);
    }
    this.moteInstancedMesh.instanceMatrix.needsUpdate = true;

    // 6. Shades Pool
    for (let i = 0; i < this.shadePool.length; i++) {
      const mesh = this.shadePool[i];
      if (i < this.engine.shades.length) {
        const s = this.engine.shades[i];
        mesh.visible = true;
        mesh.position.set(s.pos[0], s.pos[1] + 0.9 + Math.sin(time * 2 + i) * 0.15, s.pos[2]);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(s.state === 'stunned' ? COLORS.shadeStunned : COLORS.shadeRim);
      } else {
        mesh.visible = false;
      }
    }

    // 7. Drifters Pool
    const activeDrifters = this.engine.drifters.filter(d => d.state !== 'removed');
    for (let i = 0; i < this.drifterPool.length; i++) {
      const mesh = this.drifterPool[i];
      if (i < activeDrifters.length) {
        const d = activeDrifters[i];
        mesh.visible = true;
        mesh.position.set(d.pos[0], d.pos[1] + 1.8 + Math.sin(time * 3 + i) * 0.25, d.pos[2]);
        mesh.rotation.y = time * 1.5 + i;
      } else {
        mesh.visible = false;
      }
    }

    // 8. Charms Pool
    for (let i = 0; i < this.charmPool.length; i++) {
      const group = this.charmPool[i];
      if (i < this.engine.charms.length && this.engine.charms[i].available) {
        const c = this.engine.charms[i];
        group.visible = true;
        group.position.set(c.pos[0], c.pos[1] + 1.0 + Math.sin(time * 2.5) * 0.15, c.pos[2]);
        group.rotation.y = time * 2;
      } else {
        group.visible = false;
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameView();
});
