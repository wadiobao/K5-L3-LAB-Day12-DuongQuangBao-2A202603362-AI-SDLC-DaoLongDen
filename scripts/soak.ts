/**
 * @file soak.ts
 * @description Headless multi-night soak test verifying stability (crashes=0) and bounded RSS memory growth.
 * Conforms to Test Contract v1.3: pnpm soak --seed 7 --nights 10 --out soak.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameEngine, DEFAULT_TUNING_V12 } from '../src/core/engine.js';
import { PRNG } from '../src/core/prng.js';

interface SoakArgs {
  seed: number;
  nights: number;
  outPath: string;
}

function parseArgs(argv: string[]): SoakArgs {
  let seed = 7;
  let nights = 10;
  let outPath = 'soak.json';

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed' && i + 1 < argv.length) seed = parseInt(argv[++i], 10);
    else if (a === '--nights' && i + 1 < argv.length) nights = parseInt(argv[++i], 10);
    else if (a === '--out' && i + 1 < argv.length) outPath = argv[++i];
  }
  return { seed, nights, outPath };
}

function getRssMb(): number {
  return Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
}

function forceGc(): void {
  const g = globalThis as unknown as { gc?: () => void };
  if (typeof g.gc === 'function') g.gc();
}

function runSoak(args: SoakArgs): void {
  const startMs = performance.now();
  const results: string[] = [];
  let crashes = 0;
  let memStartMb = 0;

  for (let i = 0; i < args.nights; i++) {
    const nightNum = (i % 3) + 1;
    const nightSeed = args.seed + i;

    try {
      let engine: GameEngine | null = new GameEngine(nightSeed, nightNum, DEFAULT_TUNING_V12);
      if (i === 0) {
        forceGc();
        memStartMb = getRssMb();
      }

      const inputRng = new PRNG((nightSeed * 2654435761) >>> 0);
      let moveDir: [number, number] = [0, 1];
      const maxTicks = Math.round(engine.durationSeconds * 60) + 10;

      for (let t = 0; t < maxTicks && engine.state === 'playing'; t++) {
        if (t % 30 === 0) {
          const angle = inputRng.nextFloat() * Math.PI * 2;
          moveDir = [Math.cos(angle), Math.sin(angle)];
        }
        const jump = inputRng.nextFloat() < 0.05;
        const dash = inputRng.nextFloat() < 0.03;
        const pulse = inputRng.nextFloat() < 0.02;
        const interact = inputRng.nextFloat() < 0.1;

        engine.step({
          tick: t,
          move: moveDir,
          cam_yaw_deg: 0,
          jump,
          dash,
          pulse,
          interact
        });
      }

      results.push(engine.state === 'won' ? 'won' : 'lost');
      // Explicitly release reference and collect transient nursery objects after night reset
      engine = null;
      forceGc();
    } catch (err) {
      crashes++;
      results.push('crash');
      console.error(`Soak crash on night index ${i}:`, err);
    }
  }

  forceGc();
  const memEndMb = getRssMb();
  const durationS = Math.round(((performance.now() - startMs) / 1000) * 100) / 100;

  const report = {
    nights: args.nights,
    crashes,
    results,
    mem_start_mb: memStartMb,
    mem_end_mb: memEndMb,
    duration_s: durationS
  };

  const outDir = path.dirname(path.resolve(args.outPath));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(args.outPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  console.log('SOAK_RESULT:', JSON.stringify(report));

  if (crashes > 0) {
    process.exit(1);
  }
}

runSoak(parseArgs(process.argv.slice(2)));
process.exit(0);
