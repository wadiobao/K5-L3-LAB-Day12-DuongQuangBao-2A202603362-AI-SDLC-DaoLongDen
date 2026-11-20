import { describe, it, expect } from 'vitest';
import { GameEngine, DEFAULT_TUNING } from '../../src/core/engine.js';
import { round3 } from '../../src/core/math.js';

describe('GameEngine Core Logic', () => {
  it('should initialize player at (0, 0, 0) with 3 flames and 0 carried motes', () => {
    const engine = new GameEngine(42);
    expect(engine.player.pos).toEqual([0, 0, 0]);
    expect(engine.player.flames).toBe(3);
    expect(engine.player.carried).toBe(0);
    expect(engine.state).toBe('playing');
    expect(engine.lanterns.length).toBe(5);
  });

  it('should pick up mote when player moves within pickup radius', () => {
    const engine = new GameEngine(42);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      motes: [[0, 0, 1.0]],
      random_shades: false
    });

    const events = engine.step();
    expect(engine.player.carried).toBe(1);
    expect(events.some(e => e.name === 'mote_picked')).toBe(true);
    expect(engine.score).toBe(DEFAULT_TUNING.score.per_mote);
  });

  it('should deposit motes into lantern and light it when reaching cost', () => {
    const engine = new GameEngine(42);
    engine.applyScenario({
      player: { pos: [0, 0, 24], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }]
    });

    // Step with interact: true
    const events = engine.step({ tick: 0, interact: true });
    expect(engine.player.carried).toBe(0);
    expect(engine.lanterns[0].deposited).toBe(5);
    expect(engine.lanterns[0].lit).toBe(true);

    expect(events.some(e => e.name === 'deposit')).toBe(true);
    expect(events.some(e => e.name === 'lantern_lit')).toBe(true);
  });

  it('should damage player, drop motes, and trigger game over on zero flames', () => {
    const engine = new GameEngine(42);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 4, flames: 1 },
      random_motes: false,
      random_shades: false,
      shades: [{ id: 'S1', pos: [0, 0, 0.5] }]
    });

    const events = engine.step();
    expect(engine.player.flames).toBe(0);
    expect(engine.player.carried).toBe(2); // 4 - floor(4 * 0.5) = 2
    expect(engine.state).toBe('lost');

    expect(events.some(e => e.name === 'player_hit')).toBe(true);
    expect(events.some(e => e.name === 'game_over' && e.data.reason === 'no_flames')).toBe(true);
  });

  it('should stun and push shade when pulse is triggered', () => {
    const engine = new GameEngine(42);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 2, flames: 3 },
      random_motes: false,
      random_shades: false,
      shades: [{ id: 'S1', pos: [0, 0, 3.0] }]
    });

    const events = engine.step({ tick: 0, pulse: true });
    expect(engine.player.carried).toBe(1);
    expect(engine.shades[0].state).toBe('stunned');
    expect(round3(engine.shades[0].pos[2])).toBe(7.0); // pushed by 4.0m
    expect(events.some(e => e.name === 'pulse')).toBe(true);
  });
});
