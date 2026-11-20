/**
 * @file verify.ts
 * @description Automated verification suite running Vitest and generating Contract v1.2 headless proofs.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== RUNNING VERIFICATION SUITE (CONTRACT V1.2 — PHASE 3) ===');

console.log('1. Executing Vitest Suite...');
try {
  execSync('npx vitest run', { stdio: 'inherit' });
  console.log('✔ All Unit & Determinism tests passed.');
} catch {
  console.error('❌ Vitest execution failed.');
  process.exit(1);
}

const proofDir = path.resolve('docs/proof/phase-3');
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

console.log('2. Generating Headless Proofs for Phase 3 (Nights 1, 2, 3 + Fuel/Drain Scenario)...');

for (const night of [1, 2, 3]) {
  const out = path.join(proofDir, `run_night${night}.jsonl`);
  execSync(`npx tsx src/headless/cli.ts --seed 42 --night ${night} --ticks 180 --out "${out}" --snapshot-every 60`, {
    stdio: 'inherit'
  });
}

// Phase 3 dedicated fuel drain + refuel + dawn_survived scenario proof
const p3Scenario = path.resolve('tests/scenarios/phase3_fuel_scenario.json');
const p3Inputs = path.resolve('tests/scenarios/phase3_fuel_inputs.json');
const p3Proof = path.join(proofDir, 'run_fuel_drain.jsonl');

fs.mkdirSync(path.resolve('tests/scenarios'), { recursive: true });
fs.writeFileSync(
  p3Scenario,
  JSON.stringify(
    {
      night: 1,
      time_left_s: 3.0,
      player: { pos: [0, 0, 24], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [
        { id: 'L1', pos: [0, 0, 25], lit: true, fuel: 25 },
        { id: 'L2', lit: true, fuel: 80 },
        { id: 'L3', lit: true, fuel: 80 }
      ],
      shades: [{ id: 'S1', pos: [0, 0, 24], state: 'wander' }]
    },
    null,
    2
  )
);
fs.writeFileSync(
  p3Inputs,
  JSON.stringify(
    {
      frames: [
        { tick: 65, interact: true },
        { tick: 66, interact: false }
      ]
    },
    null,
    2
  )
);

execSync(
  `npx tsx src/headless/cli.ts --seed 42 --night 1 --scenario "${p3Scenario}" --inputs "${p3Inputs}" --ticks 200 --out "${p3Proof}" --snapshot-every 60`,
  { stdio: 'inherit' }
);

console.log('✔ Phase 3 proofs generated successfully in docs/proof/phase-3/');
console.log('=== VERIFICATION COMPLETE: ALL GATES GREEN ===');
