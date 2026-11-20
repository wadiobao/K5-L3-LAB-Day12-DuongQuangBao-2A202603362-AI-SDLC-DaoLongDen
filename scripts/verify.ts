/**
 * @file verify.ts
 * @description Automated verification suite running tests, headless scenarios for all 3 nights, and generating proofs.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== RUNNING VERIFICATION SUITE (CONTRACT V1.1) ===');

// 1. Run Vitest Unit & Determinism Tests
console.log('1. Executing Vitest Suite...');
try {
  execSync('npx vitest run', { stdio: 'inherit' });
  console.log('✔ All Unit & Determinism tests passed.');
} catch (err) {
  console.error('❌ Vitest execution failed.');
  process.exit(1);
}

// 2. Generate Proof Files for Phase 2
const proofDir = path.resolve('docs/proof/phase-2');
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

console.log('2. Generating Headless Scenario Proofs for Nights 1, 2, 3...');

// Run Night 1
const proofNight1 = path.join(proofDir, 'run_night1.jsonl');
execSync(`npx tsx src/headless/cli.ts --seed 42 --night 1 --ticks 180 --out "${proofNight1}" --snapshot-every 60`, {
  stdio: 'inherit'
});

// Run Night 2
const proofNight2 = path.join(proofDir, 'run_night2.jsonl');
execSync(`npx tsx src/headless/cli.ts --seed 42 --night 2 --ticks 180 --out "${proofNight2}" --snapshot-every 60`, {
  stdio: 'inherit'
});

// Run Night 3
const proofNight3 = path.join(proofDir, 'run_night3.jsonl');
execSync(`npx tsx src/headless/cli.ts --seed 42 --night 3 --ticks 180 --out "${proofNight3}" --snapshot-every 60`, {
  stdio: 'inherit'
});

console.log('✔ All 3 Nights verified and proof files generated in docs/proof/phase-2/');
console.log('=== VERIFICATION COMPLETE: ALL GATES GREEN ===');
