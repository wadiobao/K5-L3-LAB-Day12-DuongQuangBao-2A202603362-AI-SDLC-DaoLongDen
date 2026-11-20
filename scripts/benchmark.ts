/**
 * @file benchmark.ts
 * @description Performance benchmark measuring simulation tick rate and memory allocation.
 */

import { GameEngine } from '../src/core/engine.js';

console.log('=== BENCHMARKING CORE SIMULATION ENGINE ===');

const TOTAL_TICKS = 60000; // 1000 simulated seconds (approx 16.6 minutes of gameplay)
const engine = new GameEngine(12345);

const memBefore = process.memoryUsage().heapUsed;
const start = performance.now();

for (let i = 0; i < TOTAL_TICKS; i++) {
  engine.step({
    tick: i,
    move: [0.5, 0.5],
    cam_yaw_deg: (i * 0.5) % 360
  });
}

const elapsedMs = performance.now() - start;
const memAfter = process.memoryUsage().heapUsed;
const ticksPerSecond = Math.round((TOTAL_TICKS / (elapsedMs / 1000)));
const memUsedMb = Math.round(((memAfter - memBefore) / 1024 / 1024) * 100) / 100;

console.log(`Executed: ${TOTAL_TICKS} ticks`);
console.log(`Elapsed Time: ${elapsedMs.toFixed(2)} ms`);
console.log(`Performance: ${ticksPerSecond} ticks/second (Requirement: >= 60 ticks/s)`);
console.log(`Memory Delta: ${memUsedMb} MB`);

if (ticksPerSecond < 1000) {
  console.warn('⚠️ Performance warning: Engine speed lower than expected threshold.');
} else {
  console.log('✔ Benchmark Passed: Ultra-high simulation performance.');
}
