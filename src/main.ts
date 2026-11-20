/**
 * @file main.ts
 * @description Interactive 3D WebGL View v1.0.0 (Contract v1.3):
 * - Standard 3-Night campaign with procedural PBR textures, GLSL Sky/Cloud Sea, Bloom, and articulated rigs.
 * - Benchmark mode (?bench=1&seed=42&duration=30): 200 instanced Shades, 100 Motes, L1-L3 lit, R=30m orbit camera.
 * - Full Accessibility: 9-action Keybind Remapping + conflict alert, Visual Captions & Edge Arrows,
 *   Colorblind Mode, Reduce Motion, >=18px UI & 1.25x Large Text.
 * - Local Top-10 Leaderboard with disk API + localStorage persistence.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GameEngine, DEFAULT_TUNING_V12 } from './core/engine.js';
import { PRNG } from './core/prng.js';
import { getGroundHeight, getJumpPads } from './core/terrain.js';
import {
  LeaderboardEntry,
  addLeaderboardEntry,
  formatIsoWithTimezone,
  sortAndTrimLeaderboard,
  validatePlayerName
} from './core/leaderboard.js';
import { soundFx } from './render/audio.js';
import { ProceduralTextures, createProceduralTextures } from './render/textures.js';
import {
  SkyDomeHandle,
  CloudSeaHandle,
  ParticleBurstSystem,
  createSkyDome,
  createCloudSea
} from './render/shaders.js';
import {
  COLORS,
  PlayerRig,
  LanternVisual,
  ShadeVisual,
  DrifterVisual,
  PulseVfx,
  UltimateSlashVfx,
  RasenganVfx,
  IslandPortalVfx,
  createPlayerRig,
  createLanternVisual,
  createShadeVisual,
  createDrifterVisual,
  createCharmVisual,
  createPulseVfx,
  createUltimateSlashVfx,
  createRasenganVfx,
  createIslandPortalVfx,
  addIslandDecorations,
  addConnectedArchipelago
} from './render/visuals.js';

// Pre-allocated scratch objects (zero-allocation render loop per three-best-practices)
const _cameraTarget = new THREE.Vector3();
const _scratchVec = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchMatrix = new THREE.Matrix4();
const _scratchScale = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchEuler = new THREE.Euler();
const _projVec = new THREE.Vector3();

type ActionKey = 'up' | 'down' | 'left' | 'right' | 'jump' | 'dash' | 'interact' | 'pulse' | 'ultimate' | 'pause';

const DEFAULT_KEYBINDS: Record<ActionKey, string> = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
  jump: ' ',
  dash: 'shift',
  interact: 'e',
  pulse: 'f',
  ultimate: 'j',
  pause: 'escape'
};

const ACTION_LABELS: Record<ActionKey, string> = {
  up: 'Đi tới',
  down: 'Đi lùi',
  left: 'Sang trái',
  right: 'Sang phải',
  jump: 'Nhảy',
  dash: 'Lướt (Dash)',
  interact: 'Nạp / Châm dầu',
  pulse: 'Trảm Xoay (Skill)',
  ultimate: 'Trảm Toàn Đảo (Chiêu cuối)',
  pause: 'Tạm dừng'
};

const NIGHT_INTROS: Record<number, { title: string; quote: string }> = {
  1: {
    title: 'Đêm 1 — Đảo Bến',
    quote: '"Mây ơi, sương đen đã nuốt chửng bến thuyền. Hãy giữ ít nhất 3/5 Đèn Lồng sáng tới bình minh!" — Ông Đăng'
  },
  2: {
    title: 'Đêm 2 — Đảo Cau',
    quote: '"Cầu tre hẹp và Gió Lạc rất ranh mãnh! Hãy tận dụng bục nhảy và Bùa Gió để giữ ít nhất 4/6 ngọn đèn sáng." — Ông Đăng'
  },
  3: {
    title: 'Đêm 3 — Đảo Chuông',
    quote: '"Ba tầng đảo và gió giật dữ dội. Giữ ít nhất 5/7 ngọn đèn sáng tới bình minh để cứu lấy quần đảo!" — Ông Đăng'
  }
};

function formatKeyLabel(k: string): string {
  if (k === ' ') return 'Space';
  if (k === 'escape') return 'Esc';
  if (k === 'shift') return 'Shift';
  return k.length === 1 ? k.toUpperCase() : k;
}

class GameView {
  private engine: GameEngine;
  private currentNight: number = 1;
  private currentSeed: number = 42;
  private totalCampaignScore: number = 0;
  private nightsWonCount: number = 0;
  private isInGame: boolean = false;
  private settingsReturnTo: 'menu' | 'pause' = 'menu';
  private lastCountdownSec: number = -1;
  private colorblindMode: boolean = false;
  private reduceMotion: boolean = false;
  private largeText: boolean = false;
  private keybinds: Record<ActionKey, string> = { ...DEFAULT_KEYBINDS };
  private listeningAction: ActionKey | null = null;
  private scoreSavedThisEnd: boolean = false;

  // Benchmark mode state (Ticket-04 Section 1)
  private isBenchMode: boolean = false;
  private benchSeed: number = 42;
  private benchDurationSec: number = 30;
  private benchProcessT0: number = 0;
  private benchStartWallMs: number = 0;
  private benchFirstFrameMs: number = 0;
  private benchFrameDts: number[] = [];
  private benchFinished: boolean = false;
  private benchShadesInstanced: THREE.InstancedMesh | null = null;
  private benchShadePos: Array<{ x: number; z: number; vx: number; vz: number }> = [];

  // Caption & Indicator timers
  private captionTimer: number = 0;
  private shadeAlertTimer: number = 0;
  private lastAlertedShadePos: [number, number, number] | null = null;
  private windWarnedCycle: boolean = false;
  private lowFuelWarnedIds: Set<string> = new Set();

  // Character animation states
  private playerYaw: number = 0;
  private bankAngle: number = 0;
  private runCycle: number = 0;
  private lastFootstepIndex: number = 0;
  private landingSquash: number = 0;
  private interactAnimTimer: number = 0;
  private pulseAnimTimer: number = 0;
  private ultimateAnimTimer: number = 0;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private ambientLight!: THREE.AmbientLight;
  private textures: ProceduralTextures;
  private skyDome!: SkyDomeHandle;
  private cloudSea!: CloudSeaHandle;
  private particleSystem!: ParticleBurstSystem;

  private levelGroup: THREE.Group = new THREE.Group();
  private playerRig!: PlayerRig;
  private lanternVisuals: LanternVisual[] = [];
  private moteCoreInstanced!: THREE.InstancedMesh;
  private moteHaloInstanced!: THREE.InstancedMesh;
  private moteWingLInstanced!: THREE.InstancedMesh;
  private moteWingRInstanced!: THREE.InstancedMesh;
  private windLeavesInstanced!: THREE.InstancedMesh;
  private ambientDust!: THREE.Points;
  private jumpPadRings: THREE.Mesh[] = [];
  private bellMesh: THREE.Mesh | null = null;
  private boatGroup: THREE.Group | null = null;
  private floatingRocks: THREE.Mesh[] = [];
  private swayFoliageGroups: THREE.Group[] = [];
  private bridgeLanternMats: THREE.MeshStandardMaterial[] = [];
  private flyoverStartPos: [number, number, number] | null = null;
  private flyoverTimer: number = 0;
  private flyoverDuration: number = 2.2;
  private shadePool: ShadeVisual[] = [];
  private shadePrevPos: Map<string, [number, number]> = new Map();
  private shadeYaws: Map<string, number> = new Map();
  private drifterPool: DrifterVisual[] = [];
  private drifterPrevPos: Map<string, [number, number]> = new Map();
  private charmPool: THREE.Group[] = [];
  private pulseVfx!: PulseVfx;
  private ultimateVfx!: UltimateSlashVfx;
  private rasenganVfx!: RasenganVfx;
  private portalVfx!: IslandPortalVfx;
  private cheatBarUI!: HTMLElement;
  private cheatInputUI!: HTMLInputElement;
  private cheatOpen: boolean = false;

  // Input State
  private keyState: Record<string, boolean> = {};
  private pendingJump: boolean = false;
  private pendingDash: boolean = false;
  private pendingInteract: boolean = false;
  private pendingPulse: boolean = false;
  private pendingUltimate: boolean = false;

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
  private ultBadgeUI!: HTMLElement;
  private ultCdUI!: HTMLElement;
  private charmBadgeUI!: HTMLElement;
  private charmCdUI!: HTMLElement;
  private arrowUI!: HTMLElement;
  private shadeArrowUI!: HTMLElement;
  private captionBarUI!: HTMLElement;
  private benchBannerUI!: HTMLElement;

  private menuOverlay!: HTMLElement;
  private introOverlay!: HTMLElement;
  private pauseOverlay!: HTMLElement;
  private settingsOverlay!: HTMLElement;
  private leaderboardOverlay!: HTMLElement;
  private modalOverlay!: HTMLElement;

  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.isBenchMode = params.get('bench') === '1';
    this.benchSeed = parseInt(params.get('seed') || '42', 10);
    this.benchDurationSec = parseFloat(params.get('duration') || '30');
    this.benchProcessT0 = parseInt(params.get('t0') || '0', 10);

    this.canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    this.engine = new GameEngine(this.benchSeed, 1, DEFAULT_TUNING_V12);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    const initW = this.isBenchMode ? 1280 : window.innerWidth;
    const initH = this.isBenchMode ? 720 : window.innerHeight;
    this.renderer.setSize(initW, initH);
    this.renderer.setPixelRatio(this.isBenchMode ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.FogExp2(COLORS.fog, this.isBenchMode ? 0.0095 : 0.0056);
    this.scene.add(this.levelGroup);

    this.camera = new THREE.PerspectiveCamera(52, initW / initH, 0.1, this.isBenchMode ? 320 : 440);
    this.camera.position.set(0, 14, -22);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.4, 0.52, 0.78);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.textures = createProceduralTextures();

    this.loadPreferences();
    this.bindUI();
    this.setupLighting();
    this.buildStaticBackdrop();
    this.playerRig = createPlayerRig(this.textures);
    this.scene.add(this.playerRig.root, this.playerRig.groundShadow);
    this.buildEntityPools();

    if (this.isBenchMode) {
      this.setupBenchmarkScene();
    } else {
      this.buildNightGeometry(1, false);
      this.setupControls();
    }

    window.addEventListener('resize', () => this.onWindowResize());
    this.startLoop();
  }

  private loadPreferences(): void {
    this.colorblindMode = localStorage.getItem('ddl_colorblind') === 'true';
    this.reduceMotion = localStorage.getItem('ddl_reduce_motion') === 'true';
    this.largeText = localStorage.getItem('ddl_large_text') === 'true';
    document.body.classList.toggle('colorblind', this.colorblindMode);
    document.body.classList.toggle('reduce-motion', this.reduceMotion);
    document.body.classList.toggle('large-text', this.largeText);

    try {
      const rawKeys = localStorage.getItem('ddl_keybinds');
      if (rawKeys) {
        const parsed = JSON.parse(rawKeys) as Partial<Record<ActionKey, string>>;
        this.keybinds = { ...DEFAULT_KEYBINDS, ...parsed };
      }
    } catch {
      this.keybinds = { ...DEFAULT_KEYBINDS };
    }
  }

  /**
   * Configures the standardized Benchmark Scene per Ticket-04 Section 1:
   * - Night 1, creative additions disabled, 200 instanced wandering Shades (seed 42),
   * - 100 instanced Motes, L1-L3 lit with fuel 100, Mây idle at (0,0,0),
   * - Orbit camera R=30m, Y=15m, starting at (30,15,0), 15s/rev CCW.
   */
  private setupBenchmarkScene(): void {
    this.menuOverlay.classList.remove('active');
    this.hudEl.style.display = 'none';
    this.benchBannerUI.style.display = 'block';
    this.ambientDust.visible = false;

    this.engine = new GameEngine(this.benchSeed, 1, DEFAULT_TUNING_V12);
    this.engine.applyScenario({
      random_motes: false,
      random_shades: false,
      lanterns: [
        { id: 'L1', lit: true, fuel: 100 },
        { id: 'L2', lit: true, fuel: 100 },
        { id: 'L3', lit: true, fuel: 100 }
      ]
    });

    this.buildNightGeometry(1, true); // standard bench geometry, creative props disabled

    // Spawn exactly 100 motes distributed over island
    const rng = new PRNG(this.benchSeed);
    this.engine.motes = [];
    for (let i = 0; i < 100; i++) {
      const a = rng.nextFloat() * Math.PI * 2;
      const r = Math.sqrt(rng.nextFloat()) * 36;
      this.engine.motes.push({
        id: `BM${i + 1}`,
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r],
        active: true,
        kind: 'random',
        ttlTicks: 0
      });
    }

    // Spawn exactly 200 wandering Shades via single InstancedMesh (1 draw call for high FPS)
    const shadeGeo = new THREE.DodecahedronGeometry(0.68, 1);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: COLORS.shadeBody,
      emissive: COLORS.shadeRim,
      emissiveIntensity: 0.75,
      roughness: 0.25
    });
    this.benchShadesInstanced = new THREE.InstancedMesh(shadeGeo, shadeMat, 200);
    this.benchShadesInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.benchShadesInstanced);

    this.benchShadePos = [];
    for (let i = 0; i < 200; i++) {
      const a = rng.nextFloat() * Math.PI * 2;
      const r = 6 + Math.sqrt(rng.nextFloat()) * 32;
      const dir = rng.nextFloat() * Math.PI * 2;
      this.benchShadePos.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        vx: Math.cos(dir) * 4.0,
        vz: Math.sin(dir) * 4.0
      });
    }

    this.camera.position.set(30, 15, 0);
    this.camera.lookAt(0, 0, 0);
    // Static geometry in bench mode: bake shadow map once instead of re-rendering 360x/s
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.benchStartWallMs = performance.now();
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
    this.ultBadgeUI = document.getElementById('ult-badge')!;
    this.ultCdUI = document.getElementById('ult-cd')!;
    this.charmBadgeUI = document.getElementById('charm-badge')!;
    this.charmCdUI = document.getElementById('charm-cd')!;
    this.arrowUI = document.getElementById('lantern-arrow')!;
    this.shadeArrowUI = document.getElementById('shade-arrow')!;
    this.captionBarUI = document.getElementById('caption-bar')!;
    this.benchBannerUI = document.getElementById('bench-banner')!;
    this.cheatBarUI = document.getElementById('cheat-bar')!;
    this.cheatInputUI = document.getElementById('cheat-input') as HTMLInputElement;

    this.menuOverlay = document.getElementById('menu-overlay')!;
    this.introOverlay = document.getElementById('intro-overlay')!;
    this.pauseOverlay = document.getElementById('pause-overlay')!;
    this.settingsOverlay = document.getElementById('settings-overlay')!;
    this.leaderboardOverlay = document.getElementById('leaderboard-overlay')!;
    this.modalOverlay = document.getElementById('game-modal')!;

    this.moteSlotsUI.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const div = document.createElement('div');
      div.className = 'mote-slot';
      this.moteSlotsUI.appendChild(div);
    }

    document.getElementById('btn-start-game')!.addEventListener('click', () => {
      this.totalCampaignScore = 0;
      this.nightsWonCount = 0;
      this.showNightIntro(1);
    });
    document.getElementById('btn-start-n2')!.addEventListener('click', () => this.showNightIntro(2));
    document.getElementById('btn-start-n3')!.addEventListener('click', () => this.showNightIntro(3));
    document.getElementById('btn-enter-night')!.addEventListener('click', () => this.startNight(this.currentNight));

    document.getElementById('btn-resume')!.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-restart-night')!.addEventListener('click', () => this.startNight(this.currentNight));
    document.getElementById('btn-back-menu')!.addEventListener('click', () => this.showMenu());

    // Leaderboard screen
    document.getElementById('btn-open-leaderboard')!.addEventListener('click', () => this.openLeaderboard());
    document.getElementById('btn-close-leaderboard')!.addEventListener('click', () => {
      this.leaderboardOverlay.classList.remove('active');
      this.menuOverlay.classList.add('active');
    });
    document.getElementById('btn-save-score')!.addEventListener('click', () => this.saveCurrentScore());

    // Settings controls
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
    const cbReduce = document.getElementById('cb-reduce-motion') as HTMLInputElement;
    const cbLarge = document.getElementById('cb-large-text') as HTMLInputElement;
    cbColorblind.checked = this.colorblindMode;
    cbReduce.checked = this.reduceMotion;
    cbLarge.checked = this.largeText;

    cbColorblind.addEventListener('change', () => {
      this.colorblindMode = cbColorblind.checked;
      localStorage.setItem('ddl_colorblind', String(this.colorblindMode));
      document.body.classList.toggle('colorblind', this.colorblindMode);
    });
    cbReduce.addEventListener('change', () => {
      this.reduceMotion = cbReduce.checked;
      localStorage.setItem('ddl_reduce_motion', String(this.reduceMotion));
      document.body.classList.toggle('reduce-motion', this.reduceMotion);
    });
    cbLarge.addEventListener('change', () => {
      this.largeText = cbLarge.checked;
      localStorage.setItem('ddl_large_text', String(this.largeText));
      document.body.classList.toggle('large-text', this.largeText);
    });

    // Keybind Remapping UI
    this.renderKeybindSettings();
    document.getElementById('btn-reset-keys')!.addEventListener('click', () => {
      this.keybinds = { ...DEFAULT_KEYBINDS };
      this.listeningAction = null;
      localStorage.setItem('ddl_keybinds', JSON.stringify(this.keybinds));
      document.getElementById('keybind-warn')!.innerText = 'Đã khôi phục phím mặc định.';
      this.renderKeybindSettings();
      this.updateControlsHint();
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
      this.listeningAction = null;
      document.getElementById('keybind-warn')!.innerText = '';
      this.settingsOverlay.classList.remove('active');
      if (this.settingsReturnTo === 'menu') this.menuOverlay.classList.add('active');
      else this.pauseOverlay.classList.add('active');
    });

    document.getElementById('btn-restart')!.addEventListener('click', () => this.startNight(this.currentNight));
    document.getElementById('btn-next-night')!.addEventListener('click', () => this.showNightIntro(this.currentNight + 1));
    document.getElementById('btn-modal-menu')!.addEventListener('click', () => this.showMenu());

    this.updateControlsHint();
  }

  private renderKeybindSettings(): void {
    const container = document.getElementById('keybind-list')!;
    container.innerHTML = '';
    (Object.keys(ACTION_LABELS) as ActionKey[]).forEach(action => {
      const row = document.createElement('div');
      row.className = 'keybind-row';
      const label = document.createElement('span');
      label.innerText = ACTION_LABELS[action];
      const btn = document.createElement('button');
      btn.className = 'keybind-btn' + (this.listeningAction === action ? ' listening' : '');
      btn.innerText = this.listeningAction === action ? 'Nhấn phím...' : formatKeyLabel(this.keybinds[action]);
      btn.addEventListener('click', () => {
        this.listeningAction = action;
        document.getElementById('keybind-warn')!.innerText = `Đang chờ phím mới cho "${ACTION_LABELS[action]}"...`;
        this.renderKeybindSettings();
      });
      row.append(label, btn);
      container.appendChild(row);
    });
  }

  private updateControlsHint(): void {
    const k = this.keybinds;
    const hint = document.getElementById('controls-hint');
    if (!hint) return;
    hint.innerHTML =
      `<div><span class="key-badge">${formatKeyLabel(k.up)}${formatKeyLabel(k.left)}${formatKeyLabel(k.down)}${formatKeyLabel(k.right)}</span> Chạy · ` +
      `<span class="key-badge">${formatKeyLabel(k.jump)}</span> Nhảy · <span class="key-badge">${formatKeyLabel(k.dash)}</span> Lướt</div>` +
      `<div><span class="key-badge">${formatKeyLabel(k.interact)}</span> Nạp/Châm · <span class="key-badge">${formatKeyLabel(k.pulse)}</span> Trảm Xoay · ` +
      `<span class="key-badge">${formatKeyLabel(k.ultimate)}</span> Chiêu Cuối · <span class="key-badge">${formatKeyLabel(k.pause)}</span> Dừng</div>`;
  }

  private async loadLeaderboardEntries(): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch('/__api/leaderboard');
      if (res.ok) {
        const data = (await res.json()) as { entries: LeaderboardEntry[] };
        if (Array.isArray(data.entries)) {
          localStorage.setItem('ddl_leaderboard', JSON.stringify(data.entries));
          return sortAndTrimLeaderboard(data.entries);
        }
      }
    } catch {
      // Static web fallback to localStorage
    }
    try {
      const raw = localStorage.getItem('ddl_leaderboard');
      return raw ? sortAndTrimLeaderboard(JSON.parse(raw) as LeaderboardEntry[]) : [];
    } catch {
      return [];
    }
  }

  private async openLeaderboard(): Promise<void> {
    this.menuOverlay.classList.remove('active');
    this.leaderboardOverlay.classList.add('active');
    const tbody = document.getElementById('lb-tbody')!;
    const entries = await this.loadLeaderboardEntries();
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#8FA3B8">Chưa có điểm nào được lưu.</td></tr>';
      return;
    }
    tbody.innerHTML = entries
      .map(
        (e, i) =>
          `<tr><td>#${i + 1}</td><td>${e.name}</td><td style="color:#F2C14E;font-weight:700">${e.score}</td>` +
          `<td>${e.nights_won}/3</td><td style="font-size:0.85em">${e.achieved_at.replace('T', ' ').slice(0, 19)}</td></tr>`
      )
      .join('');
  }

  private async saveCurrentScore(): Promise<void> {
    if (this.scoreSavedThisEnd) return;
    const inputEl = document.getElementById('player-name-input') as HTMLInputElement;
    const msgEl = document.getElementById('save-score-msg')!;
    const check = validatePlayerName(inputEl.value);
    if (!check.valid) {
      msgEl.innerText = `⚠ ${check.reason}`;
      return;
    }

    const entry: LeaderboardEntry = {
      name: check.cleaned,
      score: this.totalCampaignScore,
      nights_won: this.nightsWonCount,
      achieved_at: formatIsoWithTimezone(new Date()),
      seed: this.currentSeed
    };

    const existing = await this.loadLeaderboardEntries();
    const updated = addLeaderboardEntry(existing, entry);
    localStorage.setItem('ddl_leaderboard', JSON.stringify(updated));

    try {
      await fetch('/__api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch {
      // localStorage already saved
    }

    this.scoreSavedThisEnd = true;
    msgEl.style.color = '#FFE9B0';
    msgEl.innerText = `✔ Đã lưu điểm của ${entry.name} vào Bảng Xếp Hạng!`;
  }

  private showCaption(text: string, durationSec = 3.0): void {
    this.captionBarUI.innerText = text;
    this.captionBarUI.style.display = 'block';
    this.captionTimer = Math.max(this.captionTimer, durationSec);
  }

  private showMenu(): void {
    this.isInGame = false;
    this.hudEl.style.display = 'none';
    this.arrowUI.style.display = 'none';
    this.shadeArrowUI.style.display = 'none';
    this.captionBarUI.style.display = 'none';
    this.introOverlay.classList.remove('active');
    this.pauseOverlay.classList.remove('active');
    this.modalOverlay.classList.remove('active');
    this.leaderboardOverlay.classList.remove('active');
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

  private startNight(night: number, customFlyover?: [number, number, number]): void {
    this.currentNight = night;
    this.currentSeed = Date.now() & 0xfffffff;
    this.lastCountdownSec = -1;
    this.windWarnedCycle = false;
    this.lowFuelWarnedIds.clear();
    this.shadePrevPos.clear();
    this.shadeYaws.clear();
    this.drifterPrevPos.clear();
    this.scoreSavedThisEnd = false;
    this.playerYaw = 0;
    this.portalVfx.active = false;
    this.portalVfx.group.visible = false;
    this.engine = new GameEngine(this.currentSeed, night, DEFAULT_TUNING_V12);
    this.buildNightGeometry(night, false);
    if (customFlyover) this.flyoverStartPos = customFlyover;

    this.nightLabelUI.innerText = NIGHT_INTROS[night]?.title ?? `Đêm ${night}`;
    this.updateArchipelagoChainUI(night);
    this.introOverlay.classList.remove('active');
    this.pauseOverlay.classList.remove('active');
    this.modalOverlay.classList.remove('active');
    this.menuOverlay.classList.remove('active');
    this.hudEl.style.display = 'flex';
    this.isInGame = true;

    // Smooth camera flyover across the incoming Lantern Sky-Bridge when arriving at Night 2 / 3 or Teleporting
    if (this.flyoverStartPos && !this.reduceMotion) {
      this.flyoverTimer = this.flyoverDuration;
      this.camera.position.set(this.flyoverStartPos[0], this.flyoverStartPos[1], this.flyoverStartPos[2]);
      const destName = night === 1 ? 'Đảo Bến' : night === 2 ? 'Đảo Cau' : 'Đảo Chuông';
      this.showCaption(`✨ Bay tới Đêm ${night}: ${destName}`, 2.6);
    } else {
      this.flyoverTimer = 0;
    }
  }

  private openCheatBar(): void {
    if (this.isBenchMode || this.cheatOpen) return;
    this.cheatOpen = true;
    this.keyState = {};
    this.pendingJump = false;
    this.pendingDash = false;
    this.pendingInteract = false;
    this.pendingPulse = false;
    this.pendingUltimate = false;
    this.cheatBarUI.classList.add('open');
    this.cheatInputUI.value = '';
    setTimeout(() => this.cheatInputUI.focus(), 0);
  }

  private closeCheatBar(): void {
    this.cheatOpen = false;
    this.cheatBarUI.classList.remove('open');
    this.cheatInputUI.blur();
  }

  /**
   * Executes interactive sandbox cheat commands triggered via Enter:
   * ok1/ok2/ok3 (complete island & open ascending portal), naruto (island-wide Rasengan wipe),
   * tele1/tele2/tele3 (fly directly to island 1/2/3). Strictly UI-layer; disabled in benchmark/headless.
   */
  private executeCheatCode(raw: string): void {
    const code = raw.trim().toLowerCase();
    if (!code) return;

    if (code === 'tele1' || code === 'tele2' || code === 'tele3') {
      const targetNight = parseInt(code.slice(4), 10);
      soundFx.playPortal();
      const flyStart: [number, number, number] =
        targetNight === 1 ? [16, 26, -54] : targetNight === 2 ? [-14, 16, -72] : [-14, 18, -88];
      this.startNight(targetNight, flyStart);
      const names = ['', 'Đảo Bến (1)', 'Đảo Cau (2)', 'Đảo Chuông (3)'];
      this.showCaption(`✈ [CHEAT ${code}] Bay thẳng tới ${names[targetNight]}!`, 3.0);
      return;
    }

    if (code === 'ok1' || code === 'ok2' || code === 'ok3') {
      const targetNight = parseInt(code.slice(2), 10);
      if (!this.isInGame || this.currentNight !== targetNight || this.engine.state !== 'playing') {
        this.startNight(targetNight);
      }
      // Light all lanterns on this island to 100% fuel
      for (const l of this.engine.lanterns) {
        l.lit = true;
        l.ever_lit = true;
        l.deposited = this.engine.tuning.lantern_cost;
        l.fuelSixtieths = this.engine.tuning.fuel_max * 60;
      }
      this.engine.player.successful_lights = Math.max(this.engine.player.successful_lights, this.engine.lanterns.length);
      this.engine.player.capacity = 20;
      this.nightsWonCount = Math.max(this.nightsWonCount, targetNight);

      // Open glowing Portal Gate at the island's Tam Quan bridgehead
      const portalPos: [number, number, number] =
        targetNight === 1 ? [2, 0, 38.0] : targetNight === 2 ? [14, 0, 23.2] : [-2, 0, -42.0];
      this.portalVfx.targetPos = portalPos;
      this.portalVfx.nextNight = targetNight + 1;
      this.portalVfx.active = true;
      this.portalVfx.group.position.set(portalPos[0], portalPos[1], portalPos[2]);
      this.portalVfx.group.visible = true;

      soundFx.playPortal();
      soundFx.playLanternLit();
      if (!this.reduceMotion) {
        this.particleSystem.emit(portalPos[0], portalPos[1] + 2.5, portalPos[2], 42, 0.3, 0.9, 1.0, 8.5, 4.5, 0.9);
      }
      const nextLabel = targetNight < 3 ? `Cổng lên Đảo ${targetNight + 1} đã mở tại Cổng Tam Quan!` : 'Cổng Bình Minh đã mở tại Cổng Tam Quan!';
      this.showCaption(`✨ [CHEAT ${code}] Hoàn thành Đảo ${targetNight}! ${nextLabel}`, 4.0);
      return;
    }

    if (code === 'naruto') {
      if (!this.isInGame || this.engine.state !== 'playing') {
        this.startNight(this.currentNight || 1);
      }
      const wipedShades = this.engine.shades.length;
      const wipedDrifters = this.engine.drifters.filter(d => d.state !== 'removed').length;
      this.engine.score += wipedShades * 15 + wipedDrifters * 10;
      this.engine.shades = [];
      this.engine.drifters = [];
      this.shadePrevPos.clear();
      this.shadeYaws.clear();
      this.drifterPrevPos.clear();

      // Launch giant swirling electric-cyan Rasengan across the entire island!
      const p = this.engine.player.pos;
      this.rasenganVfx.active = true;
      this.rasenganVfx.progress = 0;
      this.rasenganVfx.startPos.set(p[0], p[1] + 1.4, p[2]);
      this.rasenganVfx.group.position.copy(this.rasenganVfx.startPos);
      this.rasenganVfx.group.visible = true;
      this.rasenganVfx.shockwave.visible = false;
      this.pulseAnimTimer = 0.45;
      soundFx.playRasengan();
      if (!this.reduceMotion) {
        this.particleSystem.emit(p[0], p[1] + 1.4, p[2], 55, 0.15, 0.85, 1.0, 18.0, 5.2, 0.95);
        this.particleSystem.emit(p[0], p[1] + 1.4, p[2], 40, 0.85, 0.98, 1.0, 12.0, 4.0, 0.8);
      }
      this.showCaption(`🌀 RASENGAN! Đã quét sạch ${wipedShades} Bóng Mực & ${wipedDrifters} Gió Lạc toàn bản đồ!`, 3.5);
      return;
    }

    this.showCaption(`⚠ Cheat "${code}" không hợp lệ (thử: ok1, ok2, ok3, naruto, tele1, tele2, tele3)`, 2.5);
  }

  private updateArchipelagoChainUI(night: number): void {
    for (let n = 1; n <= 3; n++) {
      const el = document.getElementById(`node-n${n}`);
      if (!el) continue;
      el.classList.remove('active', 'done');
      if (n < night) el.classList.add('done');
      else if (n === night) el.classList.add('active');
    }
    document.getElementById('link-12')?.classList.toggle('lit', night >= 2);
    document.getElementById('link-23')?.classList.toggle('lit', night >= 3);
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

    const hemi = new THREE.HemisphereLight(0x5267b5, 0x12384a, 0.38);
    this.scene.add(hemi);

    const moonLight = new THREE.DirectionalLight(0xc2d5ff, 1.05);
    moonLight.position.set(48, 78, 60);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 210;
    moonLight.shadow.camera.left = -65;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 65;
    moonLight.shadow.camera.bottom = -65;
    this.scene.add(moonLight);
  }

  private buildStaticBackdrop(): void {
    this.skyDome = createSkyDome();
    this.scene.add(this.skyDome.mesh);

    this.cloudSea = createCloudSea();
    this.scene.add(this.cloudSea.mesh);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(9.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: COLORS.lanternCore })
    );
    moon.position.set(55, 76, 138);
    moon.matrixAutoUpdate = false;
    moon.updateMatrix();
    this.scene.add(moon);

    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.textures.glowSpriteMap,
        color: COLORS.lanternCore,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    moonHalo.position.set(55, 76, 136);
    moonHalo.scale.set(42, 42, 1);
    this.scene.add(moonHalo);

    const starPositions = new Float32Array(320 * 3);
    for (let i = 0; i < 320; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.43;
      const r = 175 + Math.random() * 35;
      starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      starPositions[i * 3 + 1] = Math.cos(phi) * r + 12;
      starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xfff6c2, size: 1.25, transparent: true, opacity: 0.85 })
    );
    stars.matrixAutoUpdate = false;
    stars.updateMatrix();
    this.scene.add(stars);

    const dustPos = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 90;
      dustPos[i * 3 + 1] = 1 + Math.random() * 14;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.ambientDust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        map: this.textures.glowSpriteMap,
        color: COLORS.moteGlow,
        size: 0.55,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.ambientDust);
  }

  private buildEntityPools(): void {
    // Capacity 128 supports both standard gameplay (<=30) and Benchmark mode (100 motes)
    const moteBodyGeo = new THREE.SphereGeometry(0.16, 10, 10);
    moteBodyGeo.scale(0.85, 0.9, 1.35);
    this.moteCoreInstanced = new THREE.InstancedMesh(
      moteBodyGeo,
      new THREE.MeshBasicMaterial({ color: COLORS.moteCore }),
      128
    );
    this.moteHaloInstanced = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshBasicMaterial({ color: COLORS.moteGlow, transparent: true, opacity: 0.36 }),
      128
    );
    const wingGeoL = new THREE.PlaneGeometry(0.32, 0.13);
    wingGeoL.translate(0.16, 0, 0);
    const wingGeoR = new THREE.PlaneGeometry(0.32, 0.13);
    wingGeoR.translate(-0.16, 0, 0);
    const wingMat = new THREE.MeshBasicMaterial({
      color: 0xfff8d8,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide
    });
    this.moteWingLInstanced = new THREE.InstancedMesh(wingGeoL, wingMat, 128);
    this.moteWingRInstanced = new THREE.InstancedMesh(wingGeoR, wingMat, 128);
    this.moteCoreInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.moteHaloInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.moteWingLInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.moteWingRInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.moteWingLInstanced.visible = !this.isBenchMode;
    this.moteWingRInstanced.visible = !this.isBenchMode;
    this.scene.add(this.moteCoreInstanced, this.moteHaloInstanced, this.moteWingLInstanced, this.moteWingRInstanced);

    this.windLeavesInstanced = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.38, 0.17),
      new THREE.MeshBasicMaterial({ color: COLORS.sand, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
      40
    );
    this.windLeavesInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.windLeavesInstanced.visible = false;
    this.scene.add(this.windLeavesInstanced);

    for (let i = 0; i < 10; i++) {
      const sv = createShadeVisual(this.textures);
      this.shadePool.push(sv);
      this.scene.add(sv.root, sv.drainBeam);
    }

    for (let i = 0; i < 2; i++) {
      const dv = createDrifterVisual(this.textures);
      this.drifterPool.push(dv);
      this.scene.add(dv.root);
    }

    for (let i = 0; i < 2; i++) {
      const cv = createCharmVisual(this.textures);
      this.charmPool.push(cv);
      this.scene.add(cv);
    }

    this.pulseVfx = createPulseVfx();
    this.scene.add(this.pulseVfx.ring, this.pulseVfx.bladeArc1, this.pulseVfx.bladeArc2);

    this.ultimateVfx = createUltimateSlashVfx();
    this.scene.add(this.ultimateVfx.group);

    this.rasenganVfx = createRasenganVfx();
    this.scene.add(this.rasenganVfx.group);

    this.portalVfx = createIslandPortalVfx();
    this.scene.add(this.portalVfx.group);

    this.particleSystem = new ParticleBurstSystem(this.textures.glowSpriteMap, 240);
    this.scene.add(this.particleSystem.points);
  }

  private disposeLevelGroup(): void {
    this.levelGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      } else if (obj instanceof THREE.Sprite) {
        obj.material?.dispose();
      }
    });
    this.levelGroup.clear();
    this.lanternVisuals = [];
    this.jumpPadRings = [];
    this.bellMesh = null;
    this.boatGroup = null;
    this.floatingRocks = [];
    this.swayFoliageGroups = [];
    this.bridgeLanternMats = [];
  }

  private buildNightGeometry(night: number, benchCleanMode: boolean): void {
    this.disposeLevelGroup();
    const grassMat = new THREE.MeshStandardMaterial({
      map: this.textures.grassMap,
      bumpMap: this.textures.grassBump,
      bumpScale: 0.08,
      roughness: 0.9
    });
    const woodMat = new THREE.MeshStandardMaterial({
      map: this.textures.woodMap,
      bumpMap: this.textures.woodBump,
      bumpScale: 0.07,
      roughness: 0.84
    });
    const sandMat = new THREE.MeshStandardMaterial({
      map: this.textures.sandMap,
      roughness: 0.92
    });

    const addIslandDisc = (cx: number, cz: number, radius: number) => {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(radius - 1.2, radius, 0.8, 56), grassMat);
      top.position.set(cx, -0.4, cz);
      top.receiveShadow = true;
      top.matrixAutoUpdate = false;
      top.updateMatrix();
      this.levelGroup.add(top);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius - 4.5, 4.6, 56), sandMat);
      rim.position.set(cx, -2.7, cz);
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

      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.4, 6, 36), sandMat);
      tier2.position.set(0, 3, 0);
      tier2.receiveShadow = true;
      tier2.matrixAutoUpdate = false;
      tier2.updateMatrix();
      this.levelGroup.add(tier2);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.15, 7.6, 16), woodMat);
      tower.position.set(0, 9.8, 0);
      tower.castShadow = true;
      tower.matrixAutoUpdate = false;
      tower.updateMatrix();
      this.levelGroup.add(tower);

      const eavePts = [
        new THREE.Vector2(0.01, 2.2),
        new THREE.Vector2(1.2, 1.2),
        new THREE.Vector2(2.8, 0.3),
        new THREE.Vector2(3.7, 0.0),
        new THREE.Vector2(3.9, 0.25)
      ];
      const towerRoof = new THREE.Mesh(new THREE.LatheGeometry(eavePts, 8), woodMat);
      towerRoof.position.set(0, 13.4, 0);
      towerRoof.castShadow = true;
      towerRoof.matrixAutoUpdate = false;
      towerRoof.updateMatrix();
      this.levelGroup.add(towerRoof);

      const bell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.85, 1.35, 14),
        new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.68, roughness: 0.28 })
      );
      bell.position.set(0, 11.2, 0);
      this.bellMesh = bell;
      this.levelGroup.add(bell);

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

    const padBaseMat = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      emissive: COLORS.lanternLit,
      emissiveIntensity: 0.9
    });
    const padRingMat = new THREE.MeshBasicMaterial({
      color: COLORS.lanternCore,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const lanternPositions = this.engine.lanterns.map(l => l.pos);
    const avoidList: Array<[number, number, number]> = [...lanternPositions];
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

    for (const lantern of this.engine.lanterns) {
      const lv = createLanternVisual(lantern.pos, this.textures);
      this.lanternVisuals.push(lv);
      this.levelGroup.add(lv.group);
    }

    // Ticket-04: Disable extra creative decorations & distant connected islands in benchmark mode
    if (!benchCleanMode) {
      const decor = addIslandDecorations(this.levelGroup, night, avoidList, lanternPositions, this.textures);
      this.boatGroup = decor.boatGroup;
      this.floatingRocks = decor.floatingRocks;
      this.swayFoliageGroups = decor.swayFoliageGroups;

      const arch = addConnectedArchipelago(this.levelGroup, night, this.textures);
      this.bridgeLanternMats = arch.bridgeLanternMats;
      this.flyoverStartPos = arch.incomingBridgeStart;
    } else {
      this.flyoverStartPos = null;
    }
  }

  private setupControls(): void {
    this.cheatInputUI.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const cmd = this.cheatInputUI.value;
        this.closeCheatBar();
        this.executeCheatCode(cmd);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.closeCheatBar();
      }
    });

    window.addEventListener('keydown', e => {
      // Ignore shortcuts while typing in any input (leaderboard name or cheat box)
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      if (e.key === 'Enter' && !this.listeningAction && !this.isBenchMode) {
        e.preventDefault();
        this.openCheatBar();
        return;
      }

      const k = e.key.toLowerCase();

      // Keybind Remapping capture
      if (this.listeningAction) {
        e.preventDefault();
        const warnEl = document.getElementById('keybind-warn')!;
        const conflict = (Object.keys(this.keybinds) as ActionKey[]).find(
          act => act !== this.listeningAction && this.keybinds[act] === k
        );
        if (conflict) {
          warnEl.innerText = `⚠ Phím "${formatKeyLabel(k)}" đã trùng với "${ACTION_LABELS[conflict]}"! Hãy chọn phím khác.`;
          return;
        }
        this.keybinds[this.listeningAction] = k;
        localStorage.setItem('ddl_keybinds', JSON.stringify(this.keybinds));
        warnEl.innerText = `✔ Đã gán "${formatKeyLabel(k)}" cho "${ACTION_LABELS[this.listeningAction]}".`;
        this.listeningAction = null;
        this.renderKeybindSettings();
        this.updateControlsHint();
        return;
      }

      if (k === this.keybinds.pause || (this.keybinds.pause === 'escape' && k === 'p')) {
        this.togglePause();
        return;
      }
      this.keyState[k] = true;
      if (k === this.keybinds.jump) this.pendingJump = true;
      if (k === this.keybinds.dash) this.pendingDash = true;
      if (k === this.keybinds.interact) this.pendingInteract = true;
      if (k === this.keybinds.pulse) this.pendingPulse = true;
      if (k === this.keybinds.ultimate) {
        this.pendingUltimate = true;
        if (this.isInGame && this.engine.state === 'playing' && this.engine.player.ultimateCharge < 2) {
          this.showCaption(`⚔ Chiêu Cuối chưa sẵn sàng (${this.engine.player.ultimateCharge}/2 Trảm Xoay)`, 1.8);
        }
      }
    });

    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      this.keyState[k] = false;
      if (k === this.keybinds.jump) this.pendingJump = false;
      if (k === this.keybinds.dash) this.pendingDash = false;
      if (k === this.keybinds.interact) this.pendingInteract = false;
      if (k === this.keybinds.pulse) this.pendingPulse = false;
      if (k === this.keybinds.ultimate) this.pendingUltimate = false;
    });
  }

  private onWindowResize(): void {
    if (this.isBenchMode) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
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
      if (timeLeft === 10) this.showCaption('⚠ Chỉ còn 10 giây tới bình minh!', 2.5);
    }

    // Wind incoming 2s warning (Night 3)
    if (this.currentNight === 3 && !this.engine.wind.active && this.engine.wind.timerTicks >= 1680) {
      if (!this.windWarnedCycle) {
        this.windWarnedCycle = true;
        this.showCaption('⚠ Gió mạnh sắp thổi trong 2 giây!', 2.5);
      }
    } else if (this.engine.wind.active) {
      this.windWarnedCycle = false;
    }

    // Low fuel (< 30) caption alert
    for (const l of this.engine.lanterns) {
      const fuel = this.engine.getLanternFuel(l);
      if (l.lit && fuel < this.engine.tuning.low_fuel_threshold) {
        if (!this.lowFuelWarnedIds.has(l.id)) {
          this.lowFuelWarnedIds.add(l.id);
          this.showCaption(`⚠ Đèn ${l.id} sắp cạn dầu (${Math.round(fuel)}/100)!`, 3.0);
        }
      } else {
        this.lowFuelWarnedIds.delete(l.id);
      }
    }

    // Shade spawn edge arrow indicator
    if (this.shadeAlertTimer > 0 && this.lastAlertedShadePos) {
      const dx = this.lastAlertedShadePos[0] - this.engine.player.pos[0];
      const dz = this.lastAlertedShadePos[2] - this.engine.player.pos[2];
      const dirText = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? '← Trái' : '→ Phải') : (dz > 0 ? '↑ Trước' : '↓ Sau');
      this.shadeArrowUI.style.display = 'block';
      this.shadeArrowUI.innerText = `⚠ Bóng Mực xuất hiện (${dirText})`;
    } else {
      this.shadeArrowUI.style.display = 'none';
    }

    const litCount = this.engine.lanterns.filter(l => l.lit).length;
    const reqCount = Math.ceil(this.engine.tuning.win_ratio * this.engine.lanterns.length);
    this.lanternCountUI.innerText = `${litCount} / ${this.engine.lanterns.length} (≥${reqCount})`;
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
      const keyName = formatKeyLabel(this.keybinds.interact);
      this.interactPromptUI.style.display = 'block';
      if (nearActionLantern.lit) {
        const f = Math.round(this.engine.getLanternFuel(nearActionLantern));
        this.interactPromptUI.innerText = `${keyName} — Châm dầu (${f}/100)`;
      } else {
        const cost = nearActionLantern.ever_lit ? this.engine.tuning.relight_cost : this.engine.tuning.lantern_cost;
        this.interactPromptUI.innerText = `${keyName} — Nạp ánh sáng (${nearActionLantern.deposited}/${cost})`;
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

    const ultCharge = this.engine.player.ultimateCharge;
    const ultKey = formatKeyLabel(this.keybinds.ultimate);
    if (ultCharge >= 2) {
      this.ultBadgeUI.className = 'ability-badge ult-ready';
      this.ultCdUI.innerText = `SẴN SÀNG (${ultKey})`;
    } else {
      this.ultBadgeUI.className = 'ability-badge cd';
      this.ultCdUI.innerText = `Tích: ${ultCharge}/2`;
    }

    // End Screen Modal + Leaderboard Save prompt (on Night 3 Win OR any Lose)
    if ((this.engine.state === 'won' || this.engine.state === 'lost') && !this.modalOverlay.classList.contains('active')) {
      this.modalOverlay.classList.add('active');
      const titleEl = document.getElementById('modal-title')!;
      const descEl = document.getElementById('modal-desc')!;
      const nextBtn = document.getElementById('btn-next-night')!;
      const saveSec = document.getElementById('save-score-section')!;
      const saveMsg = document.getElementById('save-score-msg')!;
      saveMsg.innerText = '';

      if (this.engine.state === 'won') {
        soundFx.playWin();
        this.totalCampaignScore += this.engine.score;
        this.nightsWonCount = Math.min(3, Math.max(this.nightsWonCount, this.currentNight));
        if (this.currentNight < 3) {
          titleEl.innerText = `HOÀN THÀNH ĐÊM ${this.currentNight}!`;
          titleEl.style.color = '#F2C14E';
          descEl.innerText = `Điểm Đêm ${this.currentNight}: ${this.engine.score} · Tổng điểm: ${this.totalCampaignScore}`;
          nextBtn.style.display = 'inline-block';
          saveSec.style.display = 'none';
        } else {
          titleEl.innerText = 'BÌNH MINH ĐÃ ĐẾN!';
          titleEl.style.color = '#FFE9B0';
          descEl.innerText = `Bạn đã giữ sáng Ba Hòn Đảo tới bình minh! Tổng điểm: ${this.totalCampaignScore}`;
          nextBtn.style.display = 'none';
          saveSec.style.display = 'block';
        }
      } else {
        soundFx.playLose();
        titleEl.innerText = 'ĐÊM TỐI BAO PHỦ';
        titleEl.style.color = this.colorblindMode ? '#FFFFFF' : '#FF5A5F';
        descEl.innerText = `Thử lại Đêm ${this.currentNight}. Tổng điểm các Đêm đã thắng: ${this.totalCampaignScore}`;
        nextBtn.style.display = 'none';
        saveSec.style.display = 'block';
      }
    }
  }

  private finishBenchmark(): void {
    if (this.benchFinished) return;
    this.benchFinished = true;

    const dts = this.benchFrameDts;
    const n = Math.max(1, dts.length);
    const sumDt = dts.reduce((a, b) => a + b, 0);
    const avgFps = Math.round((1000 * n / Math.max(1, sumDt)) * 10) / 10;

    const sortedDesc = [...dts].sort((a, b) => b - a);
    const k = Math.max(1, Math.ceil(0.01 * n));
    const topKAvg = sortedDesc.slice(0, k).reduce((a, b) => a + b, 0) / k;
    const p1LowFps = Math.round((1000 / Math.max(0.1, topKAvg)) * 10) / 10;

    const sortedAsc = [...dts].sort((a, b) => a - b);
    const p95Idx = Math.min(n - 1, Math.floor(0.95 * n));
    const frameMsP95 = Math.round(sortedAsc[p95Idx] * 100) / 100;

    const gl = this.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'WebGL2';
    const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const peakMemMb = perfMem ? Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10 : null;

    const payload = {
      contract_version: '1.3',
      avg_fps: avgFps,
      p1_low_fps: p1LowFps,
      frame_ms_p95: frameMsP95,
      frames: n,
      load_ms: Math.round(this.benchFirstFrameMs),
      peak_mem_mb: peakMemMb,
      vsync_off: true,
      renderer: `Three.js 0.160.1 WebGLRenderer (${gpuStr})`,
      diag_top5_ms: sortedDesc.slice(0, 5).map(x => Math.round(x * 10) / 10)
    };

    this.benchBannerUI.textContent = `BENCHMARK DONE · avg=${avgFps} FPS · p1_low=${p1LowFps} FPS · p95=${frameMsP95}ms`;
    fetch('/__bench_result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  private startLoop(): void {
    let lastTime = performance.now();
    let accumulatedTime = 0;
    const fixedStep = 1000 / 60;
    let lastBenchBannerSec = -1;

    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);

      const dtMs = Math.max(0.1, currentTime - lastTime);
      const delta = Math.min(dtMs / 1000, 0.1);
      lastTime = currentTime;

      if (this.isBenchMode) {
        if (this.benchFirstFrameMs === 0) {
          this.benchFirstFrameMs = this.benchProcessT0 > 0 ? Math.max(1, Date.now() - this.benchProcessT0) : currentTime;
          this.benchStartWallMs = currentTime;
        }
        const elapsedSec = (currentTime - this.benchStartWallMs) / 1000;
        const warmupSec = 3.0;

        // Orbit camera R=30m, Y=15m, starting (30,15,0), CCW from above, 15s/rev
        const orbitAngle = (elapsedSec / 15.0) * Math.PI * 2;
        this.camera.position.set(Math.cos(orbitAngle) * 30, 15, -Math.sin(orbitAngle) * 30);
        this.camera.lookAt(0, 0, 0);

        // Move 200 wandering Shades smoothly while respecting R<=38m and L1-L3 6m safe zones (zero-allocation)
        const lanterns = this.engine.lanterns;
        const litCountLimit = Math.min(3, lanterns.length);
        if (this.benchShadesInstanced) {
          for (let i = 0; i < this.benchShadePos.length; i++) {
            const sp = this.benchShadePos[i];
            let nx = sp.x + sp.vx * delta;
            let nz = sp.z + sp.vz * delta;
            if (nx * nx + nz * nz > 38 * 38) {
              sp.vx = -sp.vx;
              sp.vz = -sp.vz;
              nx = sp.x;
              nz = sp.z;
            }
            for (let li = 0; li < litCountLimit; li++) {
              const l = lanterns[li];
              const dx = nx - l.pos[0];
              const dz = nz - l.pos[2];
              if (dx * dx + dz * dz < 36) {
                sp.vx = -sp.vx;
                sp.vz = -sp.vz;
                nx = sp.x;
                nz = sp.z;
                break;
              }
            }
            sp.x = nx;
            sp.z = nz;
            _scratchVec.set(sp.x, 0.95 + Math.sin(elapsedSec * 3 + i) * 0.15, sp.z);
            _scratchScale.set(1, 1, 1);
            _scratchMatrix.compose(_scratchVec, _scratchQuat, _scratchScale);
            this.benchShadesInstanced.setMatrixAt(i, _scratchMatrix);
          }
          this.benchShadesInstanced.instanceMatrix.needsUpdate = true;
        }

        // Render standard Night 1 scene with full lighting/shadows (creative Bloom post-process disabled in bench per Ticket-04)
        this.updateVisuals(delta);
        this.renderer.render(this.scene, this.camera);

        if (!this.benchFinished) {
          const secInt = Math.floor(elapsedSec);
          if (elapsedSec < warmupSec) {
            if (secInt !== lastBenchBannerSec) {
              lastBenchBannerSec = secInt;
              this.benchBannerUI.textContent = `BENCHMARK Warmup: ${Math.ceil(warmupSec - elapsedSec)}s...`;
            }
          } else if (elapsedSec < warmupSec + this.benchDurationSec) {
            this.benchFrameDts.push(dtMs);
            if (secInt !== lastBenchBannerSec) {
              lastBenchBannerSec = secInt;
              const rem = Math.ceil(warmupSec + this.benchDurationSec - elapsedSec);
              this.benchBannerUI.textContent = `BENCHMARK Measuring (${this.benchFrameDts.length} frames · ${rem}s left)`;
            }
          } else {
            this.finishBenchmark();
          }
        }
        return;
      }

      if (this.captionTimer > 0) {
        this.captionTimer -= delta;
        if (this.captionTimer <= 0) this.captionBarUI.style.display = 'none';
      }
      if (this.shadeAlertTimer > 0) {
        this.shadeAlertTimer -= delta;
      }

      if (this.isInGame && this.engine.state === 'playing') {
        accumulatedTime += delta * 1000;
        while (accumulatedTime >= fixedStep) {
          accumulatedTime -= fixedStep;

          let moveX = 0;
          let moveZ = 0;
          const kb = this.keybinds;
          if (this.keyState[kb.up] || this.keyState['arrowup']) moveZ += 1;
          if (this.keyState[kb.down] || this.keyState['arrowdown']) moveZ -= 1;
          // Camera looks along +Z: +X is screen-left, -X is screen-right
          if (this.keyState[kb.left] || this.keyState['arrowleft']) moveX += 1;
          if (this.keyState[kb.right] || this.keyState['arrowright']) moveX -= 1;

          const wasGrounded = this.engine.player.grounded;
          const events = this.engine.step({
            tick: this.engine.tickCount,
            move: [moveX, moveZ],
            cam_yaw_deg: 0,
            jump: this.pendingJump,
            dash: this.pendingDash,
            interact: this.pendingInteract,
            pulse: this.pendingPulse,
            ultimate: this.pendingUltimate
          });

          const p = this.engine.player.pos;
          if (wasGrounded && !this.engine.player.grounded && this.engine.player.vel[1] > 0) {
            soundFx.playJump();
            if (!this.reduceMotion) this.particleSystem.emit(p[0], p[1] + 0.1, p[2], 8, 0.85, 0.8, 0.65, 2.2, 1.4, 0.45);
          }
          if (!wasGrounded && this.engine.player.grounded) {
            this.landingSquash = this.reduceMotion ? 0 : 1.0;
            if (!this.reduceMotion) this.particleSystem.emit(p[0], p[1] + 0.1, p[2], 10, 0.8, 0.72, 0.56, 2.5, 1.2, 0.45);
          }
          for (const ev of events) {
            if (ev.name === 'mote_picked') {
              soundFx.playMotePickup();
              if (!this.reduceMotion) this.particleSystem.emit(p[0], p[1] + 0.9, p[2], 12, 1.0, 0.94, 0.65, 2.8, 3.2, 0.55);
            } else if (ev.name === 'deposit' || ev.name === 'refuel') {
              soundFx.playMotePickup();
              this.interactAnimTimer = 0.28;
              const lid = ev.data.lantern_id as string;
              const l = this.engine.lanterns.find(x => x.id === lid);
              if (l && !this.reduceMotion) this.particleSystem.emit(l.pos[0], l.pos[1] + 3.6, l.pos[2], 14, 1.0, 0.72, 0.28, 3.2, 3.5, 0.65);
            } else if (ev.name === 'lantern_lit') {
              soundFx.playLanternLit();
              this.interactAnimTimer = 0.36;
              const lid = ev.data.lantern_id as string;
              const l = this.engine.lanterns.find(x => x.id === lid);
              if (l && !this.reduceMotion) this.particleSystem.emit(l.pos[0], l.pos[1] + 4.0, l.pos[2], 28, 1.0, 0.85, 0.45, 5.2, 4.5, 0.9);
            } else if (ev.name === 'pulse') {
              soundFx.playPulse();
              this.pulseAnimTimer = 0.38;
              this.triggerPulseVfx();
              if (!this.reduceMotion) this.particleSystem.emit(p[0], p[1] + 0.9, p[2], 24, 1.0, 0.92, 0.72, 7.5, 1.8, 0.48);
              if (this.engine.player.ultimateCharge >= 2) {
                this.showCaption(`⚔ Chiêu Cuối TRẢM TOÀN ĐẢO sẵn sàng! Ấn [${formatKeyLabel(this.keybinds.ultimate)}]`, 3.0);
              }
            } else if (ev.name === 'ultimate_slash') {
              soundFx.playUltimateSlash();
              this.ultimateAnimTimer = 0.75;
              this.triggerUltimateVfx();
              this.showCaption('⚔ TRẢM TOÀN ĐẢO! Quét sạch Bóng Mực khắp hòn đảo!', 2.6);
              if (!this.reduceMotion) {
                this.particleSystem.emit(p[0], p[1] + 1.1, p[2], 48, 1.0, 0.35, 0.35, 16.0, 4.0, 0.85);
                this.particleSystem.emit(p[0], p[1] + 1.1, p[2], 36, 1.0, 0.85, 0.45, 12.5, 3.2, 0.75);
              }
            } else if (ev.name === 'dash') {
              soundFx.playDash();
              if (!this.reduceMotion) this.particleSystem.emit(p[0], p[1] + 0.7, p[2], 14, 0.95, 0.76, 0.3, 4.2, 1.6, 0.45);
            } else if (ev.name === 'charm_picked') {
              soundFx.playLanternLit();
              if (!this.reduceMotion) this.particleSystem.emit(p[0], p[1] + 1.0, p[2], 22, 0.9, 0.15, 0.2, 4.5, 3.8, 0.75);
            } else if (ev.name === 'player_hit') {
              soundFx.playHurt();
              if (!this.reduceMotion) this.particleSystem.emit(p[0], p[1] + 0.9, p[2], 18, 0.65, 0.25, 1.0, 4.5, 2.8, 0.65);
            } else if (ev.name === 'shade_spawned') {
              soundFx.playShadeSpawn();
              const sid = ev.data.id as string;
              const sh = this.engine.shades.find(x => x.id === sid);
              if (sh) {
                this.lastAlertedShadePos = [...sh.pos];
                this.shadeAlertTimer = 3.5;
              }
              this.showCaption('⚠ Bóng Mực vừa xuất hiện trong sương!', 3.0);
            }
          }
        }
      }

      this.updateVisuals(delta);
      this.updateHUD();
      this.composer.render();
    };

    requestAnimationFrame(animate);
  }

  private triggerPulseVfx(): void {
    this.pulseVfx.active = true;
    this.pulseVfx.progress = 0;
    const p = this.engine.player.pos;
    this.pulseVfx.ring.position.set(p[0], p[1] + 0.25, p[2]);
    this.pulseVfx.bladeArc1.position.set(p[0], p[1] + 0.95, p[2]);
    this.pulseVfx.bladeArc2.position.set(p[0], p[1] + 1.05, p[2]);
    this.pulseVfx.ring.visible = true;
    this.pulseVfx.bladeArc1.visible = true;
    this.pulseVfx.bladeArc2.visible = !this.reduceMotion;
  }

  private triggerUltimateVfx(): void {
    this.ultimateVfx.active = true;
    this.ultimateVfx.progress = 0;
    const p = this.engine.player.pos;
    this.ultimateVfx.group.position.set(p[0], p[1], p[2]);
    this.ultimateVfx.group.visible = true;
  }

  private updateVisuals(dt: number): void {
    const time = performance.now() * 0.001;
    const p = this.engine.player;

    let litCount = 0;
    for (let i = 0; i < this.engine.lanterns.length; i++) {
      if (this.engine.lanterns[i].lit) litCount++;
    }
    const litRatio = litCount / Math.max(1, this.engine.lanterns.length);
    this.ambientLight.intensity = 0.15 + 0.55 * litRatio;
    this.skyDome.uniforms.uLitRatio.value = litRatio;
    this.skyDome.uniforms.uTime.value = time;
    this.cloudSea.uniforms.uTime.value = time;
    this.particleSystem.update(dt);
    if (!this.isBenchMode) this.ambientDust.rotation.y = time * 0.025;

    // Articulated Mây Animations
    this.playerRig.root.position.set(p.pos[0], p.pos[1], p.pos[2]);
    const horizSpeed = Math.sqrt(p.vel[0] * p.vel[0] + p.vel[2] * p.vel[2]);

    let targetBank = 0;
    if (horizSpeed > 0.25) {
      const targetYaw = Math.atan2(p.vel[0], p.vel[2]);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      targetBank = this.reduceMotion ? 0 : Math.max(-0.22, Math.min(0.22, -diff * 0.45));
      this.playerYaw += diff * Math.min(1, dt * 14);
    }
    this.bankAngle += (targetBank - this.bankAngle) * Math.min(1, dt * 10);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.playerRig.bodyGroup.rotation.z = this.bankAngle;
    this.playerRig.bodyGroup.visible = p.invulnTicks <= 0 || this.reduceMotion || Math.floor(time * 16) % 2 === 0;
    if (this.landingSquash > 0) this.landingSquash = Math.max(0, this.landingSquash - dt * 5);
    if (this.interactAnimTimer > 0) this.interactAnimTimer = Math.max(0, this.interactAnimTimer - dt);
    if (this.pulseAnimTimer > 0) this.pulseAnimTimer = Math.max(0, this.pulseAnimTimer - dt);
    if (this.ultimateAnimTimer > 0) this.ultimateAnimTimer = Math.max(0, this.ultimateAnimTimer - dt);

    // Contact Ground Shadow
    const groundY = getGroundHeight(p.pos[0], p.pos[2], this.currentNight, p.pos[1]);
    if (groundY > -100) {
      const hAbove = Math.max(0, p.pos[1] - groundY);
      this.playerRig.groundShadow.visible = true;
      this.playerRig.groundShadow.position.set(p.pos[0], groundY + 0.04, p.pos[2]);
      this.playerRig.groundShadow.scale.setScalar(Math.max(0.32, 1.0 - hAbove * 0.09));
      (this.playerRig.groundShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.46 - hAbove * 0.045);
    } else {
      this.playerRig.groundShadow.visible = false;
    }

    const isDashing = p.dashTicks > 0;
    if (isDashing) {
      this.playerRig.bodyGroup.rotation.x = 0.46;
      this.playerRig.bodyGroup.scale.set(0.9, 0.95, 1.18);
      this.playerRig.leftArm.rotation.x = 0.95;
      this.playerRig.rightArm.rotation.x = 0.95;
      this.playerRig.leftLeg.rotation.x = 0.55;
      this.playerRig.rightLeg.rotation.x = -0.35;
      this.playerRig.dashRings.forEach((r, ri) => {
        r.visible = !this.reduceMotion;
        r.rotation.z = time * (11 + ri * 3);
      });
    } else if (!p.grounded) {
      this.playerRig.bodyGroup.rotation.x = 0.1;
      const stretch = 1 + Math.max(-0.08, Math.min(0.14, p.vel[1] * 0.015));
      this.playerRig.bodyGroup.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
      this.playerRig.leftArm.rotation.x = -0.75;
      this.playerRig.rightArm.rotation.x = -0.75;
      this.playerRig.leftLeg.rotation.x = 0.38;
      this.playerRig.rightLeg.rotation.x = -0.28;
      this.playerRig.dashRings.forEach(r => (r.visible = false));
    } else if (horizSpeed > 0.3) {
      this.runCycle += dt * horizSpeed * 1.95;
      const stepIdx = Math.floor(this.runCycle / Math.PI);
      if (stepIdx !== this.lastFootstepIndex) {
        this.lastFootstepIndex = stepIdx;
        if (!this.reduceMotion && !this.isBenchMode) {
          this.particleSystem.emit(p.pos[0], p.pos[1] + 0.08, p.pos[2], 3, 0.78, 0.72, 0.56, 1.2, 0.9, 0.32);
        }
      }
      const swing = Math.sin(this.runCycle);
      this.playerRig.leftLeg.rotation.x = swing * 0.72;
      this.playerRig.rightLeg.rotation.x = -swing * 0.72;
      this.playerRig.leftArm.rotation.x = -swing * 0.6;
      this.playerRig.rightArm.rotation.x = swing * 0.6;
      this.playerRig.bodyGroup.position.y = Math.abs(Math.cos(this.runCycle)) * 0.1;
      this.playerRig.bodyGroup.rotation.x = 0.14;
      this.playerRig.bodyGroup.scale.set(1 + this.landingSquash * 0.14, 1 - this.landingSquash * 0.16, 1 + this.landingSquash * 0.14);
      this.playerRig.dashRings.forEach(r => (r.visible = false));
    } else {
      this.playerRig.leftLeg.rotation.x *= 0.84;
      this.playerRig.rightLeg.rotation.x *= 0.84;
      this.playerRig.leftArm.rotation.x = Math.sin(time * 2.2) * 0.07;
      this.playerRig.rightArm.rotation.x = -Math.sin(time * 2.2) * 0.07;
      this.playerRig.bodyGroup.position.y = Math.sin(time * 2.5) * 0.032;
      this.playerRig.bodyGroup.rotation.x *= 0.84;
      this.playerRig.bodyGroup.scale.set(1 + this.landingSquash * 0.14, 1 - this.landingSquash * 0.16, 1 + this.landingSquash * 0.14);
      this.playerRig.dashRings.forEach(r => (r.visible = false));
    }

    if (this.pulseAnimTimer > 0) {
      const a = Math.sin((this.pulseAnimTimer / 0.38) * Math.PI);
      this.playerRig.leftArm.rotation.x = -2.4 * a;
      this.playerRig.rightArm.rotation.x = -2.4 * a;
      this.playerRig.leftArm.rotation.z = 0.45 * a;
      this.playerRig.rightArm.rotation.z = -0.45 * a;
    } else if (this.interactAnimTimer > 0) {
      const a = Math.sin((this.interactAnimTimer / 0.28) * Math.PI);
      this.playerRig.leftArm.rotation.x = -1.25 * a;
      this.playerRig.rightArm.rotation.x = -1.25 * a;
      this.playerRig.leftArm.rotation.z = 0;
      this.playerRig.rightArm.rotation.z = 0;
    } else {
      this.playerRig.leftArm.rotation.z = 0;
      this.playerRig.rightArm.rotation.z = 0;
    }

    const flutter = 0.16 + Math.min(0.52, horizSpeed * 0.055);
    this.playerRig.scarfSegsL.forEach((seg, si) => {
      seg.rotation.x = Math.sin(time * 9.5 - si * 1.1) * flutter + (si === 0 ? horizSpeed * 0.04 : 0);
    });
    this.playerRig.scarfSegsR.forEach((seg, si) => {
      seg.rotation.x = Math.sin(time * 9.5 - si * 1.1 + 1.3) * flutter + (si === 0 ? horizSpeed * 0.04 : 0);
    });
    this.playerRig.backFlap.rotation.x = 0.08 + Math.min(0.55, horizSpeed * 0.06) + Math.sin(this.runCycle * 2) * 0.06;
    this.playerRig.hairBraidL.rotation.x = Math.min(0.5, horizSpeed * 0.05) + Math.sin(time * 6) * 0.08;
    this.playerRig.hairBraidR.rotation.x = Math.min(0.5, horizSpeed * 0.05) + Math.cos(time * 6) * 0.08;
    this.playerRig.hatGroup.rotation.x = -Math.min(0.14, horizSpeed * 0.012);
    this.playerRig.miniLanternPivot.rotation.z = Math.sin(time * 3.5 + this.runCycle * 0.5) * (0.14 + horizSpeed * 0.025);
    this.playerRig.miniLanternPivot.rotation.x = -Math.min(0.35, horizSpeed * 0.035);

    const carryRatio = this.isBenchMode ? 0 : p.carried / Math.max(1, p.capacity);
    this.playerRig.hatLight.intensity = 0.9 + carryRatio * 3.8 + (this.reduceMotion ? 0 : Math.sin(time * 7) * 0.15);
    this.playerRig.miniLanternMat.emissiveIntensity = 1.0 + carryRatio * 2.2;
    this.playerRig.miniHalo.scale.setScalar(0.95 + carryRatio * 1.15);
    this.playerRig.pouchMat.emissiveIntensity = 0.1 + carryRatio * 1.6;
    this.playerRig.katanaBladeGlowMat.emissiveIntensity = 0.85 + carryRatio * 2.1;

    // Katana Draw & 360° Whirlwind Slash / Island-Wide Ultimate Finisher Animation
    const isSlashing = this.pulseAnimTimer > 0 || this.ultimateAnimTimer > 0 || isDashing;
    this.playerRig.katanaDrawn.visible = isSlashing;
    this.playerRig.katanaSheathedHilt.visible = !isSlashing;
    this.playerRig.katanaScabbard.rotation.x = 0.08 + Math.min(0.24, horizSpeed * 0.025);
    if (this.ultimateAnimTimer > 0) {
      const ultProg = 1 - this.ultimateAnimTimer / 0.75;
      // Full 720° samurai spin slash around Mây
      if (!this.reduceMotion) this.playerRig.root.rotation.y = this.playerYaw + ultProg * Math.PI * 4;
      this.playerRig.katanaSlashArc.visible = !this.reduceMotion;
      this.playerRig.katanaSlashArc.rotation.z = -2.2 + ultProg * 12.0;
      this.playerRig.katanaSlashArc.scale.setScalar(1.4 + ultProg * 3.8);
      (this.playerRig.katanaSlashArc.material as THREE.MeshBasicMaterial).opacity = (1 - ultProg) * 0.95;
      this.playerRig.rightArm.rotation.x = -1.55;
      this.playerRig.rightArm.rotation.z = -1.5 + ultProg * 3.2;
      this.playerRig.leftArm.rotation.x = -0.9;
    } else if (this.pulseAnimTimer > 0) {
      const slashProg = 1 - this.pulseAnimTimer / 0.38;
      // 360° whirlwind spin slash around Mây
      if (!this.reduceMotion) this.playerRig.root.rotation.y = this.playerYaw + slashProg * Math.PI * 2;
      this.playerRig.katanaSlashArc.visible = !this.reduceMotion;
      this.playerRig.katanaSlashArc.rotation.z = -1.8 + slashProg * 6.5;
      this.playerRig.katanaSlashArc.scale.setScalar(1.0 + slashProg * 2.2);
      (this.playerRig.katanaSlashArc.material as THREE.MeshBasicMaterial).opacity = (1 - slashProg) * 0.92;
      this.playerRig.rightArm.rotation.x = -1.5;
      this.playerRig.rightArm.rotation.z = -1.35 + slashProg * 2.8;
    } else if (isDashing) {
      this.playerRig.katanaSlashArc.visible = false;
      this.playerRig.rightArm.rotation.x = 0.65;
      this.playerRig.rightArm.rotation.z = -0.35;
    } else {
      this.playerRig.katanaSlashArc.visible = false;
    }

    if (p.charmTicks > 0) {
      this.playerRig.charmAura.visible = true;
      this.playerRig.charmAura.rotation.z = time * 3.5;
    } else {
      this.playerRig.charmAura.visible = false;
    }

    // Smooth Third-Person Camera Follow / Menu Vista / Bridge Flyover (skipped in bench mode)
    if (!this.isBenchMode) {
      if (!this.isInGame) {
        // Scenic menu vista framing Đảo Bến + glowing Lantern Sky-Bridge toward Đảo Cau & Đảo Chuông
        const panX = this.reduceMotion ? 0 : Math.sin(time * 0.16) * 5.0;
        _scratchVec.set(panX, 15.5, -24);
        this.camera.position.lerp(_scratchVec, 0.05);
        _cameraTarget.set(6, 3.0, 44);
        this.camera.lookAt(_cameraTarget);
      } else if (this.flyoverTimer > 0 && this.flyoverStartPos) {
        this.flyoverTimer = Math.max(0, this.flyoverTimer - dt);
        const rawT = 1 - this.flyoverTimer / this.flyoverDuration;
        // Cubic ease-in-out glide along the Lantern Sky-Bridge into the arrived island
        const easeT = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
        const endX = p.pos[0];
        const endY = p.pos[1] + 9.5;
        const endZ = p.pos[2] - 14.2;
        const archLift = Math.sin(easeT * Math.PI) * 5.0;
        this.camera.position.set(
          this.flyoverStartPos[0] + (endX - this.flyoverStartPos[0]) * easeT,
          this.flyoverStartPos[1] + (endY - this.flyoverStartPos[1]) * easeT + archLift,
          this.flyoverStartPos[2] + (endZ - this.flyoverStartPos[2]) * easeT
        );
        _cameraTarget.set(p.pos[0], p.pos[1] + 2.0, p.pos[2] + (1 - easeT) * 8);
        this.camera.lookAt(_cameraTarget);
      } else {
        _cameraTarget.set(p.pos[0], p.pos[1] + 1.5, p.pos[2]);
        _scratchVec.set(p.pos[0], p.pos[1] + 9.5, p.pos[2] - 14.2);
        this.camera.position.lerp(_scratchVec, this.reduceMotion ? 0.14 : 0.08);
        this.camera.lookAt(_cameraTarget);
      }

      if (!this.reduceMotion && this.bridgeLanternMats.length > 0) {
        for (let bi = 0; bi < this.bridgeLanternMats.length; bi++) {
          const mat = this.bridgeLanternMats[bi];
          if (mat.emissiveIntensity > 1.0) {
            mat.emissiveIntensity = 1.9 + Math.sin(time * 2.6 + bi * 1.1) * 0.3;
          }
        }
      }
    }

    // Lanterns
    this.engine.lanterns.forEach((l, idx) => {
      const lv = this.lanternVisuals[idx];
      if (!lv) return;
      const fuel = this.engine.getLanternFuel(l);

      lv.tassels.forEach((t, ti) => {
        t.rotation.z = this.reduceMotion ? 0 : Math.sin(time * 2.8 + idx + ti * 0.9) * 0.14;
      });

      if (l.lit) {
        const isLowFuel = fuel < this.engine.tuning.low_fuel_threshold;
        const blink1Hz = isLowFuel && !this.reduceMotion ? (Math.sin(time * Math.PI * 2) > 0 ? 1.0 : 0.25) : 1.0;
        const flicker = this.reduceMotion ? 0 : Math.sin(time * 6 + idx * 1.7) * 0.3;

        if (lv.coreMat.map !== this.textures.lanternLitMap) {
          lv.coreMat.map = this.textures.lanternLitMap;
          lv.coreMat.needsUpdate = true;
        }
        lv.coreMesh.scale.set(1, 1, 1);
        lv.flameCore.visible = true;
        lv.flameCore.scale.setScalar((0.88 + flicker * 0.35) * blink1Hz);
        lv.flameCore.rotation.y = time * 2.2 + idx;
        lv.tearGroup.visible = false;
        lv.coreMat.emissive.setHex(COLORS.lanternLit);
        lv.coreMat.emissiveIntensity = (1.6 + flicker * 0.35) * blink1Hz;
        lv.light.intensity = (4.8 + flicker) * blink1Hz;
        (lv.glowHalo.material as THREE.SpriteMaterial).opacity = (0.48 + flicker * 0.08) * blink1Hz;

        lv.safeRing.visible = !isLowFuel;
        lv.safeRing.rotation.z = time * 0.25;

        lv.fuelBarGroup.visible = !this.isBenchMode;
        lv.fuelBarGroup.lookAt(this.camera.position);
        const ratio = Math.max(0.02, fuel / this.engine.tuning.fuel_max);
        lv.fuelBarFill.scale.x = ratio;
        lv.fuelBarFill.position.x = -(1 - ratio) * 0.82;
        lv.fuelBarMat.color.setHex(isLowFuel ? (this.colorblindMode ? 0xffffff : 0xff5a5f) : COLORS.lanternLit);
        lv.fuelBarFill.visible = !isLowFuel || blink1Hz > 0.5;
      } else {
        if (lv.coreMat.map !== this.textures.lanternTornMap) {
          lv.coreMat.map = this.textures.lanternTornMap;
          lv.coreMat.needsUpdate = true;
        }
        lv.coreMesh.scale.set(1, 0.8, 1);
        lv.flameCore.visible = false;
        lv.tearGroup.visible = true;
        lv.fuelBarGroup.visible = false;
        lv.safeRing.visible = false;
        (lv.glowHalo.material as THREE.SpriteMaterial).opacity = 0;

        if (l.deposited > 0) {
          const cost = l.ever_lit ? this.engine.tuning.relight_cost : this.engine.tuning.lantern_cost;
          const ratio = l.deposited / cost;
          lv.coreMat.emissive.setHex(COLORS.lanternLit);
          lv.coreMat.emissiveIntensity = ratio * 0.85;
          lv.light.intensity = ratio * 1.4;
        } else {
          lv.coreMat.emissive.setHex(0x000000);
          lv.coreMat.emissiveIntensity = 0;
          lv.light.intensity = 0;
        }
      }
    });

    // Dual-layer Winged Fireflies InstancedMesh (up to 128, zero-allocation loop)
    let moteIdx = 0;
    for (let mi = 0; mi < this.engine.motes.length && moteIdx < 128; mi++) {
      const m = this.engine.motes[mi];
      if (!m.active) continue;
      const orbitAngle = time * 1.4 + moteIdx * 1.7;
      const fx = m.pos[0] + (this.isBenchMode ? 0 : Math.cos(orbitAngle) * 0.18);
      const fz = m.pos[2] + (this.isBenchMode ? 0 : Math.sin(orbitAngle) * 0.18);
      const floatY = m.pos[1] + 0.62 + Math.sin(time * 3.2 + moteIdx * 1.3) * 0.24;
      const pulseScale = 0.85 + Math.sin(time * 5.2 + moteIdx) * 0.24;

      _scratchVec.set(fx, floatY, fz);
      _scratchEuler.set(0, orbitAngle, 0);
      _scratchQuat.setFromEuler(_scratchEuler);
      _scratchScale.set(1, 1, 1);
      _scratchMatrix.compose(_scratchVec, _scratchQuat, _scratchScale);
      this.moteCoreInstanced.setMatrixAt(moteIdx, _scratchMatrix);

      _scratchScale.set(pulseScale, pulseScale, pulseScale);
      _scratchMatrix.compose(_scratchVec, _scratchQuat, _scratchScale);
      this.moteHaloInstanced.setMatrixAt(moteIdx, _scratchMatrix);

      if (!this.isBenchMode) {
        const flap = this.reduceMotion ? 0.25 : Math.sin(time * 28 + moteIdx * 2.1) * 0.72;
        _scratchVec2.set(fx, floatY + 0.08, fz);
        _scratchEuler.set(0.2, orbitAngle, flap);
        _scratchQuat.setFromEuler(_scratchEuler);
        _scratchScale.set(1, 1, 1);
        _scratchMatrix.compose(_scratchVec2, _scratchQuat, _scratchScale);
        this.moteWingLInstanced.setMatrixAt(moteIdx, _scratchMatrix);

        _scratchEuler.set(0.2, orbitAngle, -flap);
        _scratchQuat.setFromEuler(_scratchEuler);
        _scratchMatrix.compose(_scratchVec2, _scratchQuat, _scratchScale);
        this.moteWingRInstanced.setMatrixAt(moteIdx, _scratchMatrix);
      }
      moteIdx++;
    }
    for (let i = moteIdx; i < 128; i++) {
      _scratchMatrix.makeTranslation(0, -999, 0);
      this.moteCoreInstanced.setMatrixAt(i, _scratchMatrix);
      this.moteHaloInstanced.setMatrixAt(i, _scratchMatrix);
      if (!this.isBenchMode) {
        this.moteWingLInstanced.setMatrixAt(i, _scratchMatrix);
        this.moteWingRInstanced.setMatrixAt(i, _scratchMatrix);
      }
    }
    this.moteCoreInstanced.instanceMatrix.needsUpdate = true;
    this.moteHaloInstanced.instanceMatrix.needsUpdate = true;
    if (!this.isBenchMode) {
      this.moteWingLInstanced.instanceMatrix.needsUpdate = true;
      this.moteWingRInstanced.instanceMatrix.needsUpdate = true;
    }

    // Articulated Shades + Drain Beam (smooth facing along actual travel direction + zero ground clipping)
    const rimHex = this.colorblindMode ? 0x00b3ff : COLORS.shadeRim;
    for (let i = 0; i < this.shadePool.length; i++) {
      const sv = this.shadePool[i];
      if (!this.isBenchMode && i < this.engine.shades.length) {
        const s = this.engine.shades[i];
        sv.root.visible = true;
        const bob = this.reduceMotion ? 0 : Math.sin(time * 3.5 + i) * 0.14;
        // Elevated y + 1.25 guarantees bottom tendrils (-1.20 local) never sink into the island grass
        sv.root.position.set(s.pos[0], s.pos[1] + 1.25 + bob, s.pos[2]);

        // Face actual movement direction when patrolling/recoiling, target lantern when draining, or player when chasing
        const prev = this.shadePrevPos.get(s.id);
        let desiredYaw = this.shadeYaws.get(s.id) ?? Math.atan2(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]);
        if (s.state === 'chase') {
          desiredYaw = Math.atan2(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]);
        } else if (s.state === 'drain' && s.target_lantern_id) {
          const tL = this.engine.lanterns.find(l => l.id === s.target_lantern_id);
          if (tL) desiredYaw = Math.atan2(tL.pos[0] - s.pos[0], tL.pos[2] - s.pos[2]);
        } else if (prev) {
          const mx = s.pos[0] - prev[0];
          const mz = s.pos[2] - prev[1];
          if (mx * mx + mz * mz > 0.00008) {
            desiredYaw = Math.atan2(mx, mz);
          } else if (s.wanderAngle !== undefined) {
            desiredYaw = Math.atan2(Math.cos(s.wanderAngle), Math.sin(s.wanderAngle));
          }
        }
        this.shadePrevPos.set(s.id, [s.pos[0], s.pos[2]]);
        let curYaw = this.shadeYaws.get(s.id) ?? desiredYaw;
        let yawDiff = desiredYaw - curYaw;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        curYaw += yawDiff * Math.min(1, dt * 10);
        this.shadeYaws.set(s.id, curYaw);
        sv.root.rotation.y = curYaw;

        sv.eyeMat.color.setHex(this.colorblindMode ? 0x00b3ff : 0xe6d4ff);
        (sv.auraSprite.material as THREE.SpriteMaterial).color.setHex(rimHex);
        sv.drainBeamMat.color.setHex(rimHex);

        // Always reset pitch/roll cleanly per state so tilts never leak between states
        sv.root.rotation.x = 0;
        sv.root.rotation.z = 0;

        if (s.state === 'stunned') {
          sv.coreMat.emissive.setHex(COLORS.shadeStunned);
          sv.root.rotation.z = this.reduceMotion ? 0 : Math.sin(time * 18) * 0.24;
          sv.root.scale.setScalar(0.88);
          sv.drainBeam.visible = false;
        } else if (s.state === 'spawning') {
          sv.coreMat.emissive.setHex(rimHex);
          sv.root.scale.setScalar(0.55);
          sv.drainBeam.visible = false;
        } else if (s.state === 'drain') {
          sv.coreMat.emissive.setHex(rimHex);
          sv.root.scale.setScalar(1.1 + (this.reduceMotion ? 0 : Math.sin(time * 10) * 0.06));
          const target = s.target_lantern_id ? this.engine.lanterns.find(l => l.id === s.target_lantern_id) : undefined;
          if (target) {
            _scratchVec.set(s.pos[0], s.pos[1] + 1.55, s.pos[2]);
            _scratchVec2.set(target.pos[0], target.pos[1] + 4.0, target.pos[2]);
            const dist = _scratchVec.distanceTo(_scratchVec2);
            sv.drainBeam.position.copy(_scratchVec).lerp(_scratchVec2, 0.5);
            sv.drainBeam.scale.set(1 + Math.sin(time * 16) * 0.2, 1 + Math.sin(time * 16) * 0.2, dist);
            sv.drainBeam.lookAt(_scratchVec2);
            sv.drainBeam.visible = true;
          } else {
            sv.drainBeam.visible = false;
          }
        } else {
          sv.coreMat.emissive.setHex(rimHex);
          sv.root.rotation.x = s.state === 'chase' ? 0.18 : 0.08;
          sv.root.scale.setScalar(1.0);
          sv.drainBeam.visible = false;
        }

        const whipSpeed = s.state === 'chase' || s.state === 'drain' ? 8.5 : 4.2;
        sv.tendrils.forEach((t, ti) => {
          t.rotation.x = this.reduceMotion ? 0 : Math.sin(time * whipSpeed + ti * 1.1) * 0.26 - 0.15;
          t.rotation.z = this.reduceMotion ? 0 : Math.cos(time * whipSpeed + ti * 1.3) * 0.22;
        });
        (sv.runeRing.material as THREE.MeshBasicMaterial).color.setHex(rimHex);
        sv.runeRing.rotation.z = this.reduceMotion ? 0 : time * (s.state === 'drain' ? 4.5 : 1.8) + i;
        sv.orbitWisps.forEach((w, wi) => {
          const wa = time * 2.8 + wi * ((Math.PI * 2) / 3) + i;
          w.position.set(Math.cos(wa) * 0.96, 0.3 + Math.sin(wa * 1.6) * 0.22, Math.sin(wa) * 0.96);
          w.rotation.y = wa * 2;
        });
      } else {
        sv.root.visible = false;
        sv.drainBeam.visible = false;
      }
    }

    // Flowing Silk Drifters (face actual glide/chase/flee direction)
    let drifterSlot = 0;
    if (!this.isBenchMode) {
      for (let di = 0; di < this.engine.drifters.length && drifterSlot < this.drifterPool.length; di++) {
        const d = this.engine.drifters[di];
        if (d.state === 'removed') continue;
        const dv = this.drifterPool[drifterSlot];
        dv.root.visible = true;
        dv.root.position.set(d.pos[0], d.pos[1] + 1.85 + Math.sin(time * 4 + drifterSlot) * 0.25, d.pos[2]);
        const dPrev = this.drifterPrevPos.get(d.id);
        if (d.state === 'idle' && dPrev) {
          const dmx = d.pos[0] - dPrev[0];
          const dmz = d.pos[2] - dPrev[1];
          if (dmx * dmx + dmz * dmz > 0.00004) dv.root.rotation.y = Math.atan2(dmx, dmz);
        } else {
          dv.root.rotation.y = Math.atan2(p.pos[0] - d.pos[0], p.pos[2] - d.pos[2]) + (d.state === 'flee' ? Math.PI : 0);
        }
        this.drifterPrevPos.set(d.id, [d.pos[0], d.pos[2]]);
        dv.segments.forEach((seg, si) => {
          seg.position.y = Math.sin(time * 10 - si * 0.85) * 0.2;
          seg.rotation.x = Math.cos(time * 10 - si * 0.85) * 0.28;
        });
        drifterSlot++;
      }
    }
    for (let i = drifterSlot; i < this.drifterPool.length; i++) {
      this.drifterPool[i].root.visible = false;
    }

    // Spinning Wind Charms
    for (let i = 0; i < this.charmPool.length; i++) {
      const group = this.charmPool[i];
      if (!this.isBenchMode && i < this.engine.charms.length && this.engine.charms[i].available) {
        const c = this.engine.charms[i];
        group.visible = true;
        group.position.set(c.pos[0], c.pos[1] + 1.05 + Math.sin(time * 3) * 0.18, c.pos[2]);
        group.rotation.y = time * 2.2;
      } else {
        group.visible = false;
      }
    }

    // 360° Katana Whirlwind Slash VFX (Normal Skill F — replaces light dome)
    if (this.pulseVfx.active) {
      this.pulseVfx.progress += dt * 3.1;
      if (this.pulseVfx.progress >= 1) {
        this.pulseVfx.active = false;
        this.pulseVfx.ring.visible = false;
        this.pulseVfx.bladeArc1.visible = false;
        this.pulseVfx.bladeArc2.visible = false;
      } else {
        const prog = this.pulseVfx.progress;
        const radius = 0.8 + prog * this.engine.tuning.pulse_radius;
        const alpha = 1 - prog;
        this.pulseVfx.ring.scale.set(radius, radius, 1);
        (this.pulseVfx.ring.material as THREE.MeshBasicMaterial).opacity = alpha * 0.85;

        const bladeR = 1.2 + prog * (this.engine.tuning.pulse_radius * 0.95);
        this.pulseVfx.bladeArc1.scale.set(bladeR, bladeR, 1);
        this.pulseVfx.bladeArc1.rotation.z = prog * Math.PI * 3.4;
        (this.pulseVfx.bladeArc1.material as THREE.MeshBasicMaterial).opacity = alpha * 0.95;

        this.pulseVfx.bladeArc2.scale.set(bladeR * 0.88, bladeR * 0.88, 1);
        this.pulseVfx.bladeArc2.rotation.z = -prog * Math.PI * 4.2;
        (this.pulseVfx.bladeArc2.material as THREE.MeshBasicMaterial).opacity = alpha * 0.85;
      }
    }

    if (this.portalVfx.active && this.isInGame && this.engine.state === 'playing') {
      const pp = this.portalVfx.targetPos;
      const distP = Math.hypot(p.pos[0] - pp[0], p.pos[2] - pp[2]);
      if (distP <= 4.0) {
        const nextN = this.portalVfx.nextNight;
        this.portalVfx.active = false;
        this.portalVfx.group.visible = false;
        soundFx.playPortal();
        if (nextN <= 3) {
          this.startNight(nextN);
        } else {
          // Completed Night 3 Dawn Portal -> trigger Dawn Victory!
          this.engine.state = 'won';
          this.engine.score += this.engine.player.flames * 50 + this.engine.lanterns.length * 150;
        }
      }
    }

    // Island Portal Gate swirling animation
    if (this.portalVfx.active) {
      this.portalVfx.outerRing.rotation.z = time * 1.4;
      this.portalVfx.innerRing.rotation.z = -time * 2.6;
      const pulse = 0.94 + Math.sin(time * 4.5) * 0.08;
      this.portalVfx.disc.scale.setScalar(pulse);
      (this.portalVfx.beam.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(time * 3.5) * 0.07;
    }

    // Naruto Island-Wide Rasengan Throw & Giant Detonation VFX
    if (this.rasenganVfx.active) {
      this.rasenganVfx.progress += dt * 0.85;
      if (this.rasenganVfx.progress >= 1) {
        this.rasenganVfx.active = false;
        this.rasenganVfx.group.visible = false;
      } else {
        const pr = this.rasenganVfx.progress;
        // Phase 1 (0..0.32): swirling Rasengan launches upward-forward from Mây; Phase 2 (0.32..1): expands island-wide!
        if (pr < 0.32) {
          const t = pr / 0.32;
          const ease = 1 - Math.pow(1 - t, 2);
          const fwdX = Math.sin(this.playerYaw);
          const fwdZ = Math.cos(this.playerYaw);
          this.rasenganVfx.group.position.set(
            this.rasenganVfx.startPos.x + fwdX * ease * 10,
            this.rasenganVfx.startPos.y + ease * 5.5,
            this.rasenganVfx.startPos.z + fwdZ * ease * 10
          );
          const sc = 0.65 + t * 2.2;
          this.rasenganVfx.core.scale.setScalar(sc);
          this.rasenganVfx.shell.scale.setScalar(sc * 1.2);
          (this.rasenganVfx.shell.material as THREE.MeshBasicMaterial).opacity = 0.78;
          this.rasenganVfx.shockwave.visible = false;
          this.rasenganVfx.rings.forEach((r, ri) => {
            r.scale.setScalar(sc * 1.15);
            r.rotation.x += dt * (18 + ri * 5);
            r.rotation.y += dt * (22 - ri * 4);
            (r.material as THREE.MeshBasicMaterial).opacity = 0.88;
          });
        } else {
          const bt = (pr - 0.32) / 0.68;
          const easeOut = 1 - Math.pow(1 - bt, 3);
          const alpha = 1 - bt;
          const sphereSc = 2.8 + easeOut * 42;
          this.rasenganVfx.core.scale.setScalar(Math.max(0.1, (1 - bt) * 8));
          this.rasenganVfx.shell.scale.setScalar(sphereSc);
          (this.rasenganVfx.shell.material as THREE.MeshBasicMaterial).opacity = alpha * 0.52;
          this.rasenganVfx.shockwave.visible = true;
          this.rasenganVfx.shockwave.position.y = -this.rasenganVfx.group.position.y + 0.6;
          const waveR = 3 + easeOut * 86;
          this.rasenganVfx.shockwave.scale.set(waveR, waveR, 1);
          (this.rasenganVfx.shockwave.material as THREE.MeshBasicMaterial).opacity = alpha * 0.92;
          this.rasenganVfx.rings.forEach((r, ri) => {
            r.scale.setScalar(sphereSc * 1.05);
            r.rotation.x += dt * (12 + ri * 4);
            r.rotation.z += dt * 16;
            (r.material as THREE.MeshBasicMaterial).opacity = alpha * 0.85;
          });
        }
      }
    }

    // Island-Wide Katana Ultimate Slash VFX (Trảm Toàn Đảo — J)
    if (this.ultimateVfx.active) {
      this.ultimateVfx.progress += dt * 1.35;
      if (this.ultimateVfx.progress >= 1) {
        this.ultimateVfx.active = false;
        this.ultimateVfx.group.visible = false;
      } else {
        const prog = this.ultimateVfx.progress;
        const easeOut = 1 - Math.pow(1 - prog, 3);
        const alpha = 1 - prog;
        const outerR = 1.5 + easeOut * 88;
        this.ultimateVfx.outerWave.scale.set(outerR, outerR, 1);
        (this.ultimateVfx.outerWave.material as THREE.MeshBasicMaterial).opacity = alpha * 0.95;

        const innerR = 1.2 + easeOut * 66;
        this.ultimateVfx.innerWave.scale.set(innerR, innerR, 1);
        this.ultimateVfx.innerWave.rotation.z = prog * Math.PI * 4.5;
        (this.ultimateVfx.innerWave.material as THREE.MeshBasicMaterial).opacity = alpha * 0.95;

        const streakLen = 6 + easeOut * 95;
        for (let i = 0; i < this.ultimateVfx.crossSlashes.length; i++) {
          const st = this.ultimateVfx.crossSlashes[i];
          st.visible = !this.reduceMotion;
          st.scale.set(streakLen, 0.5 + (1 - prog) * 1.4, 1);
          (st.material as THREE.MeshBasicMaterial).opacity = alpha * 0.92;
        }
      }
    }

    // Environment Ambient Animations
    for (const ring of this.jumpPadRings) {
      const cycle = (time * 1.4) % 1;
      ring.position.y = (ring.userData.baseY as number) + cycle * 1.1;
      ring.scale.setScalar(0.85 + cycle * 0.45);
    }
    if (this.bellMesh) {
      this.bellMesh.rotation.z = this.reduceMotion ? 0 : Math.sin(time * 1.8) * 0.18;
    }
    if (this.boatGroup) {
      this.boatGroup.position.y = -1.6 + Math.sin(time * 1.3) * 0.22;
      this.boatGroup.rotation.z = Math.sin(time * 1.1) * 0.08;
      this.boatGroup.rotation.x = Math.cos(time * 0.9) * 0.04;
    }
    for (const rock of this.floatingRocks) {
      const phase = (rock.userData.phase as number) ?? 0;
      rock.position.y = (rock.userData.baseY as number) + Math.sin(time * 0.9 + phase) * 0.65;
      rock.rotation.y = time * 0.18 + phase;
    }
    const windAmp = this.reduceMotion ? 0 : this.engine.wind.active ? 0.11 : 0.032;
    const windFreq = this.engine.wind.active ? 4.2 : 1.5;
    for (const fg of this.swayFoliageGroups) {
      const phase = (fg.userData.phase as number) ?? 0;
      fg.rotation.z = Math.sin(time * windFreq + phase) * windAmp;
      fg.rotation.x = Math.cos(time * windFreq * 0.8 + phase) * (windAmp * 0.6);
    }

    if (!this.isBenchMode && this.engine.wind.active) {
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
