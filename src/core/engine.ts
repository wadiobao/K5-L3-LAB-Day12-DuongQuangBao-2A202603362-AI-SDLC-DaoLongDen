/**
 * @file engine.ts
 * @description Core deterministic 60Hz game simulation engine for Dao Den Long.
 * Decoupled from rendering, strictly adhering to Test Contract v1.0.
 */

import {
  ContractEvent,
  ContractSnapshot,
  GameStatus,
  InputFrame,
  InputScenario,
  LanternState,
  MoteState,
  PlayerState,
  ShadeState,
  TuningConfig,
  Vector2D,
  Vector3D
} from './types.js';
import { PRNG } from './prng.js';
import { distanceXZ, round3, roundVec3, transformInputMovement } from './math.js';

export const DEFAULT_TUNING: TuningConfig = {
  player_speed: 6.0,
  carry_capacity: 10,
  lantern_cost: 5,
  lantern_count_night1: 5,
  pickup_radius: 1.5,
  interact_radius: 3.0,
  pulse_cost: 1,
  pulse_radius: 5.0,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 2.0,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 1.0,
  safe_radius: 4.0,
  shade_speed: 3.5,
  shade_hit_radius: 1.0,
  fall_enabled: false,
  score: {
    per_mote: 10,
    per_lantern: 200,
    per_stun: 50,
    per_second_left: 5,
    per_flame_left: 100
  }
};

export class GameEngine {
  public tuning: TuningConfig;
  public prng: PRNG;
  public tickCount: number = 0;
  public simTick: number = 0;
  public state: GameStatus = 'playing';
  public score: number = 0;
  public durationSeconds: number;

  public player: PlayerState;
  public lanterns: LanternState[] = [];
  public motes: MoteState[] = [];
  public shades: ShadeState[] = [];

  private lastInput: InputFrame = {
    tick: 0,
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false
  };

  /**
   * Initializes the simulation engine with a deterministic seed and tuning parameters.
   */
  constructor(seed: number, tuning: TuningConfig = DEFAULT_TUNING) {
    this.tuning = tuning;
    this.prng = new PRNG(seed);
    this.durationSeconds = tuning.night1_duration_s;

    this.player = {
      pos: [0, 0, 0],
      carried: 0,
      flames: tuning.flames,
      invulnTicks: 0,
      pulseCooldownTicks: 0
    };

    this.initDefaultWorld();
  }

  /**
   * Sets up default Night 1 Island world entities.
   */
  private initDefaultWorld(): void {
    const defaultLanternPositions: Vector3D[] = [
      [0, 0, 25],
      [23.776, 0, 7.725],
      [14.695, 0, -20.225],
      [-14.695, 0, -20.225],
      [-23.776, 0, 7.725]
    ];

    this.lanterns = defaultLanternPositions.map((pos, idx) => ({
      id: `L${idx + 1}`,
      pos: [pos[0], pos[1], pos[2]],
      lit: false,
      deposited: 0
    }));

    // Generate 20 motes scattered on island
    for (let i = 0; i < 20; i++) {
      const angle = this.prng.nextFloat() * Math.PI * 2;
      const radius = 5 + this.prng.nextFloat() * 40;
      this.motes.push({
        id: `M${i + 1}`,
        pos: [round3(Math.cos(angle) * radius), 0, round3(Math.sin(angle) * radius)],
        active: true
      });
    }

    // Generate 2 initial shades
    for (let i = 0; i < 2; i++) {
      const angle = this.prng.nextFloat() * Math.PI * 2;
      const radius = 25 + this.prng.nextFloat() * 15;
      this.shades.push({
        id: `S${i + 1}`,
        pos: [round3(Math.cos(angle) * radius), 0, round3(Math.sin(angle) * radius)],
        state: 'chase',
        stunTicks: 0
      });
    }
  }

  /**
   * Overrides state with an external scenario definition (Test Contract v1.0).
   */
  public applyScenario(scenario: InputScenario): void {
    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
    }

    if (scenario.time_left_s !== undefined) {
      this.durationSeconds = scenario.time_left_s;
    }

    if (scenario.random_motes === false) {
      this.motes = [];
    }
    if (scenario.motes) {
      this.motes = scenario.motes.map((pos, i) => ({
        id: `M${i + 1}`,
        pos: [pos[0], pos[1], pos[2]],
        active: true
      }));
    }

    if (scenario.random_shades === false) {
      this.shades = [];
    }
    if (scenario.shades) {
      this.shades = scenario.shades.map((s, i) => ({
        id: s.id ?? `S${i + 1}`,
        pos: [s.pos[0], s.pos[1], s.pos[2]],
        state: 'chase',
        stunTicks: 0
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
   * Current remaining time in seconds.
   */
  public getTimeLeftSeconds(): number {
    const left = this.durationSeconds - this.simTick / 60;
    return Math.max(0, round3(left));
  }

  /**
   * Generates a snapshot of the current state according to Test Contract v1.0.
   */
  public getSnapshot(): ContractSnapshot {
    return {
      type: 'snapshot',
      tick: this.tickCount,
      sim_tick: this.simTick,
      state: this.state,
      time_left_s: this.getTimeLeftSeconds(),
      score: this.score,
      player: {
        pos: roundVec3(this.player.pos),
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
      motes_active: this.motes.filter(m => m.active).length
    };
  }

  /**
   * Executes a single fixed simulation tick (1/60th second).
   * @param input Input frame applied at this tick.
   * @returns List of contract events triggered during this tick.
   */
  public step(input?: InputFrame): ContractEvent[] {
    const events: ContractEvent[] = [];

    if (this.state !== 'playing') {
      return events;
    }

    // Merge sparse input frame with previous frame state
    const currentInput: InputFrame = {
      tick: this.tickCount,
      move: input?.move !== undefined ? input.move : this.lastInput.move ?? [0, 0],
      cam_yaw_deg: input?.cam_yaw_deg !== undefined ? input.cam_yaw_deg : this.lastInput.cam_yaw_deg ?? 0,
      jump: input?.jump !== undefined ? input.jump : this.lastInput.jump ?? false,
      interact: input?.interact !== undefined ? input.interact : this.lastInput.interact ?? false,
      pulse: input?.pulse !== undefined ? input.pulse : this.lastInput.pulse ?? false
    };

    const interactTriggered = !!currentInput.interact && !this.lastInput.interact;
    const pulseTriggered = !!currentInput.pulse && !this.lastInput.pulse;
    this.lastInput = currentInput;

    const eventTick = this.tickCount + 1;

    // 1. Player Movement on horizontal XZ plane
    const moveVector: Vector2D = currentInput.move ?? [0, 0];
    const [worldMoveX, worldMoveZ] = transformInputMovement(moveVector, currentInput.cam_yaw_deg ?? 0);
    const stepSpeed = this.tuning.player_speed / 60; // Distance per tick

    this.player.pos[0] += worldMoveX * stepSpeed;
    this.player.pos[2] += worldMoveZ * stepSpeed;

    // Boundary constraint: Island radius 50m
    const distFromOrigin = Math.sqrt(this.player.pos[0] ** 2 + this.player.pos[2] ** 2);
    if (distFromOrigin > 49.5) {
      const scale = 49.5 / distFromOrigin;
      this.player.pos[0] *= scale;
      this.player.pos[2] *= scale;
    }

    if (this.player.invulnTicks > 0) {
      this.player.invulnTicks--;
    }
    if (this.player.pulseCooldownTicks > 0) {
      this.player.pulseCooldownTicks--;
    }

    // 2. Mote Pickup
    for (const mote of this.motes) {
      if (mote.active && this.player.carried < this.tuning.carry_capacity) {
        if (distanceXZ(this.player.pos, mote.pos) <= this.tuning.pickup_radius) {
          mote.active = false;
          this.player.carried += 1;
          this.score += this.tuning.score.per_mote;
          events.push({
            type: 'event',
            tick: eventTick,
            name: 'mote_picked',
            data: { carried: this.player.carried }
          });
        }
      }
    }

    // 3. Lantern Interaction (Deposit)
    if (interactTriggered && this.player.carried > 0) {
      for (const lantern of this.lanterns) {
        if (!lantern.lit && distanceXZ(this.player.pos, lantern.pos) <= this.tuning.interact_radius) {
          const needed = this.tuning.lantern_cost - lantern.deposited;
          const depositAmount = Math.min(this.player.carried, needed);

          if (depositAmount > 0) {
            this.player.carried -= depositAmount;
            lantern.deposited += depositAmount;

            events.push({
              type: 'event',
              tick: eventTick,
              name: 'deposit',
              data: {
                lantern_id: lantern.id,
                amount: depositAmount,
                deposited: lantern.deposited
              }
            });

            if (lantern.deposited >= this.tuning.lantern_cost) {
              lantern.lit = true;
              this.score += this.tuning.score.per_lantern;
              events.push({
                type: 'event',
                tick: eventTick,
                name: 'lantern_lit',
                data: { lantern_id: lantern.id }
              });

              // Check Win Condition
              const allLit = this.lanterns.every(l => l.lit);
              if (allLit) {
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
                break;
              }
            }
          }
        }
      }
    }

    // 4. Pulse Ability
    if (pulseTriggered && this.player.carried >= this.tuning.pulse_cost && this.player.pulseCooldownTicks <= 0) {
      this.player.carried -= this.tuning.pulse_cost;
      this.player.pulseCooldownTicks = Math.round(this.tuning.pulse_cooldown_s * 60);

      const stunnedIds: string[] = [];
      for (const shade of this.shades) {
        const dist = distanceXZ(this.player.pos, shade.pos);
        if (dist <= this.tuning.pulse_radius) {
          shade.state = 'stunned';
          shade.stunTicks = Math.round(this.tuning.pulse_stun_s * 60);

          // Push shade away from player
          if (dist > 0.01) {
            const pushX = (shade.pos[0] - this.player.pos[0]) / dist;
            const pushZ = (shade.pos[2] - this.player.pos[2]) / dist;
            shade.pos[0] += pushX * this.tuning.pulse_push_m;
            shade.pos[2] += pushZ * this.tuning.pulse_push_m;
          }
          stunnedIds.push(shade.id);
          this.score += this.tuning.score.per_stun;
        }
      }

      events.push({
        type: 'event',
        tick: eventTick,
        name: 'pulse',
        data: { stunned_ids: stunnedIds }
      });
    }

    // 5. Shade Movement & Safe Radius Check
    const shadeStep = this.tuning.shade_speed / 60;
    const litLanterns = this.lanterns.filter(l => l.lit);

    for (const shade of this.shades) {
      if (shade.state === 'stunned') {
        shade.stunTicks--;
        if (shade.stunTicks <= 0) {
          shade.state = 'chase';
        }
        continue;
      }

      // Check proximity to lit lantern safe zone
      let nearSafeZone = false;
      for (const lantern of litLanterns) {
        const d = distanceXZ(shade.pos, lantern.pos);
        if (d < this.tuning.safe_radius + 1.0) {
          nearSafeZone = true;
          // Repel away from safe zone
          if (d > 0.01) {
            const repX = (shade.pos[0] - lantern.pos[0]) / d;
            const repZ = (shade.pos[2] - lantern.pos[2]) / d;
            shade.pos[0] += repX * shadeStep;
            shade.pos[2] += repZ * shadeStep;
          }
          break;
        }
      }

      if (!nearSafeZone && shade.state === 'chase') {
        const distToPlayer = distanceXZ(shade.pos, this.player.pos);
        if (distToPlayer > 0.05) {
          const dirX = (this.player.pos[0] - shade.pos[0]) / distToPlayer;
          const dirZ = (this.player.pos[2] - shade.pos[2]) / distToPlayer;
          shade.pos[0] += dirX * shadeStep;
          shade.pos[2] += dirZ * shadeStep;
        }

        // Damage Player Collision
        if (distToPlayer <= this.tuning.shade_hit_radius && this.player.invulnTicks <= 0) {
          this.player.invulnTicks = Math.round(this.tuning.invuln_s * 60);
          this.player.flames = Math.max(0, this.player.flames - 1);
          const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
          this.player.carried -= dropped;

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

          // Check Lose Condition (No flames)
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

    // 6. Time Expiration Check (Dawn)
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

    return events;
  }
}
