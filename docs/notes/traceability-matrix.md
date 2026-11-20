# Requirement Traceability Matrix (RTM) — v1.0.0 (Contract v1.3)

| Requirement | Implementation File | Verification Test / Command | Proof Output | Status |
|---|---|---|---|---|
| **REQ-P1/P2**: 3 Nights Terrain, Jump/Dash, Drifter, Charm, Pause, Determinism | `src/core/terrain.ts`, `src/core/engine.ts`, `src/core/prng.ts` | `tests/unit/core.test.ts`, `tests/determinism.test.ts` | `docs/proof/phase-4/run_night1..3.jsonl` | **PASSED** |
| **REQ-P3-01..06**: Fuel (`1/60`), Refuel, Relight (`5` motes, `+40`), Shade `drain`, Dawn Win (`>=60%`), Growing Capacity | `src/core/engine.ts`, `src/core/types.ts` | `tests/unit/core.test.ts` (11 tests) | `docs/proof/phase-4/run_fuel_drain.jsonl` | **PASSED** |
| **REQ-P3-07**: Colorblind Mode & Non-color Lantern Cues | `src/render/visuals.ts`, `src/main.ts`, `index.html` | `pnpm build` (0 errors) | `docs/notes/adr-001-lantern-fuel-and-win-rule.md` | **PASSED** |
| **REQ-P4-01**: Benchmark Mode (`1280×720`, 200 Shades, 100 Motes, L1–L3 lit, R=30m orbit, 3s warmup + 30s) | `scripts/bench.ts`, `src/main.ts` | `pnpm bench --seed 42 --duration 30 --out bench.json` (`avg=120`, `p1_low=116.4`, `load=794ms`) | `bench.json` | **PASSED** |
| **REQ-P4-02**: Soak Test (10 consecutive nights, seed `7+i`, `crashes=0`, `mem_end_mb <= 1.2×mem_start_mb`) | `scripts/soak.ts` | `pnpm soak --seed 7 --nights 10 --out soak.json` (`crashes=0`, `52.7→61.0 MB`, `1.157×`) | `soak.json` | **PASSED** |
| **REQ-P4-03**: Local Leaderboard (Top 10, 3–12 chars + Vietnamese, disk persistence, `--export-leaderboard`) | `src/core/leaderboard.ts`, `scripts/play.ts`, `src/main.ts`, `index.html` | `tests/unit/leaderboard.test.ts` (3 tests), `pnpm play --export-leaderboard` | `docs/proof/phase-4/leaderboard_export.json` | **PASSED** |
| **REQ-P4-04**: Accessibility (9-action Key Remap + Conflict + Reset, Visual Captions + Edge Arrow, Reduce Motion, `>=18px` + `×1.25`) | `src/main.ts`, `index.html` | `pnpm build` + UI/DOM verification | `docs/proof/phase-4/verify_summary.json` | **PASSED** |
| **REQ-P4-05**: Contract v1.3 (`bench_cmd`, `soak_cmd`, `run_cmd`), Docs (`README`, `CHANGELOG`, `CREDITS`, `LICENSE`, `retro.md`) | `game.contract.json`, `README.md`, `CHANGELOG.md`, `CREDITS.md`, `LICENSE`, `docs/notes/retro.md` | `pnpm verify` | `docs/proof/phase-4/` | **PASSED** |
