/**
 * @file cli.ts
 * @description Headless CLI runner implementing Test Contract v1.1 for Dao Den Long.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameEngine, DEFAULT_TUNING_V11 } from '../core/engine.js';
import { InputFrame, InputScenario, TuningConfig } from '../core/types.js';

interface CliArgs {
  seed: number;
  night: number;
  scenarioPath?: string;
  inputsPath?: string;
  ticks: number;
  outPath: string;
  snapshotEvery: number;
}

function parseArgs(args: string[]): CliArgs {
  let seed = 42;
  let night = 1;
  let scenarioPath: string | undefined;
  let inputsPath: string | undefined;
  let ticks = 600;
  let outPath = 'out.jsonl';
  let snapshotEvery = 10;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--seed' && i + 1 < args.length) {
      seed = parseInt(args[++i], 10);
    } else if (arg === '--night' && i + 1 < args.length) {
      night = parseInt(args[++i], 10);
    } else if (arg === '--scenario' && i + 1 < args.length) {
      scenarioPath = args[++i];
    } else if (arg === '--inputs' && i + 1 < args.length) {
      inputsPath = args[++i];
    } else if (arg === '--ticks' && i + 1 < args.length) {
      ticks = parseInt(args[++i], 10);
    } else if (arg === '--out' && i + 1 < args.length) {
      outPath = args[++i];
    } else if (arg === '--snapshot-every' && i + 1 < args.length) {
      snapshotEvery = parseInt(args[++i], 10);
    }
  }

  return { seed, night, scenarioPath, inputsPath, ticks, outPath, snapshotEvery };
}

function readJsonFile<T>(filePath: string): T {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      process.exit(2);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`JSON Parse error in ${filePath}:`, err);
    process.exit(2);
  }
}

export function runHeadless(cliArgs: CliArgs): void {
  let tuning: TuningConfig = DEFAULT_TUNING_V11;
  const contractPath = path.resolve(process.cwd(), 'game.contract.json');
  if (fs.existsSync(contractPath)) {
    try {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
      if (contract.tuning) {
        tuning = { ...DEFAULT_TUNING_V11, ...contract.tuning };
      }
    } catch {
      // Fallback
    }
  }

  const engine = new GameEngine(cliArgs.seed, cliArgs.night, tuning);

  // Apply scenario if provided
  if (cliArgs.scenarioPath) {
    const scenario = readJsonFile<InputScenario>(cliArgs.scenarioPath);
    engine.applyScenario(scenario);
  }

  // Load inputs if provided
  const inputMap = new Map<number, InputFrame>();
  if (cliArgs.inputsPath) {
    const inputData = readJsonFile<{ frames: InputFrame[] }>(cliArgs.inputsPath);
    if (!inputData.frames || !Array.isArray(inputData.frames)) {
      console.error('Invalid inputs file schema: missing "frames" array.');
      process.exit(2);
    }

    let lastTick = -1;
    for (const frame of inputData.frames) {
      if (frame.tick === undefined || frame.tick <= lastTick) {
        console.error(`Invalid inputs frame ticks: strictly increasing order required. Found: ${frame.tick} after ${lastTick}`);
        process.exit(2);
      }
      lastTick = frame.tick;
      inputMap.set(frame.tick, frame);
    }
  }

  // Output preparation
  const outDir = path.dirname(path.resolve(cliArgs.outPath));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outLines: string[] = [];

  // Snapshot tick 0 before any input
  outLines.push(JSON.stringify(engine.getSnapshot()));
  outLines.push(JSON.stringify({ type: 'event', tick: 0, name: 'night_start', data: { night: engine.night } }));

  // Run simulation for N ticks
  for (let k = 0; k < cliArgs.ticks; k++) {
    const input = inputMap.get(k);
    const events = engine.step(input);

    for (const ev of events) {
      outLines.push(JSON.stringify(ev));
    }

    const currentTick = engine.tickCount;
    if (currentTick % cliArgs.snapshotEvery === 0) {
      outLines.push(JSON.stringify(engine.getSnapshot()));
    }

    if (engine.state !== 'playing' && engine.state !== 'paused') {
      break;
    }
  }

  // Mandatory End line
  const endRecord = {
    type: 'end',
    ticks: engine.tickCount,
    state: engine.state === 'paused' ? 'playing' : engine.state,
    score: engine.score
  };
  outLines.push(JSON.stringify(endRecord));

  fs.writeFileSync(cliArgs.outPath, outLines.join('\n') + '\n', 'utf-8');
}

if (process.argv[1] && process.argv[1].endsWith('cli.ts')) {
  const args = parseArgs(process.argv.slice(2));
  runHeadless(args);
  process.exit(0);
}
