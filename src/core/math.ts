/**
 * @file math.ts
 * @description Vector operations and camera coordinate transforms for 2.5D island simulation.
 */

import { Vector2D, Vector3D } from './types.js';

/**
 * Rounds a number to exactly 3 decimal places as mandated by Test Contract v1.0.
 */
export function round3(val: number): number {
  return Math.round(val * 1000) / 1000;
}

/**
 * Rounds a 3D coordinate tuple to 3 decimal places.
 */
export function roundVec3(v: Vector3D): Vector3D {
  return [round3(v[0]), round3(v[1]), round3(v[2])];
}

/**
 * Calculates Euclidean distance on the horizontal XZ plane.
 */
export function distanceXZ(a: Vector3D, b: Vector3D): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Transforms horizontal input [x, z] by camera yaw angle theta (in degrees)
 * into world space coordinates according to Test Contract v1.0 formula:
 * x' = x * cos(theta) + z * sin(theta)
 * z' = -x * sin(theta) + z * cos(theta)
 */
export function transformInputMovement(move: Vector2D, camYawDeg: number): Vector2D {
  let x = move[0];
  let z = move[1];

  // Normalize vector if length exceeds 1.0
  const len = Math.sqrt(x * x + z * z);
  if (len > 1.0) {
    x /= len;
    z /= len;
  }

  const rad = (camYawDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const xPrime = x * cos + z * sin;
  const zPrime = -x * sin + z * cos;

  return [xPrime, zPrime];
}
