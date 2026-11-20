/**
 * @file main.ts
 * @description Interactive 3D WebGL View for all 3 Nights with rich procedural visuals & animations,
 * adhering to PRD-1 palette, three-best-practices (VRAM disposal, InstancedMesh, zero-allocation loop),
 * and 3d-games camera rules.
 */

import * as THREE from 'three';
import { GameEngine, DEFAULT_TUNING_V11 } from './core/engine.js';
import { getJumpPads } from './core/terrain.js';
import { soundFx } from './render/audio.js';
import {
  COLORS,
  PlayerRig,
  LanternVisual,
  ShadeVisual,
  DrifterVisual,
  PulseVfx,
  createPlayerRig,
  createLanternVisual,
  createShadeVisual,
  createDrifterVisual,
  createCharmVisual,
  createPulseVfx,
  addIslandDecorations
} from './render/visuals.js';

// Pre-allocated scratch objects (zero-allocation render loop per three-best-practices)
const _cameraTarget = new THREE.Vector3();
const _scratchVec = new THREE.Vector3();
const _scratchMatrix = new THREE.Matrix4();
const _scratchScale = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _projVec = new THREE.Vector3();

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
  private colorblindMode: boolean = false;
  private playerYaw: number = 0;
  private runCycle: number = 0;
  private landingSquash: number = 0;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private ambientLight!: THREE.AmbientLight;

  // Dynamic level group for clean VRAM disposal on night switch
  private levelGroup: THREE.Group = new THREE.Group();
  private playerRig!: PlayerRig;
  private lanternVisuals: LanternVisual[] = [];
  private moteCoreInstanced!: THREE.InstancedMesh;
  private moteHaloInstanced!: THREE.InstancedMesh;
  private windLeavesInstanced!: THREE.InstancedMesh;
  private cloudPuffs: THREE.Mesh[] = [];
  private jumpPadRings: THREE.Mesh[] = [];
  private bellMesh: THREE.Mesh | null = null;
  private shadePool: ShadeVisual[] = [];
  private drifterPool: DrifterVisual[] = [];
  private charmPool: THREE.Group[] = [];
  private pulseVfx!: PulseVfx;

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
  private capacityLabelUI!: HTMLElement;
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.0105);
    this.scene.add(this.levelGroup);

    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.position.set(0, 12, -16);

    this.bindUI();
    this.setupLighting();
    this.buildStaticBackdrop();
    this.playerRig = createPlayerRig();
    this.scene.add(this.playerRig.root);
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
    this.capacityLabelUI = document.getElementById('capacity-label')!;
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

    this.moteSlotsUI.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const div = document.createElement('div');
      div.className = 'mote-slot';
      this.moteSlotsUI.appendChild(div);
    }

    document.getElementById('btn-start-game')!.addEventListener('click', () => {
      this.totalCampaignScore = 0;
      this.showNightIntro(1);
    });
    document.getElementById('btn-start-n2')!.addEventListener('click', () => this.showNightIntro(2));
    document.getElementById('btn-start-n3')!.addEventListener('click', () => this.showNightIntro(3));
    document.getElementById('btn-enter-night')!.addEventListener('click', () => this.startNight(this.currentNight));

    document.getElementById('btn-resume')!.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-restart-night')!.addEventListener('click', () => this.startNight(this.currentNight));
    document.getElementById('btn-back-menu')!.addEventListener('click', () => this.showMenu());

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

    const cbColorblind = document.getElementById('cb-colorblind') as HTMLInputElement;
    this.colorblindMode = localStorage.getItem('ddl_colorblind') === 'true';
    cbColorblind.checked = this.colorblindMode;
    document.body.classList.toggle('colorblind', this.colorblindMode);
    cbColorblind.addEventListener('change', () => {
      this.colorblindMode = cbColorblind.checked;
      localStorage.setItem('ddl_colorblind', String(this.colorblindMode));
      document.body.classList.toggle('colorblind', this.colorblindMode);
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
    this.playerYaw = 0;
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

    const hemi = new THREE.HemisphereLight(0x4c5fa8, 0x12384a, 0.35);
    this.scene.add(hemi);

    const moonLight = new THREE.DirectionalLight(0xb8ccff, 1.0);
    moonLight.position.set(45, 75, 55);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 200;
    moonLight.shadow.camera.left = -65;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 65;
    moonLight.shadow.camera.bottom = -65;
    this.scene.add(moonLight);
  }

  private buildStaticBackdrop(): void {
    // Cloud sea plane (#12384A)
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshBasicMaterial({ color: COLORS.cloudSea })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -11;
    sea.matrixAutoUpdate = false;
    sea.updateMatrix();
    this.scene.add(sea);

    // Glowing Moon high in the +Z sky
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(9, 20, 20),
      new THREE.MeshBasicMaterial({ color: COLORS.lanternCore })
    );
    moon.position.set(55, 78, 130);
    moon.matrixAutoUpdate = false;
    moon.updateMatrix();
    this.scene.add(moon);

    // Starfield (Points — 1 draw call)
    const starPositions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = 175 + Math.random() * 35;
      starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      starPositions[i * 3 + 1] = Math.cos(phi) * r + 15;
      starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xfff6c2, size: 1.1, transparent: true, opacity: 0.8 })
    );
    stars.matrixAutoUpdate = false;
    stars.updateMatrix();
    this.scene.add(stars);

    // Drifting Cloud Sea Puffs around the horizon
    const cloudGeo = new THREE.DodecahedronGeometry(6, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x1c4b62,
      roughness: 0.95,
      transparent: true,
      opacity: 0.55
    });
    for (let i = 0; i < 18; i++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      const angle = (i / 18) * Math.PI * 2;
      const radius = 58 + (i % 3) * 18;
      puff.position.set(Math.cos(angle) * radius, -6 - (i % 4), Math.sin(angle) * radius);
      puff.scale.set(2.2, 0.55, 1.6);
      this.cloudPuffs.push(puff);
      this.scene.add(puff);
    }
  }

  private buildEntityPools(): void {
    // Dual-layer Motes InstancedMesh (bright core + soft translucent halo)
    this.moteCoreInstanced = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.moteCore }),
      64
    );
    this.moteHaloInstanced = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.38, 10, 10),
      new THREE.MeshBasicMaterial({ color: COLORS.moteGlow, transparent: true, opacity: 0.35 }),
      64
    );
    this.moteCoreInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.moteHaloInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.moteCoreInstanced, this.moteHaloInstanced);

    // Wind leaves InstancedMesh for Night 3 gusts (40 leaves)
    this.windLeavesInstanced = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.35, 0.16),
      new THREE.MeshBasicMaterial({ color: COLORS.sand, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
      40
    );
    this.windLeavesInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.windLeavesInstanced.visible = false;
    this.scene.add(this.windLeavesInstanced);

    // Shades pool (max 10)
    for (let i = 0; i < 10; i++) {
      const sv = createShadeVisual();
      this.shadePool.push(sv);
      this.scene.add(sv.root);
    }

    // Drifters pool (max 2)
    for (let i = 0; i < 2; i++) {
      const dv = createDrifterVisual();
      this.drifterPool.push(dv);
      this.scene.add(dv.root);
    }

    // Charms pool (max 2)
    for (let i = 0; i < 2; i++) {
      const cv = createCharmVisual();
      this.charmPool.push(cv);
      this.scene.add(cv);
    }

    // Pulse Shockwave VFX
    this.pulseVfx = createPulseVfx();
    this.scene.add(this.pulseVfx.ring, this.pulseVfx.dome);
  }

  private disposeLevelGroup(): void {
    this.levelGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    });
    this.levelGroup.clear();
    this.lanternVisuals = [];
    this.jumpPadRings = [];
    this.bellMesh = null;
  }

  private buildNightGeometry(night: number): void {
    this.disposeLevelGroup();
    const grassMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.88 });
    const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.84 });
    const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.9 });

    const addIslandDisc = (cx: number, cz: number, radius: number) => {
      // Grass surface
      const top = new THREE.Mesh(new THREE.CylinderGeometry(radius - 1.2, radius, 0.8, 48), grassMat);
      top.position.set(cx, -0.4, cz);
      top.receiveShadow = true;
      top.matrixAutoUpdate = false;
      top.updateMatrix();
      this.levelGroup.add(top);

      // Sandy rim & rocky underside cliff
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius - 4, 4.5, 48), sandMat);
      rim.position.set(cx, -2.65, cz);
      rim.receiveShadow = true;
      rim.matrixAutoUpdate = false;
      rim.updateMatrix();
      this.levelGroup.add(rim);
    };

    if (night === 1) {
      addIslandDisc(0, 0, 40);
    } else if (night === 2) {
      addIslandDisc(0, 0, 28);
      addIslandDisc(70, 0, 28);

      // Detailed Bamboo Bridge (planks + side beams)
      for (let x = 26.4; x <= 43.6; x += 0.9) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 4.0), woodMat);
        plank.position.set(x, -0.11, 0);
        plank.receiveShadow = true;
        plank.matrixAutoUpdate = false;
        plank.updateMatrix();
        this.levelGroup.add(plank);
      }
      for (const zBeam of [-1.85, 1.85]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.25, 0.28), woodMat);
        beam.position.set(35, -0.22, zBeam);
        beam.matrixAutoUpdate = false;
        beam.updateMatrix();
        this.levelGroup.add(beam);
      }
    } else if (night === 3) {
      addIslandDisc(0, 0, 45);

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
      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.4, 6, 32), sandMat);
      tier2.position.set(0, 3, 0);
      tier2.receiveShadow = true;
      tier2.matrixAutoUpdate = false;
      tier2.updateMatrix();
      this.levelGroup.add(tier2);

      // Ornate Bell Tower on Tier 2
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.1, 7.5, 16), woodMat);
      tower.position.set(0, 9.75, 0);
      tower.castShadow = true;
      tower.matrixAutoUpdate = false;
      tower.updateMatrix();
      this.levelGroup.add(tower);

      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 8), woodMat);
      towerRoof.position.set(0, 14.4, 0);
      towerRoof.castShadow = true;
      towerRoof.matrixAutoUpdate = false;
      towerRoof.updateMatrix();
      this.levelGroup.add(towerRoof);

      // Gently swaying golden bell inside tower
      const bell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.8, 1.3, 12),
        new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.65, roughness: 0.3 })
      );
      bell.position.set(0, 11.2, 0);
      this.bellMesh = bell;
      this.levelGroup.add(bell);

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

    // Animated Jump Pads
    const padBaseMat = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      emissive: COLORS.lanternLit,
      emissiveIntensity: 0.7
    });
    const padRingMat = new THREE.MeshBasicMaterial({
      color: COLORS.lanternCore,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const avoidList: Array<[number, number, number]> = this.engine.lanterns.map(l => l.pos);
    for (const pad of getJumpPads(night)) {
      avoidList.push(pad.pos);
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(pad.radius, pad.radius * 1.15, 0.24, 20), padBaseMat);
      padMesh.position.set(pad.pos[0], pad.pos[1] + 0.12, pad.pos[2]);
      padMesh.matrixAutoUpdate = false;
      padMesh.updateMatrix();
      this.levelGroup.add(padMesh);

      const ring = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.95, 24), padRingMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pad.pos[0], pad.pos[1] + 0.35, pad.pos[2]);
      ring.userData.baseY = pad.pos[1] + 0.35;
      this.jumpPadRings.push(ring);
      this.levelGroup.add(ring);
    }

    // Detailed Pagoda Lanterns
    for (const lantern of this.engine.lanterns) {
      const lv = createLanternVisual(lantern.pos);
      this.lanternVisuals.push(lv);
      this.levelGroup.add(lv.group);
    }

    // Decorative Trees & Mossy Rocks (InstancedMesh)
    addIslandDecorations(this.levelGroup, night, avoidList);
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

    const flameIcons = this.flamesUI.querySelectorAll('.flame-icon');
    flameIcons.forEach((el, idx) => {
      el.classList.toggle('lost', idx >= this.engine.player.flames);
    });

    const timeLeft = Math.ceil(this.engine.getTimeLeftSeconds());
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    const isDangerTime = timeLeft <= 30;
    this.timeDisplayUI.innerText = isDangerTime && this.colorblindMode ? `⚠ ${mins}:${secs}` : `${mins}:${secs}`;
    this.timeDisplayUI.classList.toggle('danger', isDangerTime);
    if (timeLeft <= 10 && timeLeft > 0 && timeLeft !== this.lastCountdownSec && this.engine.state === 'playing') {
      this.lastCountdownSec = timeLeft;
      soundFx.playCountdownTick();
    }

    const litCount = this.engine.lanterns.filter(l => l.lit).length;
    const reqCount = Math.ceil(this.engine.tuning.win_ratio * this.engine.lanterns.length);
    this.lanternCountUI.innerText = `${litCount} / ${this.engine.lanterns.length} (cần ≥${reqCount})`;
    this.scoreDisplayUI.innerText = `${this.engine.score}`;

    this.capacityLabelUI.innerText = `${this.engine.player.carried} / ${this.engine.player.capacity}`;
    const slots = this.moteSlotsUI.children;
    for (let i = 0; i < slots.length; i++) {
      const scaledFilled = Math.round((this.engine.player.carried / this.engine.player.capacity) * slots.length);
      slots[i].classList.toggle('filled', i < scaledFilled);
    }

    let nearActionLantern = null;
    let nearestOffscreen: { pos: [number, number, number]; dist: number } | null = null;
    for (const l of this.engine.lanterns) {
      const fuel = this.engine.getLanternFuel(l);
      const canAccept = !l.lit || fuel < this.engine.tuning.fuel_max;
      const dx = l.pos[0] - this.engine.player.pos[0];
      const dz = l.pos[2] - this.engine.player.pos[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (canAccept && d <= this.engine.tuning.interact_radius) nearActionLantern = l;
      if (!l.lit && (!nearestOffscreen || d < nearestOffscreen.dist)) {
        nearestOffscreen = { pos: l.pos, dist: d };
      }
    }
    if (nearActionLantern) {
      this.interactPromptUI.style.display = 'block';
      if (nearActionLantern.lit) {
        const f = Math.round(this.engine.getLanternFuel(nearActionLantern));
        this.interactPromptUI.innerText = `E — Châm dầu (${f}/100)`;
      } else {
        const cost = nearActionLantern.ever_lit ? this.engine.tuning.relight_cost : this.engine.tuning.lantern_cost;
        this.interactPromptUI.innerText = `E — Nạp ánh sáng (${nearActionLantern.deposited}/${cost})`;
      }
    } else {
      this.interactPromptUI.style.display = 'none';
    }

    if (nearestOffscreen) {
      _projVec.set(nearestOffscreen.pos[0], nearestOffscreen.pos[1] + 4.0, nearestOffscreen.pos[2]);
      _projVec.project(this.camera);
      const offScreen = Math.abs(_projVec.x) > 0.95 || Math.abs(_projVec.y) > 0.95 || _projVec.z > 1;
      if (offScreen) {
        const dx = nearestOffscreen.pos[0] - this.engine.player.pos[0];
        const dz = nearestOffscreen.pos[2] - this.engine.player.pos[2];
        const dirText = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? '← Trái' : '→ Phải') : (dz > 0 ? '↑ Trước' : '↓ Sau');
        this.arrowUI.style.display = 'block';
        this.arrowUI.innerText = `${dirText} · Đèn gần nhất (${Math.round(nearestOffscreen.dist)}m)`;
      } else {
        this.arrowUI.style.display = 'none';
      }
    } else {
      this.arrowUI.style.display = 'none';
    }

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

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (this.isInGame && this.engine.state === 'playing') {
        accumulatedTime += delta * 1000;
        while (accumulatedTime >= fixedStep) {
          accumulatedTime -= fixedStep;

          let moveX = 0;
          let moveZ = 0;
          if (this.keyState['w'] || this.keyState['arrowup']) moveZ += 1;
          if (this.keyState['s'] || this.keyState['arrowdown']) moveZ -= 1;
          // Camera looks along +Z in right-handed Three.js space: +X is screen-left, -X is screen-right
          if (this.keyState['a'] || this.keyState['arrowleft']) moveX += 1;
          if (this.keyState['d'] || this.keyState['arrowright']) moveX -= 1;

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
          if (!wasGrounded && this.engine.player.grounded) {
            this.landingSquash = 1.0; // Trigger subtle landing squash
          }
          for (const ev of events) {
            if (ev.name === 'mote_picked') soundFx.playMotePickup();
            else if (ev.name === 'lantern_lit') soundFx.playLanternLit();
            else if (ev.name === 'pulse') {
              soundFx.playPulse();
              this.triggerPulseVfx();
            } else if (ev.name === 'dash') soundFx.playDash();
            else if (ev.name === 'player_hit') soundFx.playHurt();
            else if (ev.name === 'shade_spawned') soundFx.playShadeSpawn();
          }
        }
      }

      this.updateVisuals(delta);
      this.updateHUD();
      this.renderer.render(this.scene, this.camera);
    };

    requestAnimationFrame(animate);
  }

  private triggerPulseVfx(): void {
    this.pulseVfx.active = true;
    this.pulseVfx.progress = 0;
    const p = this.engine.player.pos;
    this.pulseVfx.ring.position.set(p[0], p[1] + 0.15, p[2]);
    this.pulseVfx.dome.position.set(p[0], p[1] + 0.8, p[2]);
    this.pulseVfx.ring.visible = true;
    this.pulseVfx.dome.visible = true;
  }

  private updateVisuals(dt: number): void {
    const time = performance.now() * 0.001;
    const p = this.engine.player;

    // 1. Dynamic Ambient Light per PRD-1: 0.15 + 0.55 * (lit / total)
    const litCount = this.engine.lanterns.filter(l => l.lit).length;
    const totalLanterns = Math.max(1, this.engine.lanterns.length);
    this.ambientLight.intensity = 0.15 + 0.55 * (litCount / totalLanterns);

    // 2. Articulated Mây Animations (Run, Jump, Dash, Idle, Facing Rotation, Invuln Flash)
    this.playerRig.root.position.set(p.pos[0], p.pos[1], p.pos[2]);
    const horizSpeed = Math.sqrt(p.vel[0] * p.vel[0] + p.vel[2] * p.vel[2]);

    if (horizSpeed > 0.25) {
      const targetYaw = Math.atan2(p.vel[0], p.vel[2]);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, dt * 14);
    }
    this.playerRig.root.rotation.y = this.playerYaw;

    // Invulnerability blink
    this.playerRig.bodyGroup.visible = p.invulnTicks <= 0 || Math.floor(time * 16) % 2 === 0;

    // Landing squash decay
    if (this.landingSquash > 0) this.landingSquash = Math.max(0, this.landingSquash - dt * 5);

    const isDashing = p.dashTicks > 0;
    if (isDashing) {
      this.playerRig.bodyGroup.rotation.x = 0.42;
      this.playerRig.bodyGroup.scale.set(0.92, 0.96, 1.15);
      this.playerRig.leftArm.rotation.x = 0.9;
      this.playerRig.rightArm.rotation.x = 0.9;
      this.playerRig.dashRing.visible = true;
      this.playerRig.dashRing.rotation.z = time * 10;
    } else if (!p.grounded) {
      // Airborne pose
      this.playerRig.bodyGroup.rotation.x = 0.1;
      const stretch = 1 + Math.max(-0.08, Math.min(0.12, p.vel[1] * 0.014));
      this.playerRig.bodyGroup.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
      this.playerRig.leftArm.rotation.x = -0.7;
      this.playerRig.rightArm.rotation.x = -0.7;
      this.playerRig.leftLeg.rotation.x = 0.35;
      this.playerRig.rightLeg.rotation.x = -0.25;
      this.playerRig.dashRing.visible = false;
    } else if (horizSpeed > 0.3) {
      // Running cycle
      this.runCycle += dt * horizSpeed * 1.9;
      const swing = Math.sin(this.runCycle);
      this.playerRig.leftLeg.rotation.x = swing * 0.65;
      this.playerRig.rightLeg.rotation.x = -swing * 0.65;
      this.playerRig.leftArm.rotation.x = -swing * 0.55;
      this.playerRig.rightArm.rotation.x = swing * 0.55;
      this.playerRig.bodyGroup.position.y = Math.abs(Math.cos(this.runCycle)) * 0.09;
      this.playerRig.bodyGroup.rotation.x = 0.12;
      this.playerRig.bodyGroup.scale.set(1 + this.landingSquash * 0.12, 1 - this.landingSquash * 0.14, 1 + this.landingSquash * 0.12);
      this.playerRig.dashRing.visible = false;
    } else {
      // Idle breathing
      this.playerRig.leftLeg.rotation.x *= 0.85;
      this.playerRig.rightLeg.rotation.x *= 0.85;
      this.playerRig.leftArm.rotation.x = Math.sin(time * 2.2) * 0.06;
      this.playerRig.rightArm.rotation.x = -Math.sin(time * 2.2) * 0.06;
      this.playerRig.bodyGroup.position.y = Math.sin(time * 2.5) * 0.03;
      this.playerRig.bodyGroup.rotation.x *= 0.85;
      this.playerRig.bodyGroup.scale.set(1 + this.landingSquash * 0.12, 1 - this.landingSquash * 0.14, 1 + this.landingSquash * 0.12);
      this.playerRig.dashRing.visible = false;
    }

    // Scarf tails flutter & hanging hat lantern swings
    const flutter = 0.15 + Math.min(0.6, horizSpeed * 0.06);
    this.playerRig.scarfTailL.rotation.x = Math.sin(time * 9) * flutter;
    this.playerRig.scarfTailR.rotation.x = Math.sin(time * 9 + 1.4) * flutter;
    this.playerRig.miniLanternPivot.rotation.z = Math.sin(time * 3.5 + this.runCycle * 0.5) * (0.12 + horizSpeed * 0.02);

    // Hat lantern glow scales with carried motes ("Sáng tạo của tôi")
    const carryRatio = p.carried / this.engine.tuning.carry_capacity;
    this.playerRig.hatLight.intensity = 0.8 + carryRatio * 3.6 + Math.sin(time * 7) * 0.15;
    this.playerRig.miniLanternMat.emissiveIntensity = 0.8 + carryRatio * 2.0;

    // Wind Charm Aura
    if (p.charmTicks > 0) {
      this.playerRig.charmAura.visible = true;
      this.playerRig.charmAura.rotation.z = time * 3.5;
    } else {
      this.playerRig.charmAura.visible = false;
    }

    // 3. Smooth Third-Person Camera Follow
    _cameraTarget.set(p.pos[0], p.pos[1] + 1.5, p.pos[2]);
    _scratchVec.set(p.pos[0], p.pos[1] + 9.5, p.pos[2] - 14.2);
    this.camera.position.lerp(_scratchVec, 0.08);
    this.camera.lookAt(_cameraTarget);

    // 4. Lanterns Warm Flicker, 3D Fuel Bar, Unlit Deflation/Tears & Safe Zone Ring (Ticket-03)
    this.engine.lanterns.forEach((l, idx) => {
      const lv = this.lanternVisuals[idx];
      if (!lv) return;
      const fuel = this.engine.getLanternFuel(l);
      if (l.lit) {
        const isLowFuel = fuel < this.engine.tuning.low_fuel_threshold;
        const blink1Hz = isLowFuel ? (Math.sin(time * Math.PI * 2) > 0 ? 1.0 : 0.25) : 1.0;
        const flicker = Math.sin(time * 6 + idx * 1.7) * 0.3;

        lv.coreMesh.scale.set(1, 1, 1);
        lv.tearGroup.visible = false;
        lv.coreMat.color.setHex(COLORS.lanternCore);
        lv.coreMat.emissive.setHex(COLORS.lanternLit);
        lv.coreMat.emissiveIntensity = (1.9 + flicker * 0.4) * blink1Hz;
        lv.light.intensity = (4.6 + flicker) * blink1Hz;

        // Safe zone ring active only when fuel >= 30
        lv.safeRing.visible = !isLowFuel;
        lv.safeRing.rotation.z = time * 0.25;

        // 3D Fuel bar above lantern
        lv.fuelBarGroup.visible = true;
        lv.fuelBarGroup.lookAt(this.camera.position);
        const ratio = Math.max(0.02, fuel / this.engine.tuning.fuel_max);
        lv.fuelBarFill.scale.x = ratio;
        lv.fuelBarFill.position.x = -(1 - ratio) * 0.775;
        lv.fuelBarMat.color.setHex(isLowFuel ? (this.colorblindMode ? 0xffffff : 0xff5a5f) : COLORS.lanternLit);
        lv.fuelBarFill.visible = !isLowFuel || blink1Hz > 0.5;
      } else {
        // Deflated 20% + visible paper tears when unlit (non-color distinction)
        lv.coreMesh.scale.set(1, 0.8, 1);
        lv.tearGroup.visible = true;
        lv.fuelBarGroup.visible = false;
        lv.safeRing.visible = false;
        if (l.deposited > 0) {
          const cost = l.ever_lit ? this.engine.tuning.relight_cost : this.engine.tuning.lantern_cost;
          const ratio = l.deposited / cost;
          lv.coreMat.color.setHex(COLORS.lanternOff);
          lv.coreMat.emissive.setHex(COLORS.lanternLit);
          lv.coreMat.emissiveIntensity = ratio * 0.85;
          lv.light.intensity = ratio * 1.4;
        } else {
          lv.coreMat.color.setHex(COLORS.lanternOff);
          lv.coreMat.emissive.setHex(0x000000);
          lv.coreMat.emissiveIntensity = 0;
          lv.light.intensity = 0;
        }
      }
    });

    // 5. Dual-layer Motes InstancedMesh (bobbing & pulsing)
    const activeMotes = this.engine.motes.filter(m => m.active);
    for (let i = 0; i < 64; i++) {
      if (i < activeMotes.length) {
        const m = activeMotes[i];
        const floatY = m.pos[1] + 0.55 + Math.sin(time * 3 + i * 1.3) * 0.22;
        const pulseScale = 0.85 + Math.sin(time * 5 + i) * 0.22;
        _scratchVec.set(m.pos[0], floatY, m.pos[2]);
        _scratchScale.set(1, 1, 1);
        _scratchMatrix.compose(_scratchVec, _scratchQuat, _scratchScale);
        this.moteCoreInstanced.setMatrixAt(i, _scratchMatrix);

        _scratchScale.set(pulseScale, pulseScale, pulseScale);
        _scratchMatrix.compose(_scratchVec, _scratchQuat, _scratchScale);
        this.moteHaloInstanced.setMatrixAt(i, _scratchMatrix);
      } else {
        _scratchMatrix.makeTranslation(0, -999, 0);
        this.moteCoreInstanced.setMatrixAt(i, _scratchMatrix);
        this.moteHaloInstanced.setMatrixAt(i, _scratchMatrix);
      }
    }
    this.moteCoreInstanced.instanceMatrix.needsUpdate = true;
    this.moteHaloInstanced.instanceMatrix.needsUpdate = true;

    // 6. Articulated Shades (Writhing tendrils, chasing lean, stun wobble)
    for (let i = 0; i < this.shadePool.length; i++) {
      const sv = this.shadePool[i];
      if (i < this.engine.shades.length) {
        const s = this.engine.shades[i];
        sv.root.visible = true;
        sv.root.position.set(s.pos[0], s.pos[1] + 0.95 + Math.sin(time * 3.5 + i) * 0.16, s.pos[2]);

        const dx = p.pos[0] - s.pos[0];
        const dz = p.pos[2] - s.pos[2];
        sv.root.rotation.y = Math.atan2(dx, dz);

        const rimHex = this.colorblindMode ? 0x00b3ff : COLORS.shadeRim;
        sv.eyeMat.color.setHex(this.colorblindMode ? 0x00b3ff : 0xe6d4ff);

        if (s.state === 'stunned') {
          sv.coreMat.emissive.setHex(COLORS.shadeStunned);
          sv.root.rotation.z = Math.sin(time * 18) * 0.28;
          sv.root.scale.setScalar(0.88);
        } else if (s.state === 'spawning') {
          sv.coreMat.emissive.setHex(rimHex);
          sv.root.scale.setScalar(0.5);
        } else if (s.state === 'drain') {
          sv.coreMat.emissive.setHex(rimHex);
          sv.root.rotation.z = 0;
          sv.root.scale.setScalar(1.12 + Math.sin(time * 10) * 0.08);
        } else {
          sv.coreMat.emissive.setHex(rimHex);
          sv.root.rotation.z = 0;
          sv.root.rotation.x = s.state === 'chase' ? 0.22 : 0;
          sv.root.scale.setScalar(1.0);
        }

        const whipSpeed = s.state === 'chase' ? 9 : 4;
        sv.tendrils.forEach((t, ti) => {
          t.rotation.z = Math.sin(time * whipSpeed + ti * 1.3) * 0.45;
        });
      } else {
        sv.root.visible = false;
      }
    }

    // 7. Flowing Silk Drifters (Multi-segment wave animation)
    const activeDrifters = this.engine.drifters.filter(d => d.state !== 'removed');
    for (let i = 0; i < this.drifterPool.length; i++) {
      const dv = this.drifterPool[i];
      if (i < activeDrifters.length) {
        const d = activeDrifters[i];
        dv.root.visible = true;
        dv.root.position.set(d.pos[0], d.pos[1] + 1.85 + Math.sin(time * 4 + i) * 0.25, d.pos[2]);
        dv.root.rotation.y = Math.atan2(p.pos[0] - d.pos[0], p.pos[2] - d.pos[2]) + (d.state === 'flee' ? Math.PI : 0);
        dv.segments.forEach((seg, si) => {
          seg.position.y = Math.sin(time * 10 - si * 0.9) * 0.18;
          seg.rotation.x = Math.cos(time * 10 - si * 0.9) * 0.25;
        });
      } else {
        dv.root.visible = false;
      }
    }

    // 8. Spinning Wind Charms
    for (let i = 0; i < this.charmPool.length; i++) {
      const group = this.charmPool[i];
      if (i < this.engine.charms.length && this.engine.charms[i].available) {
        const c = this.engine.charms[i];
        group.visible = true;
        group.position.set(c.pos[0], c.pos[1] + 1.05 + Math.sin(time * 3) * 0.18, c.pos[2]);
        group.rotation.y = time * 2.2;
      } else {
        group.visible = false;
      }
    }

    // 9. Pulse Shockwave Expansion VFX
    if (this.pulseVfx.active) {
      this.pulseVfx.progress += dt * 2.8;
      if (this.pulseVfx.progress >= 1) {
        this.pulseVfx.active = false;
        this.pulseVfx.ring.visible = false;
        this.pulseVfx.dome.visible = false;
      } else {
        const radius = 0.5 + this.pulseVfx.progress * this.engine.tuning.pulse_radius;
        const alpha = 1 - this.pulseVfx.progress;
        this.pulseVfx.ring.scale.set(radius, radius, 1);
        (this.pulseVfx.ring.material as THREE.MeshBasicMaterial).opacity = alpha * 0.9;
        this.pulseVfx.dome.scale.setScalar(radius);
        (this.pulseVfx.dome.material as THREE.MeshBasicMaterial).opacity = alpha * 0.25;
      }
    }

    // 10. Environment Ambient Animations (Jump Pads, Bell, Cloud Sea, Night 3 Wind Leaves)
    for (const ring of this.jumpPadRings) {
      const cycle = (time * 1.4) % 1;
      ring.position.y = (ring.userData.baseY as number) + cycle * 1.1;
      ring.scale.setScalar(0.85 + cycle * 0.45);
    }
    if (this.bellMesh) {
      this.bellMesh.rotation.z = Math.sin(time * 1.8) * 0.16;
    }
    for (let i = 0; i < this.cloudPuffs.length; i++) {
      this.cloudPuffs[i].position.y = -6.5 + Math.sin(time * 0.6 + i) * 0.6;
    }

    // Wind leaves particles in Night 3
    if (this.engine.wind.active) {
      this.windLeavesInstanced.visible = true;
      const rad = (this.engine.wind.dir_deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      for (let i = 0; i < 40; i++) {
        const t = ((time * 12 + i * 2.3) % 45) - 22.5;
        const offset = ((i * 7.1) % 36) - 18;
        const lx = p.pos[0] + cos * t - sin * offset;
        const lz = p.pos[2] + sin * t + cos * offset;
        const ly = p.pos[1] + 0.8 + ((i * 1.7) % 4) + Math.sin(time * 6 + i) * 0.4;
        _scratchVec.set(lx, ly, lz);
        _scratchScale.set(1, 1, 1);
        _scratchMatrix.compose(_scratchVec, _scratchQuat, _scratchScale);
        this.windLeavesInstanced.setMatrixAt(i, _scratchMatrix);
      }
      this.windLeavesInstanced.instanceMatrix.needsUpdate = true;
    } else {
      this.windLeavesInstanced.visible = false;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameView();
});
