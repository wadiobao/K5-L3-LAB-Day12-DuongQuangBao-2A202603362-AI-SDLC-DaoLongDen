import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/core/engine.js';
import { round3 } from '../../src/core/math.js';

describe('GameEngine Phase 1-3 Core Logic (Contract v1.2)', () => {
  it('should initialize Night 1 with 5 lanterns, 3 flames, capacity 10, duration 240s', () => {
    const engine = new GameEngine(42, 1);
    expect(engine.player.pos).toEqual([0, 0, 0]);
    expect(engine.player.flames).toBe(3);
    expect(engine.player.carried).toBe(0);
    expect(engine.player.capacity).toBe(10);
    expect(engine.getTimeLeftSeconds()).toBe(240);
    expect(engine.lanterns.length).toBe(5);
    expect(engine.motes.length).toBe(20);
  });

  it('should initialize Night 2 (270s, 6 lanterns) and Night 3 (300s, 7 lanterns)', () => {
    const e2 = new GameEngine(42, 2);
    expect(e2.lanterns.length).toBe(6);
    expect(e2.getTimeLeftSeconds()).toBe(270);
    expect(e2.charms.length).toBe(1);

    const e3 = new GameEngine(42, 3);
    expect(e3.lanterns.length).toBe(7);
    expect(e3.getTimeLeftSeconds()).toBe(300);
    expect(e3.charms.length).toBe(2);
  });

  it('should trigger Dash, preserve altitude in mid-air, and respect cooldown', () => {
    const engine = new GameEngine(42, 1);
    engine.step({ tick: 0, jump: true });
    for (let i = 1; i <= 5; i++) engine.step({ tick: i });
    const yBeforeDash = engine.player.pos[1];

    const evs = engine.step({ tick: 6, dash: true, move: [0, 1] });
    expect(evs.some(e => e.name === 'dash')).toBe(true);
    expect(engine.player.dashCooldownTicks).toBe(90);
    for (let i = 7; i <= 15; i++) engine.step({ tick: i });
    expect(round3(engine.player.pos[1])).toBe(round3(yBeforeDash));
  });

  it('should trigger fall off island when Y < -10, deduct flame, and enter 60-tick respawn delay', () => {
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

  /**
   * UPDATED FOR TICKET-03 (Breaking Change):
   * Previously awarded +10 per deposited mote (Ticket-02).
   * Ticket-03 Section 5 replaces mote deposit score with +5 per mote (deposit/relight/refuel).
   */
  it('should award +5 per mote on DEPOSIT (Ticket-03 scoring rule)', () => {
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
    expect(engine.score).toBe(5);
  });

  it('should decay lantern fuel by 1/s, extinguish at 0 with lantern_out, and relight for 5 motes (+40)', () => {
    const engine = new GameEngine(42, 1);
    engine.applyScenario({
      player: { pos: [0, 0, 24], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 1.0, ever_lit: true }]
    });

    // 60 ticks of decay (1.0/s) extinguishes the lantern
    let outEvent = false;
    for (let i = 0; i < 60; i++) {
      const evs = engine.step({ tick: i });
      if (evs.some(e => e.name === 'lantern_out' && e.data.lantern_id === 'L1')) outEvent = true;
    }
    expect(outEvent).toBe(true);
    expect(engine.lanterns[0].lit).toBe(false);
    expect(engine.lanterns[0].ever_lit).toBe(true);
    expect(engine.lanterns[0].deposited).toBe(0);

    // Relighting an ever_lit lantern costs only 5 motes and awards +25 (5*5) + 40 = 65
    const evRelight = engine.step({ tick: 60, interact: true });
    expect(engine.lanterns[0].lit).toBe(true);
    expect(engine.lanterns[0].relit_count).toBe(1);
    expect(engine.getLanternFuel(engine.lanterns[0])).toBe(100);
    expect(engine.player.capacity).toBe(12); // 10 + 2 * 1 successful_light
    expect(evRelight.some(e => e.name === 'lantern_lit' && e.data.relight === true)).toBe(true);
    expect(engine.score).toBe(65);
  });

  it('should refuel a partially depleted lit lantern and ignore full lanterns on interact', () => {
    const engine = new GameEngine(42, 1);
    // Keep decay at 0 in this isolated test so L1 remains strictly full (6000/60 = 100.0) at Step 5
    engine.tuning = { ...engine.tuning, fuel_decay_per_s: 0 };
    engine.applyScenario({
      player: { pos: [0, 0, 24], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [
        { id: 'L1', pos: [0, 0, 24.5], lit: true, fuel: 100 }, // strictly full -> must be skipped
        { id: 'L2', pos: [0, 0, 25.5], lit: true, fuel: 75 }   // needs ceil(25/10)=3 motes
      ]
    });

    const evs = engine.step({ tick: 0, interact: true });
    const refuelEv = evs.find(e => e.name === 'refuel');
    expect(refuelEv).toBeDefined();
    expect(refuelEv!.data.lantern_id).toBe('L2');
    expect(refuelEv!.data.amount).toBe(3);
    expect(engine.player.carried).toBe(2);
    expect(engine.score).toBe(15); // 3 * 5
  });

  it('should have wandering Shade drain weak lantern (<30 fuel) at 5/s and award +15 on Pulse stun', () => {
    const engine = new GameEngine(42, 1);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 25 }],
      shades: [{ id: 'S1', pos: [0, 0, 24], state: 'wander' }]
    });

    // Tick 0: wander sees weak lantern within 2m -> transitions to drain
    engine.step({ tick: 0 });
    expect(engine.shades[0].state).toBe('drain');

    // Run 60 ticks of draining: lantern loses 1/s decay + 5/s drain = 6 fuel, emits fuel_drain at 60th drain tick
    let drainEvFound = false;
    for (let i = 1; i <= 60; i++) {
      const evs = engine.step({ tick: i });
      if (evs.some(e => e.name === 'fuel_drain' && e.data.shade_id === 'S1')) drainEvFound = true;
    }
    expect(drainEvFound).toBe(true);
    expect(engine.getLanternFuel(engine.lanterns[0])).toBeLessThan(20);

    // Teleport Mây within 5m and Pulse while shade is still draining -> +15 points
    engine.player.pos = [0, 0, 21];
    const scoreBefore = engine.score;
    engine.step({ tick: 61, pulse: true });
    expect(engine.shades[0].state).toBe('stunned');
    expect(engine.score - scoreBefore).toBe(15);
  });

  it('should NOT win early when all lanterns are lit, and win with dawn_survived at time 0 if >= 60% lit', () => {
    const engine = new GameEngine(42, 1);
    engine.applyScenario({
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      time_left_s: 1.0,
      lanterns: [
        { id: 'L1', lit: true, fuel: 80 },
        { id: 'L2', lit: true, fuel: 80 },
        { id: 'L3', lit: true, fuel: 80 }
      ]
    });

    // Still playing before dawn
    engine.step({ tick: 0 });
    expect(engine.state).toBe('playing');

    let winEv = null;
    for (let i = 1; i <= 65; i++) {
      const evs = engine.step({ tick: i });
      const go = evs.find(e => e.name === 'game_over');
      if (go) {
        winEv = go;
        break;
      }
    }
    expect(engine.state).toBe('won');
    expect(winEv?.data.reason).toBe('dawn_survived');
    // 3 lit lanterns * (50 + floor(79)) + 3 flames * 50 = 3*129 + 150 = 537
    expect(engine.score).toBe(537);
  });

  it('should keep game paused when pause=true is held across consecutive ticks', () => {
    const engine = new GameEngine(42, 1);
    const ev1 = engine.step({ tick: 0, pause: true });
    expect(ev1.some(e => e.name === 'paused')).toBe(true);
    expect(engine.state).toBe('paused');

    const ev2 = engine.step({ tick: 1, pause: true });
    expect(ev2.length).toBe(0);
    expect(engine.state).toBe('paused');
    expect(engine.simTick).toBe(0);

    engine.step({ tick: 2, pause: false });
    const ev4 = engine.step({ tick: 3, pause: true });
    expect(ev4.some(e => e.name === 'resumed')).toBe(true);
    expect(engine.state).toBe('playing');
  });

  it('should pick up Charm and have Drifter steal / drop motes on Pulse', () => {
    const engine = new GameEngine(42, 2);
    engine.applyScenario({
      player: { pos: [35, 0, 0.5], carried: 6, flames: 3 },
      charms: [{ id: 'C1', pos: [35, 0, 0], available: true }],
      drifters: [{ id: 'D1', pos: [35, 0, 1.0], state: 'chase', stolen: 0 }]
    });

    const ev1 = engine.step({ tick: 0 });
    expect(ev1.some(e => e.name === 'charm_picked')).toBe(true);
    expect(ev1.some(e => e.name === 'drifter_steal' && e.data.amount === 3)).toBe(true);
    expect(engine.player.carried).toBe(3);

    const ev2 = engine.step({ tick: 1, pulse: true });
    expect(ev2.some(e => e.name === 'drifter_drop' && e.data.amount === 3)).toBe(true);
  });
});
