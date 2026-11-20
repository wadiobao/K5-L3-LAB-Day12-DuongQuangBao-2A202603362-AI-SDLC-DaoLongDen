# AGENTS.md - Project Guidelines & Rules

## Project Overview
- Name: Dao Den Long (Lantern Island)
- Author: Duong Quang Bao (MSSV: 2A202603362)
- Target: 3D game with 4 phases, 60Hz deterministic headless runner conforming to Test Contract v1.0.

## Standard Commands
- Install: `pnpm install`
- Build: `pnpm build`
- Run UI: `pnpm preview`
- Headless Test Contract: `pnpm headless --seed <int> --night 1 --ticks <int> --out <file.jsonl>`
- Run Tests: `pnpm test`
- Verification Suite: `pnpm verify`

## Architecture Requirements
- `src/core/`: Pure TypeScript game simulation engine. No DOM/Three.js dependencies. Deterministic ticks at 60Hz.
- `src/headless/`: CLI interface adhering strictly to Test Contract v1.0. Exits with code 0 on success, code 2 on invalid scenario/input format.
- `src/render/`: Three.js rendering view. Follows zero-allocation loops, InstancedMesh for motes, and explicit resource disposal.

## Coding Conventions
- Full TSDoc comments explaining architectural rationale.
- Mulberry32 PRNG for all stochastic events.
- Never commit credentials or secrets.
