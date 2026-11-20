# Requirement Traceability Matrix (RTM) - Phase 2 (Test Contract v1.1)

| Requirement | Implementation File | Verification Test | Proof Output | Status |
|---|---|---|---|---|
| **REQ-P2-01**: Standardized Tuning (Lamp cost 10, Pulse cost 3, Safe 6m) | `src/core/engine.ts`, `game.contract.json` | `tests/unit/core.test.ts` | `docs/proof/phase-2/run_night1.jsonl` | **PASSED** |
| **REQ-P2-02**: 3D Jump ($V_y=7$, $g=-20$) & Grounded Check | `src/core/engine.ts` | `tests/unit/core.test.ts` (Jump test) | `docs/proof/phase-2/run_night1.jsonl` | **PASSED** |
| **REQ-P2-03**: Dash ($14\text{ m/s}$, 12 ticks duration, 90 ticks cd) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Dash test) | `docs/proof/phase-2/run_night1.jsonl` | **PASSED** |
| **REQ-P2-04**: Fall off Island ($Y < -10$) & 60-tick Respawn | `src/core/engine.ts`, `src/core/terrain.ts` | `tests/unit/core.test.ts` (Fall test) | `docs/proof/phase-2/run_night1.jsonl` | **PASSED** |
| **REQ-P2-05**: Night 2 Island Cau (2 Islands, bridge, jump pads) | `src/core/terrain.ts`, `src/core/engine.ts` | `tests/unit/core.test.ts` (Night 2 init) | `docs/proof/phase-2/run_night2.jsonl` | **PASSED** |
| **REQ-P2-06**: Night 3 Island Chuong (3 Tiers, ramps, wind) | `src/core/terrain.ts`, `src/core/engine.ts` | `tests/unit/core.test.ts` (Night 3 init) | `docs/proof/phase-2/run_night3.jsonl` | **PASSED** |
| **REQ-P2-07**: Drifter Entity (Steal min(3, carried), drop on pulse) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Drifter steal & drop) | `docs/proof/phase-2/run_night2.jsonl` | **PASSED** |
| **REQ-P2-08**: Wind Charm (Speed 7.2m/s, 0s dash cd for 600 ticks) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Charm test) | `docs/proof/phase-2/run_night2.jsonl` | **PASSED** |
| **REQ-P2-09**: Strict 12-Step Tick Execution Order | `src/core/engine.ts` | `tests/unit/core.test.ts` | `docs/proof/phase-2/run_night1.jsonl` | **PASSED** |
| **REQ-P2-10**: Determinism Check v1.1 | `src/core/prng.ts`, `src/headless/cli.ts` | `tests/determinism.test.ts` | `docs/proof/phase-2/run_night1.jsonl` | **PASSED** |
