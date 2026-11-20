/**
 * @file verify.ts
 * @description Automated verification suite running Vitest, Contract v1.3 headless proofs,
 * 10-night soak threshold check, and leaderboard export verification.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== RUNNING VERIFICATION SUITE (CONTRACT V1.3 — PHASE 4 / v1.0.0) ===');

console.log('1. Executing Vitest Suite...');
try {
  execSync('npx vitest run', { stdio: 'inherit' });
  console.log('✔ All Unit, Determinism & Leaderboard tests passed.');
} catch {
  console.error('❌ Vitest execution failed.');
  process.exit(1);
}

const proofDir = path.resolve('docs/proof/phase-4');
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

console.log('2. Generating Headless Regression Proofs (Nights 1, 2, 3 + Fuel/Drain Scenario)...');

for (const night of [1, 2, 3]) {
  const out = path.join(proofDir, `run_night${night}.jsonl`);
  execSync(`npx tsx src/headless/cli.ts --seed 42 --night ${night} --ticks 180 --out "${out}" --snapshot-every 60`, {
    stdio: 'inherit'
  });
}

const p3Scenario = path.resolve('tests/scenarios/phase3_fuel_scenario.json');
const p3Inputs = path.resolve('tests/scenarios/phase3_fuel_inputs.json');
const p4FuelProof = path.join(proofDir, 'run_fuel_drain.jsonl');

if (fs.existsSync(p3Scenario) && fs.existsSync(p3Inputs)) {
  execSync(
    `npx tsx src/headless/cli.ts --seed 42 --night 1 --scenario "${p3Scenario}" --inputs "${p3Inputs}" --ticks 200 --out "${p4FuelProof}" --snapshot-every 60`,
    { stdio: 'inherit' }
  );
}

console.log('3. Running 10-Night Headless Soak Test...');
const soakOut = path.resolve('soak.json');
execSync(`pnpm soak --seed 7 --nights 10 --out "${soakOut}"`, { stdio: 'inherit' });
const soakData = JSON.parse(fs.readFileSync(soakOut, 'utf-8')) as {
  nights: number;
  crashes: number;
  mem_start_mb: number;
  mem_end_mb: number;
};
const memRatio = soakData.mem_end_mb / Math.max(1, soakData.mem_start_mb);
if (soakData.crashes !== 0 || memRatio > 1.2) {
  console.error(`❌ Soak threshold failed: crashes=${soakData.crashes}, memRatio=${memRatio.toFixed(3)} (> 1.2)`);
  process.exit(1);
}
console.log(`✔ Soak passed: crashes=0, memRatio=${memRatio.toFixed(3)} (<= 1.2)`);

console.log('4. Verifying Leaderboard Export CLI (--export-leaderboard)...');
const lbOut = path.join(proofDir, 'leaderboard_export.json');
execSync(`pnpm play --export-leaderboard "${lbOut}"`, { stdio: 'inherit' });
const lbData = JSON.parse(fs.readFileSync(lbOut, 'utf-8')) as { entries?: unknown[] };
if (!Array.isArray(lbData.entries)) {
  console.error('❌ Leaderboard export missing entries array.');
  process.exit(1);
}
console.log(`✔ Leaderboard export valid (${lbData.entries.length} entries).`);

const benchPath = path.resolve('bench.json');
const benchSummary = fs.existsSync(benchPath) ? JSON.parse(fs.readFileSync(benchPath, 'utf-8')) : null;

fs.writeFileSync(
  path.join(proofDir, 'verify_summary.json'),
  JSON.stringify(
    {
      contract_version: '1.3',
      verified_at: new Date().toISOString(),
      soak: soakData,
      soak_mem_ratio: Math.round(memRatio * 1000) / 1000,
      leaderboard_entries: lbData.entries.length,
      bench_present: benchSummary !== null,
      bench: benchSummary
    },
    null,
    2
  ) + '\n',
  'utf-8'
);

console.log('✔ Phase 4 proofs generated successfully in docs/proof/phase-4/');
console.log('=== VERIFICATION COMPLETE: ALL GATES GREEN ===');
