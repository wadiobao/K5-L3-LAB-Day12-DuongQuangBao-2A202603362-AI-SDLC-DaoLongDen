import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/core/engine.js';
import { round3 } from '../../src/core/math.js';

describe('GameEngine Phase 2 Core Logic (Contract v1.1)', () => {
  it('should initialize Night 1 with 5 lanterns, 3 flames, 0 carried, 20 motes', () => {
    const engine = new GameEngine(42, 1);
    expect(engine.player.pos).toEqual([0, 0, 0]);
    expect(engine.player.flames).toBe(3);
    expect(engine.player.carried).toBe(0);
    expect(engine.state).toBe('playing');
    expect(engine.lanterns.length).toBe(5);
    expect(engine.motes.length).toBe(20);
  });

  it('should initialize Night 2 with 6 lanterns, charm C1, and Island Cau', () => {
    const engine = new GameEngine(42, 2);
    expect(engine.lanterns.length).toBe(6);
    expect(engine.charms.length).toBe(1);
    expect(engine.charms[0].id).toBe('C1');
  });

  it('should initialize Night 3 with 7 lanterns, charms C1 & C2, and Island Chuong', () => {
    const engine = new GameEngine(42, 3);
    expect(engine.lanterns.length).toBe(7);
    expect(engine.charms.length).toBe(2);
  });

  it('should trigger Dash and respect dash duration (12 ticks) and cooldown (90 ticks)', () => {
    const engine = new GameEngine(42, 1);
    const events = engine.step({ tick: 0, dash: true, move: [0, 1] });

    expect(events.some(e => e.name === 'dash')).toBe(true);
    expect(engine.player.dashTicks).toBe(11);
    expect(engine.player.dashCooldownTicks).toBe(90);
    expect(round3(engine.player.vel[2])).toBe(14.0);
  });

  it('should preserve altitude during mid-air Dash per PRD-1', () => {
    const engine = new GameEngine(42, 1);
    engine.step({ tick: 0, jump: true });
    for (let i = 1; i <= 5; i++) engine.step({ tick: i });
    const yBeforeDash = engine.player.pos[1];

    engine.step({ tick: 6, dash: true, move: [0, 1] });
    for (let i = 7; i <= 15; i++) engine.step({ tick: i });
    expect(round3(engine.player.pos[1])).toBe(round3(yBeforeDash));
  });

  it('should trigger Jump and apply gravity -20 m/s^2', () => {
    const engine = new GameEngine(42, 1);
    engine.step({ tick: 0, jump: true });

    expect(engine.player.grounded).toBe(false);
    expect(round3(engine.player.vel[1])).toBe(round3(7.0 - 20 / 60));
  });

  it('should trigger fall off island when Y < -10, deduct flame, drop carried motes, and enter respawn delay', () => {
    const engine = new GameEngine(42, 1);
    engine.applyScenario({
      player: { pos: [50, -11, 0], carried: 6, flames: 3 }
    });

    const events = engine.step();
    expect(engine.player.flames).toBe(2);
    expect(engine.player.carried).toBe(0);
    expect(engine.player.respawnDelayTicks).toBe(60);
    expect(events.some(e => e.name === 'player_hit' && e.data.by === 'fall')).toBe(true);
  });

  it('should award +10 per mote on DEPOSIT (not pickup) per PRD-1', () => {
    const engine = new GameEngine(42, 1);
    engine.applyScenario({
      player: { pos: [0, 0, 24], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [[0, 0, 24]],
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }]
    });

    engine.step({ tick: 0 });
    expect(engine.player.carried).toBe(1);
    expect(engine.score).toBe(0);

    engine.step({ tick: 1, interact: true });
    expect(engine.score).toBe(10);
  });

  it('should spawn 2 shades at tick 300, emit shade_spawned, and transition spawning -> wander', () => {
    const engine = new GameEngine(42, 1);
    let spawnedEvents = 0;
    for (let i = 0; i < 305; i++) {
      const evs = engine.step();
      spawnedEvents += evs.filter(e => e.name === 'shade_spawned').length;
    }
    expect(engine.shades.length).toBe(2);
    expect(spawnedEvents).toBe(2);
    expect(engine.shades.every(s => s.state === 'wander' || s.state === 'chase')).toBe(true);
  });

  it('should push stunned shade exactly 4.0m over 15 ticks on Pulse', () => {
    const engine = new GameEngine(42, 1);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      shades: [{ id: 'S1', pos: [0, 0, 2], state: 'chase' }]
    });

    engine.step({ tick: 0, pulse: true });
    for (let i = 1; i < 20; i++) engine.step({ tick: i });
    expect(round3(engine.shades[0].pos[2])).toBe(6.0);
  });

  it('should keep game paused when pause=true is held across consecutive ticks', () => {
    const engine = new GameEngine(42, 1);
    const ev1 = engine.step({ tick: 0, pause: true });
    expect(ev1.some(e => e.name === 'paused')).toBe(true);
    expect(engine.state).toBe('paused');

    // Holding pause=true on tick 1 must NOT resume
    const ev2 = engine.step({ tick: 1, pause: true });
    expect(ev2.length).toBe(0);
    expect(engine.state).toBe('paused');
    expect(engine.simTick).toBe(0);

    // Release then press pause=true again resumes
    engine.step({ tick: 2, pause: false });
    const ev4 = engine.step({ tick: 3, pause: true });
    expect(ev4.some(e => e.name === 'resumed')).toBe(true);
    expect(engine.state).toBe('playing');
  });

  it('should pick up Charm and activate speed boost and zero dash cooldown for 600 ticks', () => {
    const engine = new GameEngine(42, 2);
    engine.applyScenario({
      player: { pos: [35, 0, 0.5], carried: 0, flames: 3 },
      charms: [{ id: 'C1', pos: [35, 0, 0], available: true }]
    });

    const events = engine.step();
    expect(events.some(e => e.name === 'charm_picked')).toBe(true);
    expect(engine.player.charmTicks).toBe(600);
    expect(engine.charms[0].available).toBe(false);
  });

  it('should have Drifter steal min(3, carried) when player carries >= 5 motes', () => {
    const engine = new GameEngine(42, 2);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 6, flames: 3 },
      drifters: [{ id: 'D1', pos: [0, 0, 1.0], state: 'chase', stolen: 0 }]
    });

    const events = engine.step();
    expect(engine.player.carried).toBe(3);
    expect(events.some(e => e.name === 'drifter_steal' && e.data.amount === 3)).toBe(true);
  });

  it('should have Pulse hit Drifter and drop stolen motes onto the ground', () => {
    const engine = new GameEngine(42, 2);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 4, flames: 3 },
      drifters: [{ id: 'D1', pos: [0, 0, 2.0], state: 'flee', stolen: 3 }]
    });

    const events = engine.step({ tick: 0, pulse: true });
    expect(events.some(e => e.name === 'drifter_drop' && e.data.amount === 3)).toBe(true);
    expect(engine.motes.some(m => m.kind === 'dropped')).toBe(true);
  });
});
