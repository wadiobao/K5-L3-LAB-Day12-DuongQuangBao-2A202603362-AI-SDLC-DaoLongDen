/**
 * @file types.ts
 * @description Type definitions for the Core Simulation Engine conforming to Test Contract v1.0.
 */

export type Vector3D = [number, number, number];
export type Vector2D = [number, number];

export interface PlayerState {
  pos: Vector3D;
  carried: number;
  flames: number;
  invulnTicks: number;
  pulseCooldownTicks: number;
}

export interface LanternState {
  id: string;
  pos: Vector3D;
  lit: boolean;
  deposited: number;
}

export type ShadeBehaviorState = 'chase' | 'patrol' | 'stunned' | 'flee';

export interface ShadeState {
  id: string;
  pos: Vector3D;
  state: ShadeBehaviorState;
  stunTicks: number;
  targetPos?: Vector3D;
}

export interface MoteState {
  id: string;
  pos: Vector3D;
  active: boolean;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameScore {
  per_mote: number;
  per_lantern: number;
  per_stun: number;
  per_second_left: number;
  per_flame_left: number;
}

export interface TuningConfig {
  player_speed: number;
  carry_capacity: number;
  lantern_cost: number;
  lantern_count_night1: number;
  pickup_radius: number;
  interact_radius: number;
  pulse_cost: number;
  pulse_radius: number;
  night1_duration_s: number;
  flames: number;
  invuln_s: number;
  hit_drop_ratio: number;
  pulse_stun_s: number;
  pulse_push_m: number;
  pulse_cooldown_s: number;
  safe_radius: number;
  shade_speed: number;
  shade_hit_radius: number;
  fall_enabled: boolean;
  score: GameScore;
}

export interface InputFrame {
  tick: number;
  move?: Vector2D;
  cam_yaw_deg?: number;
  jump?: boolean;
  interact?: boolean;
  pulse?: boolean;
  dash?: boolean;
}

export interface InputScenario {
  player?: {
    pos?: Vector3D;
    carried?: number;
    flames?: number;
  };
  random_motes?: boolean;
  random_shades?: boolean;
  motes?: Vector3D[];
  shades?: Array<{ id?: string; pos: Vector3D }>;
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
  player: {
    pos: Vector3D;
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
  motes_active: number;
}

export interface ContractEnd {
  type: 'end';
  ticks: number;
  state: GameStatus;
  score: number;
}
