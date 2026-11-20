/**
 * @file terrain.ts
 * @description 3D terrain heightfield, boundary checks, ramps, and jump pad physics for Nights 1, 2, and 3.
 */

import { Vector2D, Vector3D } from './types.js';

export interface JumpPad {
  pos: Vector3D;
  radius: number;
  launchVy: number;
  launchVhoriz: number;
  targetDir: Vector2D; // Normalized horizontal launch direction
}

/**
 * Returns the ground elevation Y at (x, z) for the specified Night.
 * Returns -999 if the point is over the void (off-island).
 */
export function getGroundHeight(x: number, z: number, night: number, currentY: number = 0): number {
  if (night === 1) {
    // Night 1: Island Ben (Radius 40m, Y = 0)
    const distSq = x * x + z * z;
    if (distSq <= 40 * 40) {
      return 0;
    }
    return -999;
  }

  if (night === 2) {
    // Night 2: Island Cau (Island A at (0,0), Island B at (70,0), Bridge at x in [26,44], z in [-2,2])
    const distA = Math.sqrt(x * x + z * z);
    if (distA <= 28) return 0;

    const dxB = x - 70;
    const distB = Math.sqrt(dxB * dxB + z * z);
    if (distB <= 28) return 0;

    // Bamboo bridge
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) {
      return 0;
    }

    return -999;
  }

  if (night === 3) {
    // Night 3: Island Chuong (Radius 45m with 3 tiers and 2 ramps)
    const r = Math.sqrt(x * x + z * z);
    if (r > 45) return -999; // Off island

    // Bell Tower obstacle at center of Tier 2 (Solid cylinder R <= 2m)
    // Checked separately in collision

    // Tier 2: Central disk R <= 8m at Y = 6
    if (r <= 8 && currentY >= 4.5) {
      return 6;
    }

    // 2 Ramps connecting Tier 0 (r=30, Y=0) to Tier 1 (r=24, Y=3) at 30 deg and 150 deg
    // Angle in degrees from +X axis
    let deg = (Math.atan2(z, x) * 180) / Math.PI;
    if (deg < 0) deg += 360;

    if (r >= 24 && r <= 30) {
      const isRamp30 = Math.abs(deg - 30) <= 4;
      const isRamp150 = Math.abs(deg - 150) <= 4;
      if (isRamp30 || isRamp150) {
        // Linear interpolation from Y=0 at r=30 to Y=3 at r=24
        return (30 - r) * 0.5;
      }
    }

    // Tier 1: Ring R in [12, 24m] at z > 0 (Y = 3)
    if (z > 0 && r >= 12 && r <= 24 && currentY >= 1.5) {
      return 3;
    }

    // Tier 0: Base island (Y = 0)
    return 0;
  }

  return 0;
}

/**
 * Checks for solid obstacles like the central bell tower on Tier 2 of Night 3.
 */
export function checkSolidObstacle(x: number, z: number, y: number, night: number): boolean {
  if (night === 3) {
    // Central Bell tower on Tier 2: R <= 2m, Y in [6, 14]
    if (y >= 5.5) {
      const r = Math.sqrt(x * x + z * z);
      if (r <= 2.0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns jump pads defined for the current night.
 */
export function getJumpPads(night: number): JumpPad[] {
  if (night === 2) {
    // Pad 1 at (20, 0, 18) launching to Island B (70, 0, 0)
    const dir1X = 70 - 20;
    const dir1Z = 0 - 18;
    const len1 = Math.sqrt(dir1X * dir1X + dir1Z * dir1Z);

    // Pad 2 at (50, 0, -18) launching to Island A (0, 0, 0)
    const dir2X = 0 - 50;
    const dir2Z = 0 - -18;
    const len2 = Math.sqrt(dir2X * dir2X + dir2Z * dir2Z);

    return [
      {
        pos: [20, 0, 18],
        radius: 1.0,
        launchVy: 14.0,
        launchVhoriz: 24.0,
        targetDir: [dir1X / len1, dir1Z / len1]
      },
      {
        pos: [50, 0, -18],
        radius: 1.0,
        launchVy: 14.0,
        launchVhoriz: 24.0,
        targetDir: [dir2X / len2, dir2Z / len2]
      }
    ];
  }

  if (night === 3) {
    // Pad at (0, 3, 13) launching with Vy = 12 m/s, Vhoriz = 8 m/s along -Z
    return [
      {
        pos: [0, 3, 13],
        radius: 1.0,
        launchVy: 12.0,
        launchVhoriz: 8.0,
        targetDir: [0, -1.0]
      }
    ];
  }

  return [];
}
