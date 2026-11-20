/**
 * @file engine.ts
 * @description Core deterministic 60Hz game simulation engine conforming to Test Contract v1.1.
 * Implements strict 12-step tick execution order, standardized spawn tables, and multi-night architecture.
 */

import {
  CharmEntity,
  ContractEvent,
  ContractSnapshot,
  DrifterEntity,
  GameStatus,
  InputFrame,
  InputScenario,
  LanternState,
  MoteState,
  PlayerState,
  ShadeState,
  TuningConfig,
  Vector2D,
  Vector3D,
  WindState
} from './types.js';
import { PRNG } from './prng.js';
import { distanceXZ, round3, roundVec3, transformInputMovement } from './math.js';
import { checkSolidObstacle, getGroundHeight, getJumpPads } from './terrain.js';

export const DEFAULT_TUNING_V11: TuningConfig = {
  player_speed: 6.0,
  dash_speed: 14.0,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5.0,
  pulse_stun_s: 2.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  night1_duration_s: 300,
  night2_duration_s: 330,
  night3_duration_s: 360,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  fall_enabled: true,
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 2,
    per_flame_left: 50
  }
};

export class GameEngine {
  public tuning: TuningConfig;
  public prng: PRNG;
  public night: number = 1;
  public tickCount: number = 0;
  public simTick: number = 0;
  public state: GameStatus = 'playing';
  public score: number = 0;
  public durationSeconds: number;

  public player: PlayerState;
  public lanterns: LanternState[] = [];
  public motes: MoteState[] = [];
  public shades: ShadeState[] = [];
  public drifters: DrifterEntity[] = [];
  public charms: CharmEntity[] = [];
  public wind: WindState;

  private moteSpawnPoints: Vector3D[] = [];
  private shadeSpawnPoints: Vector3D[] = [];

  private lastInput: InputFrame = {
    tick: 0,
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    dash: false,
    interact: false,
    pulse: false,
    pause: false
  };

  private facingDir: Vector2D = [0, 1]; // Facing +Z initially
  private randomMotesEnabled: boolean = true;
  private randomShadesEnabled: boolean = true;
  private randomDriftersEnabled: boolean = true;
  private windEnabled: boolean = true;
  private totalShadesSpawned: number = 0;
  private totalDriftersSpawned: number = 0;

  /**
   * Initializes the simulation engine for a specific Night with a deterministic seed.
   */
  constructor(seed: number, night: number = 1, tuning: TuningConfig = DEFAULT_TUNING_V11) {
    this.tuning = tuning;
    this.night = night;
    this.prng = new PRNG(seed);

    if (night === 2) this.durationSeconds = tuning.night2_duration_s;
    else if (night === 3) this.durationSeconds = tuning.night3_duration_s;
    else this.durationSeconds = tuning.night1_duration_s;

    this.player = {
      pos: [0, 0, 0],
      vel: [0, 0, 0],
      grounded: true,
      carried: 0,
      flames: tuning.flames,
      invulnTicks: 0,
      dashTicks: 0,
      dashCooldownTicks: 0,
      dashDirection: [0, 1],
      pulseCooldownTicks: 0,
      charmTicks: 0,
      respawnDelayTicks: 0,
      isLaunched: false
    };

    this.wind = {
      active: false,
      dir_deg: 0,
      timerTicks: 0,
      durationTicks: 0
    };

    this.initMapEntities();
  }

  /**
   * Builds standardized spawn point tables and initial entities for Nights 1, 2, and 3 per PRD-1.
   */
  private initMapEntities(): void {
    this.lanterns = [];
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.charms = [];
    this.moteSpawnPoints = [];
    this.shadeSpawnPoints = [];

    if (this.night === 1) {
      // Night 1: Đảo Bến (R=40m, 5 Lanterns)
      this.lanterns = [
        { id: 'L1', pos: [0, 0, 25], lit: false, deposited: 0 },
        { id: 'L2', pos: [23.8, 0, 7.7], lit: false, deposited: 0 },
        { id: 'L3', pos: [14.7, 0, -20.2], lit: false, deposited: 0 },
        { id: 'L4', pos: [-14.7, 0, -20.2], lit: false, deposited: 0 },
        { id: 'L5', pos: [-23.8, 0, 7.7], lit: false, deposited: 0 }
      ];

      // 24 mote spawn points: 8 on R=12m (every 45 deg), 16 on R=33m (every 22.5 deg)
      for (let i = 0; i < 8; i++) {
        const rad = (i * 45 * Math.PI) / 180;
        this.moteSpawnPoints.push([round3(Math.cos(rad) * 12), 0, round3(Math.sin(rad) * 12)]);
      }
      for (let i = 0; i < 16; i++) {
        const rad = (i * 22.5 * Math.PI) / 180;
        this.moteSpawnPoints.push([round3(Math.cos(rad) * 33), 0, round3(Math.sin(rad) * 33)]);
      }

      // 12 shade spawn points on R=37m (15, 45, 75, ...)
      for (let i = 0; i < 12; i++) {
        const rad = ((15 + i * 30) * Math.PI) / 180;
        this.shadeSpawnPoints.push([round3(Math.cos(rad) * 37), 0, round3(Math.sin(rad) * 37)]);
      }
    } else if (this.night === 2) {
      // Night 2: Đảo Cau (2 Islands R=28m at (0,0) and (70,0), 6 Lanterns)
      this.lanterns = [
        { id: 'L1', pos: [0, 0, 20], lit: false, deposited: 0 },
        { id: 'L2', pos: [17, 0, -10], lit: false, deposited: 0 },
        { id: 'L3', pos: [-17, 0, -10], lit: false, deposited: 0 },
        { id: 'L4', pos: [70, 0, 20], lit: false, deposited: 0 },
        { id: 'L5', pos: [87, 0, -10], lit: false, deposited: 0 },
        { id: 'L6', pos: [53, 0, -10], lit: false, deposited: 0 }
      ];

      // 24 mote spawn points: each island has 4 on R=10m (0,90,180,270) + 8 on R=22m (every 45 deg)
      for (const cx of [0, 70]) {
        for (let i = 0; i < 4; i++) {
          const rad = (i * 90 * Math.PI) / 180;
          this.moteSpawnPoints.push([round3(cx + Math.cos(rad) * 10), 0, round3(Math.sin(rad) * 10)]);
        }
        for (let i = 0; i < 8; i++) {
          const rad = (i * 45 * Math.PI) / 180;
          this.moteSpawnPoints.push([round3(cx + Math.cos(rad) * 22), 0, round3(Math.sin(rad) * 22)]);
        }
        // 8 shade spawn points on R=26m (22.5, 67.5, ...) per island
        for (let i = 0; i < 8; i++) {
          const rad = ((22.5 + i * 45) * Math.PI) / 180;
          this.shadeSpawnPoints.push([round3(cx + Math.cos(rad) * 26), 0, round3(Math.sin(rad) * 26)]);
        }
      }

      // Charm C1 at (35, 0, 0)
      this.charms.push({
        id: 'C1',
        pos: [35, 0, 0],
        available: true,
        respawnTicks: 0
      });
    } else if (this.night === 3) {
      // Night 3: Đảo Chuông (R=45m, 3 tiers, 7 Lanterns)
      this.lanterns = [
        { id: 'L1', pos: [0, 6, 6], lit: false, deposited: 0 },
        { id: 'L2', pos: [18, 3, 10], lit: false, deposited: 0 },
        { id: 'L3', pos: [-18, 3, 10], lit: false, deposited: 0 },
        { id: 'L4', pos: [35, 0, -10], lit: false, deposited: 0 },
        { id: 'L5', pos: [-35, 0, -10], lit: false, deposited: 0 },
        { id: 'L6', pos: [20, 0, -35], lit: false, deposited: 0 },
        { id: 'L7', pos: [-20, 0, -35], lit: false, deposited: 0 }
      ];

      // 30 mote spawn points: T0 18 pts R=34m (every 20 deg), T1 8 pts R=18m (20..160 deg), T2 4 pts R=5m (45,135,225,315)
      for (let i = 0; i < 18; i++) {
        const rad = (i * 20 * Math.PI) / 180;
        this.moteSpawnPoints.push([round3(Math.cos(rad) * 34), 0, round3(Math.sin(rad) * 34)]);
      }
      for (let i = 1; i <= 8; i++) {
        const rad = (i * 20 * Math.PI) / 180;
        this.moteSpawnPoints.push([round3(Math.cos(rad) * 18), 3, round3(Math.sin(rad) * 18)]);
      }
      for (const deg of [45, 135, 225, 315]) {
        const rad = (deg * Math.PI) / 180;
        this.moteSpawnPoints.push([round3(Math.cos(rad) * 5), 6, round3(Math.sin(rad) * 5)]);
      }

      // 16 shade spawn points on R=43m (every 22.5 deg)
      for (let i = 0; i < 16; i++) {
        const rad = (i * 22.5 * Math.PI) / 180;
        this.shadeSpawnPoints.push([round3(Math.cos(rad) * 43), 0, round3(Math.sin(rad) * 43)]);
      }

      // Charms C1 at (30, 0, 25) and C2 at (-30, 0, 25)
      this.charms.push(
        { id: 'C1', pos: [30, 0, 25], available: true, respawnTicks: 0 },
        { id: 'C2', pos: [-30, 0, 25], available: true, respawnTicks: 0 }
      );
    }

    // Spawn 20 initial motes at 20 distinct spawn points deterministically
    const indices = this.moteSpawnPoints.map((_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = this.prng.nextInt(0, i);
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    const count = Math.min(20, indices.length);
    for (let i = 0; i < count; i++) {
      const pt = this.moteSpawnPoints[indices[i]];
      this.motes.push({
        id: `M${i + 1}`,
        pos: [pt[0], pt[1], pt[2]],
        active: true,
        kind: 'random',
        ttlTicks: 0
      });
    }
  }

  /**
   * Overrides state with scenario definitions without emitting events or awarding score.
   */
  public applyScenario(scenario: InputScenario): void {
    if (scenario.night !== undefined) {
      this.night = scenario.night;
      if (this.night === 2) this.durationSeconds = this.tuning.night2_duration_s;
      else if (this.night === 3) this.durationSeconds = this.tuning.night3_duration_s;
      else this.durationSeconds = this.tuning.night1_duration_s;
      this.initMapEntities();
    }

    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
      if (scenario.player.invuln_ticks !== undefined) this.player.invulnTicks = scenario.player.invuln_ticks;
      if (scenario.player.dash_cd_ticks !== undefined) this.player.dashCooldownTicks = scenario.player.dash_cd_ticks;
      if (scenario.player.pulse_cd_ticks !== undefined) this.player.pulseCooldownTicks = scenario.player.pulse_cd_ticks;
      if (scenario.player.charm_ticks !== undefined) this.player.charmTicks = scenario.player.charm_ticks;
    }

    if (scenario.time_left_s !== undefined) {
      this.durationSeconds = scenario.time_left_s;
    }

    if (scenario.random_motes !== undefined) {
      this.randomMotesEnabled = scenario.random_motes;
      if (!scenario.random_motes && !scenario.motes) {
        this.motes = [];
      }
    }
    if (scenario.random_shades !== undefined) this.randomShadesEnabled = scenario.random_shades;
    if (scenario.random_drifters !== undefined) this.randomDriftersEnabled = scenario.random_drifters;
    if (scenario.wind_enabled !== undefined) this.windEnabled = scenario.wind_enabled;

    if (scenario.motes) {
      this.motes = scenario.motes.map((pos, i) => ({
        id: `M${i + 1}`,
        pos: [pos[0], pos[1], pos[2]],
        active: true,
        kind: 'random',
        ttlTicks: 0
      }));
    }

    if (scenario.shades) {
      this.shades = scenario.shades.map((s, i) => ({
        id: s.id ?? `S${i + 1}`,
        pos: [s.pos[0], s.pos[1], s.pos[2]],
        state: s.state ?? 'wander',
        spawnTicks: s.state === 'spawning' ? (s.state_ticks_left ?? 1) : 0,
        stunTicks: s.state === 'stunned' ? (s.state_ticks_left ?? 120) : 0,
        recoilTicks: s.state === 'recoil' ? (s.state_ticks_left ?? 60) : 0,
        recoilDir: [1, 0],
        safePushTicks: 0,
        safePushDir: [0, 0],
        pulsePushTicks: 0,
        pulsePushDir: [0, 0]
      }));
    }

    if (scenario.drifters) {
      this.drifters = scenario.drifters.map((d, i) => ({
        id: d.id ?? `D${i + 1}`,
        pos: [d.pos[0], d.pos[1], d.pos[2]],
        state: d.state ?? 'idle',
        stolen: d.stolen ?? 0,
        fleeTicks: d.state === 'flee' ? 240 : 0,
        hasStolen: (d.stolen ?? 0) > 0,
        vanishTicks: 0
      }));
    }

    if (scenario.charms) {
      this.charms = scenario.charms.map((c, i) => ({
        id: c.id ?? `C${i + 1}`,
        pos: c.pos ?? [0, 0, 0],
        available: c.available ?? true,
        respawnTicks: Math.round((c.respawn_s ?? 0) * 60)
      }));
    }

    if (scenario.lanterns) {
      for (const override of scenario.lanterns) {
        const found = this.lanterns.find(l => l.id === override.id);
        if (found) {
          if (override.pos) found.pos = [...override.pos];
          if (override.deposited !== undefined) found.deposited = override.deposited;
          if (override.lit !== undefined) found.lit = override.lit;
        }
      }
    }
  }

  /**
   * Returns remaining night duration in seconds rounded to 3 decimals.
   */
  public getTimeLeftSeconds(): number {
    const left = this.durationSeconds - this.simTick / 60;
    return Math.max(0, round3(left));
  }

  /**
   * Generates Test Contract v1.1 Snapshot.
   */
  public getSnapshot(): ContractSnapshot {
    return {
      type: 'snapshot',
      tick: this.tickCount,
      sim_tick: this.simTick,
      state: this.state,
      time_left_s: this.getTimeLeftSeconds(),
      score: this.score,
      night: this.night,
      wind: {
        active: this.wind.active,
        dir_deg: this.wind.dir_deg
      },
      player: {
        pos: roundVec3(this.player.pos),
        vel: roundVec3(this.player.vel),
        grounded: this.player.grounded,
        invuln: this.player.invulnTicks > 0,
        dash_cd_s: round3(this.player.dashCooldownTicks / 60),
        pulse_cd_s: round3(this.player.pulseCooldownTicks / 60),
        charm_s: round3(this.player.charmTicks / 60),
        flames: this.player.flames,
        carried: this.player.carried
      },
      lanterns: this.lanterns.map(l => ({
        id: l.id,
        pos: roundVec3(l.pos),
        lit: l.lit,
        deposited: l.deposited
      })),
      shades: this.shades.map(s => ({
        id: s.id,
        pos: roundVec3(s.pos),
        state: s.state
      })),
      motes: this.motes
        .filter(m => m.active)
        .map(m => ({
          id: m.id,
          pos: roundVec3(m.pos),
          kind: m.kind,
          ttl_s: round3(m.ttlTicks / 60)
        })),
      drifters: this.drifters
        .filter(d => d.state !== 'removed')
        .map(d => ({
          id: d.id,
          pos: roundVec3(d.pos),
          state: d.state,
          stolen: d.stolen
        })),
      charms: this.charms.map(c => ({
        id: c.id,
        available: c.available,
        respawn_s: round3(c.respawnTicks / 60)
      }))
    };
  }

  /**
   * Strict 12-Step Tick Execution loop conforming to PRD-1 Section 37.
   */
  public step(input?: InputFrame): ContractEvent[] {
    const events: ContractEvent[] = [];
    const eventTick = this.tickCount + 1;

    // --- BƯỚC 1: Đọc input & Xử lý Pause ---
    // Resolve sparse input before checking pause edge so holding pause=true doesn't bounce
    const nextPause = input?.pause !== undefined ? input.pause : (this.lastInput.pause ?? false);
    const isPauseTriggered = !!nextPause && !this.lastInput.pause;
    this.lastInput.pause = nextPause;

    if (isPauseTriggered) {
      if (this.state === 'playing') {
        this.state = 'paused';
        events.push({ type: 'event', tick: eventTick, name: 'paused', data: {} });
        this.tickCount++;
        return events;
      } else if (this.state === 'paused') {
        this.state = 'playing';
        events.push({ type: 'event', tick: eventTick, name: 'resumed', data: {} });
      }
    }

    if (this.state === 'paused') {
      this.tickCount++;
      return events;
    }

    if (this.state !== 'playing') {
      return events;
    }

    const currentInput: InputFrame = {
      tick: this.tickCount,
      move: input?.move !== undefined ? input.move : (this.lastInput.move ?? [0, 0]),
      cam_yaw_deg: input?.cam_yaw_deg !== undefined ? input.cam_yaw_deg : (this.lastInput.cam_yaw_deg ?? 0),
      jump: input?.jump !== undefined ? input.jump : (this.lastInput.jump ?? false),
      dash: input?.dash !== undefined ? input.dash : (this.lastInput.dash ?? false),
      interact: input?.interact !== undefined ? input.interact : (this.lastInput.interact ?? false),
      pulse: input?.pulse !== undefined ? input.pulse : (this.lastInput.pulse ?? false),
      pause: nextPause
    };

    const jumpTriggered = !!currentInput.jump && !this.lastInput.jump;
    const dashTriggered = !!currentInput.dash && !this.lastInput.dash;
    const interactTriggered = !!currentInput.interact && !this.lastInput.interact;
    const pulseTriggered = !!currentInput.pulse && !this.lastInput.pulse;
    this.lastInput = currentInput;

    // --- BƯỚC 2: Giảm các bộ đếm ---
    if (this.player.respawnDelayTicks > 0) this.player.respawnDelayTicks--;
    if (this.player.invulnTicks > 0) this.player.invulnTicks--;
    if (this.player.dashCooldownTicks > 0) this.player.dashCooldownTicks--;
    if (this.player.pulseCooldownTicks > 0) this.player.pulseCooldownTicks--;
    if (this.player.charmTicks > 0) this.player.charmTicks--;

    // TTL đom đóm rơi
    for (const m of this.motes) {
      if (m.active && m.kind === 'dropped') {
        if (m.ttlTicks > 0) {
          m.ttlTicks--;
          if (m.ttlTicks <= 0) m.active = false;
        }
      }
    }

    // Hồi bùa
    for (const c of this.charms) {
      if (!c.available && c.respawnTicks > 0) {
        c.respawnTicks--;
        if (c.respawnTicks <= 0) c.available = true;
      }
    }

    // Cơn gió mạnh Đêm 3 (mỗi 30s kéo dài 5s)
    if (this.night === 3 && this.windEnabled) {
      this.wind.timerTicks++;
      if (!this.wind.active && this.wind.timerTicks >= 1800) {
        this.wind.active = true;
        this.wind.timerTicks = 0;
        this.wind.durationTicks = 300; // 5s
        this.wind.dir_deg = Math.round(this.prng.nextFloat() * 360);
      } else if (this.wind.active) {
        this.wind.durationTicks--;
        if (this.wind.durationTicks <= 0) {
          this.wind.active = false;
        }
      }
    }

    // --- BƯỚC 3: Di chuyển Mây (Nhảy, Lướt, Bục nhảy, Gió) & Rơi khỏi đảo ---
    if (this.player.respawnDelayTicks <= 0) {
      // 3.1. Dash activation
      if (dashTriggered && (this.player.dashCooldownTicks <= 0 || this.player.charmTicks > 0) && this.player.dashTicks <= 0) {
        this.player.dashTicks = 12; // 0.2s
        if (this.player.charmTicks <= 0) {
          this.player.dashCooldownTicks = 90; // 1.5s
        }

        const moveInput = currentInput.move ?? [0, 0];
        if (moveInput[0] !== 0 || moveInput[1] !== 0) {
          const [dx, dz] = transformInputMovement(moveInput, currentInput.cam_yaw_deg ?? 0);
          const len = Math.sqrt(dx * dx + dz * dz);
          this.player.dashDirection = len > 0.001 ? [dx / len, dz / len] : [...this.facingDir];
        } else {
          this.player.dashDirection = [...this.facingDir];
        }
        events.push({ type: 'event', tick: eventTick, name: 'dash', data: {} });
      }

      // 3.2. Jump activation (only when grounded and not launched)
      if (jumpTriggered && this.player.grounded && !this.player.isLaunched) {
        this.player.vel[1] = 7.0;
        this.player.grounded = false;
      }

      // 3.3. Calculate horizontal & vertical movement
      const isDashing = this.player.dashTicks > 0;
      const speed = this.player.charmTicks > 0 ? 7.2 : this.tuning.player_speed;
      let vx = 0;
      let vz = 0;

      if (isDashing) {
        this.player.dashTicks--;
        vx = this.player.dashDirection[0] * this.tuning.dash_speed;
        vz = this.player.dashDirection[1] * this.tuning.dash_speed;
        // PRD-1: Mid-air dash preserves altitude (zero vertical velocity & no gravity)
        this.player.vel[1] = 0;
      } else if (this.player.isLaunched) {
        vx = this.player.vel[0];
        vz = this.player.vel[2];
      } else {
        const move = currentInput.move ?? [0, 0];
        if (move[0] !== 0 || move[1] !== 0) {
          const [wx, wz] = transformInputMovement(move, currentInput.cam_yaw_deg ?? 0);
          vx = wx * speed;
          vz = wz * speed;
          const len = Math.sqrt(wx * wx + wz * wz);
          if (len > 0.001) this.facingDir = [wx / len, wz / len];
        }
      }

      // Wind push effect in Night 3
      if (this.wind.active) {
        const rad = (this.wind.dir_deg * Math.PI) / 180;
        vx += Math.cos(rad) * 2.0;
        vz += Math.sin(rad) * 2.0;
      }

      // Apply gravity when NOT dashing
      if (!isDashing && (!this.player.grounded || this.player.vel[1] > 0)) {
        this.player.vel[1] -= 20.0 / 60; // -20 m/s^2
      }

      const newX = this.player.pos[0] + vx / 60;
      const newY = this.player.pos[1] + this.player.vel[1] / 60;
      const newZ = this.player.pos[2] + vz / 60;

      // Solid obstacle collision (e.g., Bell Tower on Night 3 Tier 2)
      if (!checkSolidObstacle(newX, newZ, newY, this.night)) {
        this.player.pos[0] = newX;
        this.player.pos[2] = newZ;
      }

      // Ground elevation check
      const groundY = getGroundHeight(this.player.pos[0], this.player.pos[2], this.night, this.player.pos[1]);
      if (newY <= groundY) {
        this.player.pos[1] = groundY;
        this.player.vel[1] = 0;
        this.player.grounded = true;
        this.player.isLaunched = false;
      } else {
        this.player.pos[1] = newY;
        this.player.grounded = false;
      }

      this.player.vel[0] = vx;
      this.player.vel[2] = vz;

      // 3.4. Jump pad triggers
      const pads = getJumpPads(this.night);
      for (const pad of pads) {
        if (distanceXZ(this.player.pos, pad.pos) <= pad.radius && Math.abs(this.player.pos[1] - pad.pos[1]) <= 0.5) {
          this.player.isLaunched = true;
          this.player.grounded = false;
          this.player.vel[1] = pad.launchVy;
          this.player.vel[0] = pad.targetDir[0] * pad.launchVhoriz;
          this.player.vel[2] = pad.targetDir[1] * pad.launchVhoriz;
        }
      }

      // 3.5. Fall off island (Y < -10)
      if (this.player.pos[1] < -10) {
        this.player.flames = Math.max(0, this.player.flames - 1);
        const lostMotes = this.player.carried;
        this.player.carried = 0;

        events.push({
          type: 'event',
          tick: eventTick,
          name: 'player_hit',
          data: { by: 'fall', flames: this.player.flames, dropped: lostMotes, lost: lostMotes }
        });

        if (this.player.flames <= 0) {
          this.state = 'lost';
          events.push({ type: 'event', tick: eventTick, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } });
        } else {
          this.player.respawnDelayTicks = 60;
          this.player.pos = [0, 0, 0];
          this.player.vel = [0, 0, 0];
          this.player.invulnTicks = 90;
          this.player.grounded = true;
          this.player.isLaunched = false;
        }
      }
    }

    // --- BƯỚC 4: Nhặt đom đóm và bùa ---
    if (this.player.respawnDelayTicks <= 0) {
      for (const mote of this.motes) {
        if (mote.active && this.player.carried < this.tuning.carry_capacity) {
          const dXZ = distanceXZ(this.player.pos, mote.pos);
          const dY = Math.abs(this.player.pos[1] - mote.pos[1]);
          if (dXZ <= this.tuning.pickup_radius && dY <= 1.5) {
            mote.active = false;
            this.player.carried++;
            // PRD-1: Score +10 is awarded on DEPOSIT, not on pickup
            events.push({ type: 'event', tick: eventTick, name: 'mote_picked', data: { carried: this.player.carried } });
          }
        }
      }

      for (const charm of this.charms) {
        if (charm.available) {
          const dXZ = distanceXZ(this.player.pos, charm.pos);
          const dY = Math.abs(this.player.pos[1] - charm.pos[1]);
          if (dXZ <= this.tuning.pickup_radius && dY <= 1.5) {
            charm.available = false;
            charm.respawnTicks = 2700;
            this.player.charmTicks = 600;
            events.push({
              type: 'event',
              tick: eventTick,
              name: 'charm_picked',
              data: { charm_id: charm.id, charm_ticks: 600 }
            });
          }
        }
      }
    }

    // --- BƯỚC 5: Tương tác với đèn ---
    if (interactTriggered && this.player.carried > 0 && this.player.respawnDelayTicks <= 0) {
      let nearestLantern: LanternState | null = null;
      let minDist = Infinity;

      for (const l of this.lanterns) {
        if (!l.lit) {
          const d = distanceXZ(this.player.pos, l.pos);
          if (d <= this.tuning.interact_radius) {
            if (d < minDist || (Math.abs(d - minDist) < 1e-6 && nearestLantern && l.id < nearestLantern.id)) {
              minDist = d;
              nearestLantern = l;
            }
          }
        }
      }

      if (nearestLantern) {
        const needed = this.tuning.lantern_cost - nearestLantern.deposited;
        const depositAmount = Math.min(this.player.carried, needed);

        if (depositAmount > 0) {
          this.player.carried -= depositAmount;
          nearestLantern.deposited += depositAmount;
          // PRD-1: +10 per mote deposited
          this.score += depositAmount * this.tuning.score.per_mote;

          events.push({
            type: 'event',
            tick: eventTick,
            name: 'deposit',
            data: {
              lantern_id: nearestLantern.id,
              amount: depositAmount,
              deposited: nearestLantern.deposited
            }
          });

          if (nearestLantern.deposited >= this.tuning.lantern_cost) {
            nearestLantern.lit = true;
            this.score += this.tuning.score.per_lantern;
            events.push({
              type: 'event',
              tick: eventTick,
              name: 'lantern_lit',
              data: { lantern_id: nearestLantern.id }
            });

            // Push shades inside safe radius 6m outward over max 30 ticks
            for (const s of this.shades) {
              const d = distanceXZ(s.pos, nearestLantern.pos);
              if (d < this.tuning.safe_radius) {
                s.safePushTicks = 30;
                const dx = d > 0.01 ? (s.pos[0] - nearestLantern.pos[0]) / d : 1;
                const dz = d > 0.01 ? (s.pos[2] - nearestLantern.pos[2]) / d : 0;
                s.safePushDir = [dx, dz];
              }
            }

            if (this.lanterns.every(l => l.lit)) {
              this.state = 'won';
              const timeBonus = Math.floor(this.getTimeLeftSeconds()) * this.tuning.score.per_second_left;
              const flameBonus = this.player.flames * this.tuning.score.per_flame_left;
              this.score += timeBonus + flameBonus;

              events.push({
                type: 'event',
                tick: eventTick,
                name: 'game_over',
                data: { result: 'won', reason: 'all_lit' }
              });
            }
          }
        }
      }
    }

    // --- BƯỚC 6: Cập nhật vùng an toàn (Đẩy quái ra mép 6m trong tối đa 30 ticks) ---
    const litLanterns = this.lanterns.filter(l => l.lit);
    for (const s of this.shades) {
      if (s.safePushTicks > 0) {
        s.safePushTicks--;
        s.pos[0] += s.safePushDir[0] * (this.tuning.safe_radius / 30);
        s.pos[2] += s.safePushDir[1] * (this.tuning.safe_radius / 30);
      }
    }

    // --- BƯỚC 7: Tỏa Sáng (Pulse) ---
    if (pulseTriggered && this.player.carried >= this.tuning.pulse_cost && this.player.pulseCooldownTicks <= 0) {
      this.player.carried -= this.tuning.pulse_cost;
      this.player.pulseCooldownTicks = 180; // 3s cooldown

      const pulseCenter: Vector3D = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
      const stunnedIds: string[] = [];

      for (const s of this.shades) {
        const dx = s.pos[0] - pulseCenter[0];
        const dy = s.pos[1] - pulseCenter[1];
        const dz = s.pos[2] - pulseCenter[2];
        const d3d = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (d3d <= this.tuning.pulse_radius) {
          s.state = 'stunned';
          s.stunTicks = 120; // 2s
          s.pulsePushTicks = 15; // 4m pushed horizontally over first 15 ticks
          const horizDist = Math.sqrt(dx * dx + dz * dz);
          if (horizDist > 0.01) {
            s.pulsePushDir = [dx / horizDist, dz / horizDist];
          } else {
            s.pulsePushDir = [1.0, 0];
          }
          stunnedIds.push(s.id);
          this.score += this.tuning.score.per_stun;
        }
      }

      for (const d of this.drifters) {
        if (d.state === 'chase' && distanceXZ(this.player.pos, d.pos) <= this.tuning.pulse_radius) {
          d.state = 'flee';
          d.fleeTicks = 240;
        } else if (d.state === 'flee' && d.stolen > 0 && distanceXZ(this.player.pos, d.pos) <= this.tuning.pulse_radius) {
          for (let k = 0; k < d.stolen; k++) {
            this.motes.push({
              id: `MD_${d.id}_${k}`,
              pos: [d.pos[0], d.pos[1], d.pos[2]],
              active: true,
              kind: 'dropped',
              ttlTicks: 480
            });
          }
          events.push({
            type: 'event',
            tick: eventTick,
            name: 'drifter_drop',
            data: { drifter_id: d.id, amount: d.stolen }
          });
          d.stolen = 0;
          d.vanishTicks = 120;
        }
      }

      events.push({
        type: 'event',
        tick: eventTick,
        name: 'pulse',
        data: { stunned_ids: stunnedIds }
      });
    }

    // --- BƯỚC 8: Di chuyển Bóng Mực và Gió Lạc ---
    const shadeSpeed = (this.night === 3 ? 4.5 : 4.0) / 60;

    for (const s of this.shades) {
      // Transition newly spawned shades from 'spawning' -> 'wander'
      if (s.state === 'spawning') {
        s.spawnTicks--;
        if (s.spawnTicks <= 0) {
          s.state = 'wander';
        }
        continue;
      }

      if (s.state === 'stunned') {
        s.stunTicks--;
        if (s.pulsePushTicks > 0) {
          s.pulsePushTicks--;
          const stepDist = this.tuning.pulse_push_m / 15;
          const nextX = s.pos[0] + s.pulsePushDir[0] * stepDist;
          const nextZ = s.pos[2] + s.pulsePushDir[1] * stepDist;
          if (!checkSolidObstacle(nextX, nextZ, s.pos[1], this.night)) {
            s.pos[0] = nextX;
            s.pos[2] = nextZ;
          }
        }
        if (s.stunTicks <= 0) s.state = 'wander';
        continue;
      }

      if (s.state === 'recoil') {
        s.recoilTicks--;
        s.pos[0] += s.recoilDir[0] * (2.0 / 60);
        s.pos[2] += s.recoilDir[1] * (2.0 / 60);
        if (s.recoilTicks <= 0) s.state = 'wander';
        continue;
      }

      const distToPlayer = distanceXZ(s.pos, this.player.pos);
      if (s.state === 'wander' && distToPlayer <= 12.0) {
        s.state = 'chase';
      } else if (s.state === 'chase' && distToPlayer > 18.0) {
        s.state = 'wander';
      }

      if (s.state === 'chase' && distToPlayer > 0.01) {
        const dx = (this.player.pos[0] - s.pos[0]) / distToPlayer;
        const dz = (this.player.pos[2] - s.pos[2]) / distToPlayer;
        const nextX = s.pos[0] + dx * shadeSpeed;
        const nextZ = s.pos[2] + dz * shadeSpeed;

        let blocked = false;
        for (const l of litLanterns) {
          if (distanceXZ([nextX, 0, nextZ], l.pos) < this.tuning.safe_radius) {
            blocked = true;
            break;
          }
        }
        if (!blocked && !checkSolidObstacle(nextX, nextZ, s.pos[1], this.night)) {
          s.pos[0] = nextX;
          s.pos[2] = nextZ;
        }
      }
    }

    for (const d of this.drifters) {
      if (d.state === 'removed') continue;

      if (d.vanishTicks > 0) {
        d.vanishTicks--;
        if (d.vanishTicks <= 0) {
          d.state = 'removed';
          continue;
        }
      }

      const dist = distanceXZ(d.pos, this.player.pos);

      if (d.state === 'idle') {
        if (this.player.carried >= 5 && dist <= 15.0) {
          d.state = 'chase';
        }
      } else if (d.state === 'chase') {
        if (this.player.carried < 5 || dist > 18.0) {
          d.state = 'idle';
        } else if (dist > 0.01) {
          const dx = (this.player.pos[0] - d.pos[0]) / dist;
          const dz = (this.player.pos[2] - d.pos[2]) / dist;
          d.pos[0] += dx * (7.0 / 60);
          d.pos[2] += dz * (7.0 / 60);
        }
      } else if (d.state === 'flee') {
        d.fleeTicks--;
        if (dist > 0.01) {
          const dx = (d.pos[0] - this.player.pos[0]) / dist;
          const dz = (d.pos[2] - this.player.pos[2]) / dist;
          d.pos[0] += dx * (7.0 / 60);
          d.pos[2] += dz * (7.0 / 60);
        }
        if (d.fleeTicks <= 0) {
          d.state = 'removed';
        }
      }
    }

    // --- BƯỚC 9: Chạm (Gió Lạc cướp trước, rồi Bóng Mực gây hit theo id tăng dần) ---
    if (this.player.respawnDelayTicks <= 0) {
      for (const d of this.drifters) {
        if (d.state === 'chase' && !d.hasStolen) {
          if (distanceXZ(d.pos, this.player.pos) <= 1.2) {
            const stealAmount = Math.min(3, this.player.carried);
            this.player.carried -= stealAmount;
            d.stolen = stealAmount;
            d.hasStolen = true;
            d.state = 'flee';
            d.fleeTicks = 240;

            events.push({
              type: 'event',
              tick: eventTick,
              name: 'drifter_steal',
              data: { drifter_id: d.id, amount: stealAmount, carried: this.player.carried }
            });
          }
        }
      }

      let playerHitThisTick = false;
      const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id));

      for (const s of sortedShades) {
        // Shades being pushed out of safe radius or not chasing cannot deal damage
        if (s.state === 'chase' && s.safePushTicks <= 0 && !playerHitThisTick) {
          const dXZ = distanceXZ(s.pos, this.player.pos);
          const dY = Math.abs(s.pos[1] - this.player.pos[1]);

          if (dXZ <= this.tuning.shade_hit_radius && dY <= 1.5) {
            if (this.player.invulnTicks <= 0) {
              playerHitThisTick = true;
              this.player.flames = Math.max(0, this.player.flames - 1);
              this.player.invulnTicks = 90;

              const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
              this.player.carried -= dropped;

              for (let k = 0; k < dropped; k++) {
                const angle = this.prng.nextFloat() * Math.PI * 2;
                const r = 1.5 + this.prng.nextFloat() * 1.0;
                this.motes.push({
                  id: `MD_${eventTick}_${k}`,
                  pos: [
                    round3(this.player.pos[0] + Math.cos(angle) * r),
                    this.player.pos[1],
                    round3(this.player.pos[2] + Math.sin(angle) * r)
                  ],
                  active: true,
                  kind: 'dropped',
                  ttlTicks: 480
                });
              }

              s.state = 'recoil';
              s.recoilTicks = 60;
              if (dXZ > 0.01) {
                s.recoilDir = [(s.pos[0] - this.player.pos[0]) / dXZ, (s.pos[2] - this.player.pos[2]) / dXZ];
              } else {
                s.recoilDir = [1, 0];
              }

              events.push({
                type: 'event',
                tick: eventTick,
                name: 'player_hit',
                data: {
                  by: 'shade',
                  flames: this.player.flames,
                  dropped: dropped
                }
              });

              if (this.player.flames <= 0) {
                this.state = 'lost';
                events.push({
                  type: 'event',
                  tick: eventTick,
                  name: 'game_over',
                  data: { result: 'lost', reason: 'no_flames' }
                });
                break;
              }
            }
          }
        }
      }
    }

    // --- BƯỚC 10: Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch ---
    const nextSimTick = this.simTick + 1;

    // Sinh đom đóm tại tick 240, 480, ... nếu dưới 30 và còn điểm trống
    if (this.randomMotesEnabled && nextSimTick % 240 === 0) {
      const activeMotes = this.motes.filter(m => m.active);
      if (activeMotes.length < 30 && this.moteSpawnPoints.length > 0) {
        const freePoints = this.moteSpawnPoints.filter(
          pt => !activeMotes.some(m => distanceXZ(m.pos, pt) < 0.5 && Math.abs(m.pos[1] - pt[1]) < 0.5)
        );
        if (freePoints.length > 0) {
          const chosen = freePoints[this.prng.nextInt(0, freePoints.length - 1)];
          this.motes.push({
            id: `M_spawn_${nextSimTick}`,
            pos: [chosen[0], chosen[1], chosen[2]],
            active: true,
            kind: 'random',
            ttlTicks: 0
          });
        }
      }
    }

    // Sinh Bóng Mực: 2 con tại tick 300, sau đó mỗi 480/420/360 tick; điểm cách player >= 15m
    if (this.randomShadesEnabled && this.shadeSpawnPoints.length > 0) {
      let spawnInterval = 480;
      let maxShades = 6;
      if (this.night === 2) {
        spawnInterval = 420;
        maxShades = 8;
      } else if (this.night === 3) {
        spawnInterval = 360;
        maxShades = 10;
      }

      const spawnOneShade = () => {
        if (this.shades.length >= maxShades) return;
        const validPts = this.shadeSpawnPoints.filter(pt => distanceXZ(pt, this.player.pos) >= 15.0);
        if (validPts.length === 0) return;
        const chosen = validPts[this.prng.nextInt(0, validPts.length - 1)];
        this.totalShadesSpawned++;
        const id = `S${this.totalShadesSpawned}`;
        this.shades.push({
          id,
          pos: [chosen[0], chosen[1], chosen[2]],
          state: 'spawning',
          spawnTicks: 1, // Becomes 'wander' on next tick
          stunTicks: 0,
          recoilTicks: 0,
          recoilDir: [0, 0],
          safePushTicks: 0,
          safePushDir: [0, 0],
          pulsePushTicks: 0,
          pulsePushDir: [0, 0]
        });
        events.push({ type: 'event', tick: eventTick, name: 'shade_spawned', data: { id } });
      };

      if (nextSimTick === 300) {
        spawnOneShade();
        spawnOneShade();
      } else if (nextSimTick > 300 && (nextSimTick - 300) % spawnInterval === 0) {
        spawnOneShade();
      }
    }

    // Sinh Gió Lạc (Đêm 2 & 3) tại tick 1200, 2400, ...
    if ((this.night === 2 || this.night === 3) && this.randomDriftersEnabled) {
      if (nextSimTick % 1200 === 0 && this.drifters.filter(d => d.state !== 'removed').length < 2) {
        this.totalDriftersSpawned++;
        const validPts = this.shadeSpawnPoints.length > 0 ? this.shadeSpawnPoints : [[20, 0, 20] as Vector3D];
        const chosen = validPts[this.prng.nextInt(0, validPts.length - 1)];
        this.drifters.push({
          id: `D${this.totalDriftersSpawned}`,
          pos: [chosen[0], 2, chosen[2]],
          state: 'idle',
          stolen: 0,
          fleeTicks: 0,
          hasStolen: false,
          vanishTicks: 0
        });
      }
    }

    // --- BƯỚC 11: Xét Thắng / Thua ---
    this.tickCount++;
    this.simTick++;

    if (this.state === 'playing' && this.getTimeLeftSeconds() <= 0) {
      this.state = 'lost';
      events.push({
        type: 'event',
        tick: this.tickCount,
        name: 'game_over',
        data: { result: 'lost', reason: 'dawn' }
      });
    }

    // --- BƯỚC 12: Snapshot handled by caller ---
    return events;
  }
}
