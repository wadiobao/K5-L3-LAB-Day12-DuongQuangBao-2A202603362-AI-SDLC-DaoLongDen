# Phase 1 Assumptions & Tuning Parameters

## 1. Boundary & Geometry
- **Island Shape**: Circular island centered at $(0, 0, 0)$ with radius $50\text{m}$.
- **Ground Elevation**: $Y = 0$. Player initial position is $(0, 0, 0)$.
- **Default 5 Lanterns Placement** ($R \approx 25\text{m}$):
  - `L1`: $(0, 0, 25)$
  - `L2`: $(23.776, 0, 7.725)$
  - `L3`: $(14.695, 0, -20.225)$
  - `L4`: $(-14.695, 0, -20.225)$
  - `L5`: $(-23.776, 0, 7.725)$

## 2. Default Dynamic Entities
- **Motes (Fireflies)**: 20 active motes initially scattered randomly between radius $5\text{m}$ and $45\text{m}$.
- **Shades (Ink Shadows)**: 2 initial shades spawning at radius $30\text{m}$ away from $(0, 0, 0)$.

## 3. Mechanics Mapping
- **Tick Rate**: Fixed 60 ticks per second (1 tick = 0.01667s).
- **Player Speed**: $6.0\text{m/s}$ (0.1m per tick).
- **Pulse**: Consumes 1 carried mote, stuns shades within $5.0\text{m}$ for $3.0\text{s}$ (180 ticks), pushes them back by $4.0\text{m}$.
- **Damage**: Collision with shade drops $\lfloor \text{carried} \times 0.5 \rfloor$ motes and deducts 1 flame, granting $2.0\text{s}$ invulnerability (120 ticks).
