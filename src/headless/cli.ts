/**
 * @file cli.ts
 * @description Headless CLI runner implementing Test Contract v1.0 for Dao Den Long.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameEngine, DEFAULT_TUNING } from '../core/engine.js';
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

/**
 * Parses CLI arguments into structured configuration.
 */
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

/**
 * Reads and validates a JSON file, exiting with code 2 if invalid.
 */
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

/**
 * Main headless runner execution.
 */
export function runHeadless(cliArgs: CliArgs): void {
  // Load tuning if contract file is present
  let tuning: TuningConfig = DEFAULT_TUNING;
  const contractPath = path.resolve(process.cwd(), 'game.contract.json');
  if (fs.existsSync(contractPath)) {
    try {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
      if (contract.tuning) {
        tuning = { ...DEFAULT_TUNING, ...contract.tuning };
      }
    } catch {
      // Fallback to default
    }
  }

  const engine = new GameEngine(cliArgs.seed, tuning);

  // Apply scenario if specified
  if (cliArgs.scenarioPath) {
    const scenario = readJsonFile<InputScenario>(cliArgs.scenarioPath);
    engine.applyScenario(scenario);
  }

  // Load input frames if specified
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

  // Prepare output file stream
  const outDir = path.dirname(path.resolve(cliArgs.outPath));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outLines: string[] = [];

  // Snapshot tick 0 before applying any input
  outLines.push(JSON.stringify(engine.getSnapshot()));

  // Simulation Loop for N ticks
  for (let k = 0; k < cliArgs.ticks; k++) {
    const input = inputMap.get(k);
    const events = engine.step(input);

    // Write events triggered in this step
    for (const ev of events) {
      outLines.push(JSON.stringify(ev));
    }

    // Write snapshot every snapshotEvery ticks
    const currentTick = engine.tickCount;
    if (currentTick % cliArgs.snapshotEvery === 0) {
      outLines.push(JSON.stringify(engine.getSnapshot()));
    }

    // Stop early if game reaches end state (won or lost)
    if (engine.state !== 'playing') {
      break;
    }
  }

  // End line is mandatory as the final line
  const endRecord = {
    type: 'end',
    ticks: engine.tickCount,
    state: engine.state,
    score: engine.score
  };
  outLines.push(JSON.stringify(endRecord));

  fs.writeFileSync(cliArgs.outPath, outLines.join('\n') + '\n', 'utf-8');
}

// Execute when invoked directly from CLI
if (process.argv[1] && process.argv[1].endsWith('cli.ts')) {
  const args = parseArgs(process.argv.slice(2));
  runHeadless(args);
  process.exit(0);
}
