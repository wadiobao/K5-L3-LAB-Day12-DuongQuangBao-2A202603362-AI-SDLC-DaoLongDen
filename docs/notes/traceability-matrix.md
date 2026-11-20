# Requirement Traceability Matrix (RTM) - Phase 1

| PRD-0 Requirement | Implementation File | Verification Test | Proof Output | Status |
|---|---|---|---|---|
| **REQ-01**: Player 3D movement & camera yaw transform | `src/core/math.ts`, `src/core/engine.ts` | `tests/unit/core.test.ts` (Movement test) | `docs/proof/phase-1/run_basic.jsonl` | **PASSED** |
| **REQ-02**: Mote pickup ($R \le 1.5\text{m}$, capacity $\le 10$) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Pickup test) | `docs/proof/phase-1/run_scenario.jsonl` | **PASSED** |
| **REQ-03**: Deposit into Lantern ($R \le 3.0\text{m}$, cost=5) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Deposit test) | `docs/proof/phase-1/run_scenario.jsonl` | **PASSED** |
| **REQ-04**: Shade pursuit, collision, damage & drop | `src/core/engine.ts` | `tests/unit/core.test.ts` (Damage test) | `docs/proof/phase-1/run_scenario.jsonl` | **PASSED** |
| **REQ-05**: Pulse ability ($R \le 5.0\text{m}$, cost=1, stun 3s) | `src/core/engine.ts` | `tests/unit/core.test.ts` (Pulse test) | `docs/proof/phase-1/run_scenario.jsonl` | **PASSED** |
| **REQ-06**: Win (`all_lit`) and Lose (`no_flames`, `dawn`) | `src/core/engine.ts` | `tests/unit/core.test.ts` (End conditions) | `docs/proof/phase-1/run_scenario.jsonl` | **PASSED** |
| **REQ-07**: Determinism across identical seeds | `src/core/prng.ts`, `src/headless/cli.ts` | `tests/determinism.test.ts` | `docs/proof/phase-1/run_basic.jsonl` | **PASSED** |
