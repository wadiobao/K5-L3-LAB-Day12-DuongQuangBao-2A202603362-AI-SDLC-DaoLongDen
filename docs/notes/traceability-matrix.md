# Requirement Traceability Matrix (RTM) - Phase 3 (Contract v1.2)

| Requirement | Implementation File | Verification Test | Proof Output | Status |
|---|---|---|---|---|
| **REQ-P3-01**: Lantern Fuel (`0..100`, integer `1/60`, decay `1/s`, `lantern_out`) | `src/core/engine.ts`, `src/core/types.ts` | `tests/unit/core.test.ts` (Fuel decay & relight) | `docs/proof/phase-3/run_fuel_drain.jsonl` | **PASSED** |
| **REQ-P3-02**: Refuel (`+10` fuel/mote, skip full lanterns, `refuel` event) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Refuel test) | `docs/proof/phase-3/run_fuel_drain.jsonl` | **PASSED** |
| **REQ-P3-03**: Relight (`ever_lit` costs 5 motes, `+40` pts, `relit_count`) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Fuel decay & relight) | `docs/proof/phase-3/run_fuel_drain.jsonl` | **PASSED** |
| **REQ-P3-04**: Shade `drain` state (`fuel < 30`, `5/s`, `fuel_drain` / 60t, `+15` pulse) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Shade drain test) | `docs/proof/phase-3/run_fuel_drain.jsonl` | **PASSED** |
| **REQ-P3-05**: Dawn survival win (`240/270/300s`, `>= 60%` lit, `dawn_survived`) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Dawn survival test) | `docs/proof/phase-3/run_fuel_drain.jsonl` | **PASSED** |
| **REQ-P3-06**: Growing capacity (`min(20, 10 + 2*successful_lights)`) | `src/core/engine.ts`, `src/main.ts` | `tests/unit/core.test.ts` (Fuel decay & relight) | `docs/proof/phase-3/run_night1.jsonl` | **PASSED** |
| **REQ-P3-07**: Colorblind Mode & Non-color Lantern Cues (20% deflate + tears + 3D fuel bar) | `src/render/visuals.ts`, `src/main.ts`, `index.html` | `pnpm build` (0 errors) | `docs/notes/adr-001-lantern-fuel-and-win-rule.md` | **PASSED** |
| **REQ-P3-08**: Phase 1–2 Regression & Determinism | `src/core/prng.ts`, `src/headless/cli.ts` | `tests/determinism.test.ts`, `tests/unit/core.test.ts` | `docs/proof/phase-3/run_night1..3.jsonl` | **PASSED** |
