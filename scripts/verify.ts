/**
 * @file verify.ts
 * @description Automated verification script running tests, headless scenarios, and generating proof logs.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== RUNNING VERIFICATION SUITE ===');

// 1. Run Vitest Unit & Determinism Tests
console.log('1. Executing Vitest Suite...');
try {
  execSync('npx vitest run', { stdio: 'inherit' });
  console.log('✔ All Unit & Determinism tests passed.');
} catch (err) {
  console.error('❌ Vitest execution failed.');
  process.exit(1);
}

// 2. Generate Proof Files for Phase 1
const proofDir = path.resolve('docs/proof/phase-1');
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

console.log('2. Generating Headless Scenario Proofs...');

// Run basic scenario
const basicProof = path.join(proofDir, 'run_basic.jsonl');
execSync(`npx tsx src/headless/cli.ts --seed 42 --night 1 --ticks 180 --out "${basicProof}" --snapshot-every 60`, {
  stdio: 'inherit'
});

// Run scenario with pulse and interact
const scenarioFile = path.resolve('tests/scenarios/case1_scenario.json');
const inputsFile = path.resolve('tests/scenarios/case1_inputs.json');
const scenarioProof = path.join(proofDir, 'run_scenario.jsonl');

fs.mkdirSync(path.resolve('tests/scenarios'), { recursive: true });

fs.writeFileSync(
  scenarioFile,
  JSON.stringify(
    {
      player: { pos: [0, 0, 0], carried: 3, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [[0, 0, 5]],
      shades: [{ id: 'S1', pos: [0, 0, 4] }],
      lanterns: [{ id: 'L1', pos: [0, 0, 10], deposited: 0 }]
    },
    null,
    2
  )
);

fs.writeFileSync(
  inputsFile,
  JSON.stringify(
    {
      frames: [
        { tick: 0, move: [0, 1], cam_yaw_deg: 0 },
        { tick: 30, pulse: true },
        { tick: 31, pulse: false },
        { tick: 60, move: [0, 0], interact: true },
        { tick: 61, interact: false }
      ]
    },
    null,
    2
  )
);

execSync(
  `npx tsx src/headless/cli.ts --seed 42 --night 1 --scenario "${scenarioFile}" --inputs "${inputsFile}" --ticks 120 --out "${scenarioProof}" --snapshot-every 30`,
  { stdio: 'inherit' }
);

console.log('✔ Headless proofs generated successfully in docs/proof/phase-1/');
console.log('=== VERIFICATION COMPLETE: ALL GATES GREEN ===');
