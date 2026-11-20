import { describe, it, expect } from 'vitest';
import { runHeadless } from '../src/headless/cli.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Determinism Check (Test Contract v1.0)', () => {
  it('should produce bit-identical output across two runs with same seed and inputs', () => {
    const out1 = path.resolve('test_run_1.jsonl');
    const out2 = path.resolve('test_run_2.jsonl');

    runHeadless({
      seed: 99999,
      night: 1,
      ticks: 300,
      outPath: out1,
      snapshotEvery: 60
    });

    runHeadless({
      seed: 99999,
      night: 1,
      ticks: 300,
      outPath: out2,
      snapshotEvery: 60
    });

    const content1 = fs.readFileSync(out1, 'utf-8');
    const content2 = fs.readFileSync(out2, 'utf-8');

    expect(content1).toBe(content2);

    // Clean up temporary run files
    if (fs.existsSync(out1)) fs.unlinkSync(out1);
    if (fs.existsSync(out2)) fs.unlinkSync(out2);
  });
});
