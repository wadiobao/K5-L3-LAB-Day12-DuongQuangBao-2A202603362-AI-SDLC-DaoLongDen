/**
 * @file types.ts
 * @description Type definitions for the Core Simulation Engine conforming to Test Contract v1.1.
 */

export type Vector3D = [number, number, number];
export type Vector2D = [number, number];

export interface PlayerState {
  pos: Vector3D;
  vel: Vector3D;
  grounded: boolean;
  carried: number;
  flames: number;
  invulnTicks: number;
  dashTicks: number;
  dashCooldownTicks: number;
  dashDirection: Vector2D;
  pulseCooldownTicks: number;
  charmTicks: number;
  respawnDelayTicks: number;
  isLaunched: boolean;
}

export interface LanternState {
  id: string;
  pos: Vector3D;
  lit: boolean;
  deposited: number;
}

export type ShadeBehaviorState = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned';

export interface ShadeState {
  id: string;
  pos: Vector3D;
  state: ShadeBehaviorState;
  stunTicks: number;
  recoilTicks: number;
  pushTicks: number;
  pushDir: Vector2D;
  targetPos?: Vector3D;
}

export type MoteKind = 'random' | 'dropped';

export interface MoteState {
  id: string;
  pos: Vector3D;
  active: boolean;
  kind: MoteKind;
  ttlTicks: number; // TTL in ticks for dropped motes (480 ticks)
}

export type DrifterState = 'idle' | 'chase' | 'flee' | 'removed';

export interface DrifterEntity {
  id: string;
  pos: Vector3D;
  state: DrifterState;
  stolen: number;
  fleeTicks: number;
  hasStolen: boolean;
  vanishTicks: number;
}

export interface CharmEntity {
  id: string;
  pos: Vector3D;
  available: boolean;
  respawnTicks: number;
}

export interface WindState {
  active: boolean;
  dir_deg: number;
  timerTicks: number;
  durationTicks: number;
}

export type GameStatus = 'playing' | 'won' | 'lost' | 'paused';

export interface GameScore {
  per_mote: number;
  per_lantern: number;
  per_stun: number;
  per_second_left: number;
  per_flame_left: number;
}

export interface TuningConfig {
  player_speed: number;
  dash_speed: number;
  dash_duration_s: number;
  dash_cooldown_s: number;
  carry_capacity: number;
  lantern_cost: number;
  lantern_count_night1: number;
  pickup_radius: number;
  interact_radius: number;
  pulse_cost: number;
  pulse_radius: number;
  pulse_stun_s: number;
  pulse_push_m: number;
  pulse_cooldown_s: number;
  safe_radius: number;
  shade_speed: number;
  shade_hit_radius: number;
  night1_duration_s: number;
  night2_duration_s: number;
  night3_duration_s: number;
  flames: number;
  invuln_s: number;
  hit_drop_ratio: number;
  fall_enabled: boolean;
  score: GameScore;
}

export interface InputFrame {
  tick: number;
  move?: Vector2D;
  cam_yaw_deg?: number;
  jump?: boolean;
  dash?: boolean;
  interact?: boolean;
  pulse?: boolean;
  pause?: boolean;
}

export interface InputScenario {
  night?: number;
  player?: {
    pos?: Vector3D;
    carried?: number;
    flames?: number;
    invuln_ticks?: number;
    dash_cd_ticks?: number;
    pulse_cd_ticks?: number;
    charm_ticks?: number;
  };
  random_motes?: boolean;
  random_shades?: boolean;
  random_drifters?: boolean;
  wind_enabled?: boolean;
  motes?: Vector3D[];
  shades?: Array<{
    id?: string;
    pos: Vector3D;
    state?: ShadeBehaviorState;
    state_ticks_left?: number;
  }>;
  drifters?: Array<{
    id?: string;
    pos: Vector3D;
    state?: DrifterState;
    stolen?: number;
  }>;
  charms?: Array<{
    id?: string;
    pos?: Vector3D;
    available?: boolean;
    respawn_s?: number;
  }>;
  lanterns?: Array<{ id: string; pos?: Vector3D; deposited?: number; lit?: boolean }>;
  time_left_s?: number;
}

export interface ContractEvent {
  type: 'event';
  tick: number;
  name: string;
  data: Record<string, unknown>;
}

export interface ContractSnapshot {
  type: 'snapshot';
  tick: number;
  sim_tick: number;
  state: GameStatus;
  time_left_s: number;
  score: number;
  night: number;
  wind: {
    active: boolean;
    dir_deg: number;
  };
  player: {
    pos: Vector3D;
    vel: Vector3D;
    grounded: boolean;
    invuln: boolean;
    dash_cd_s: number;
    pulse_cd_s: number;
    charm_s: number;
    flames: number;
    carried: number;
  };
  lanterns: Array<{
    id: string;
    pos: Vector3D;
    lit: boolean;
    deposited: number;
  }>;
  shades: Array<{
    id: string;
    pos: Vector3D;
    state: ShadeBehaviorState;
  }>;
  motes: Array<{
    id: string;
    pos: Vector3D;
    kind: MoteKind;
    ttl_s: number;
  }>;
  drifters: Array<{
    id: string;
    pos: Vector3D;
    state: DrifterState;
    stolen: number;
  }>;
  charms: Array<{
    id: string;
    available: boolean;
    respawn_s: number;
  }>;
}

export interface ContractEnd {
  type: 'end';
  ticks: number;
  state: GameStatus;
  score: number;
}
