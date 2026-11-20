/**
 * @file shaders.ts
 * @description Custom GLSL shaders for Night-to-Dawn Sky Dome, Animated Volumetric Cloud Sea,
 * and a zero-allocation 3D particle burst system for pickups, deposits, dashes, and ambient fireflies.
 */

import * as THREE from 'three';

export interface SkyDomeHandle {
  mesh: THREE.Mesh;
  uniforms: {
    uLitRatio: { value: number };
    uTime: { value: number };
  };
}

/**
 * Creates a full-sphere atmospheric night sky dome with smooth horizon mist and subtle dawn warming.
 */
export function createSkyDome(): SkyDomeHandle {
  const uniforms = {
    uLitRatio: { value: 0.0 },
    uTime: { value: 0.0 }
  };

  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uLitRatio;
      uniform float uTime;
      varying vec3 vWorldPos;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 zenith = vec3(0.055, 0.078, 0.188);     // #0E1430
        vec3 horizonNight = vec3(0.106, 0.137, 0.314); // #1B2350
        vec3 horizonWarm = vec3(0.24, 0.21, 0.32);     // subtle warm twilight glow as lanterns light
        vec3 horizon = mix(horizonNight, horizonWarm, uLitRatio * 0.65);

        float band = pow(1.0 - abs(dir.y), 3.0);
        vec3 col = mix(horizon, zenith, smoothstep(0.45, 0.92, h));
        col += vec3(0.22, 0.14, 0.06) * band * uLitRatio * 0.45;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(240, 28, 18), mat);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return { mesh, uniforms };
}

export interface CloudSeaHandle {
  mesh: THREE.Mesh;
  uniforms: {
    uTime: { value: number };
  };
}

/**
 * Creates a billowing, softly undulating cloud sea beneath the floating islands (#12384A palette).
 */
export function createCloudSea(): CloudSeaHandle {
  const uniforms = {
    uTime: { value: 0.0 }
  };

  const geo = new THREE.PlaneGeometry(540, 540, 48, 48);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      varying float vWave;
      varying float vDist;
      void main() {
        vec3 pos = position;
        float w1 = sin(pos.x * 0.045 + uTime * 0.45) * cos(pos.z * 0.045 + uTime * 0.35);
        float w2 = sin((pos.x + pos.z) * 0.025 - uTime * 0.25);
        pos.y += (w1 * 1.4 + w2 * 0.9);
        vWave = w1 * 0.5 + 0.5;
        vDist = length(pos.xz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying float vWave;
      varying float vDist;
      void main() {
        vec3 deepSea = vec3(0.055, 0.17, 0.24);
        vec3 crest   = vec3(0.11, 0.31, 0.41);  // centered around #12384A
        vec3 fogCol  = vec3(0.106, 0.137, 0.314); // #1B2350
        vec3 col = mix(deepSea, crest, smoothstep(0.2, 0.9, vWave));
        float fogFactor = smoothstep(90.0, 240.0, vDist);
        col = mix(col, fogCol, fogFactor);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -11.2;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return { mesh, uniforms };
}

/**
 * Pooled zero-allocation 3D particle burst manager for pickups, deposits, dashes, and landings.
 */
export class ParticleBurstSystem {
  public points: THREE.Points;
  private maxParticles: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private velocities: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private cursor: number = 0;

  constructor(glowTexture: THREE.Texture, maxParticles = 240) {
    this.maxParticles = maxParticles;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.life = new Float32Array(maxParticles);
    this.maxLife = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      this.positions[i * 3 + 1] = -999;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.72,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  /**
   * Emits a burst of glowing particles at (x, y, z) without allocating new objects.
   */
  public emit(
    x: number,
    y: number,
    z: number,
    count: number,
    r: number,
    g: number,
    b: number,
    speed = 3.5,
    upward = 2.8,
    duration = 0.65
  ): void {
    for (let n = 0; n < count; n++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.maxParticles;

      const angle = (n / count) * Math.PI * 2 + Math.random() * 0.6;
      const spd = speed * (0.4 + Math.random() * 0.7);

      this.positions[idx * 3] = x + (Math.random() - 0.5) * 0.3;
      this.positions[idx * 3 + 1] = y + Math.random() * 0.3;
      this.positions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.3;

      this.velocities[idx * 3] = Math.cos(angle) * spd;
      this.velocities[idx * 3 + 1] = upward * (0.5 + Math.random() * 0.8);
      this.velocities[idx * 3 + 2] = Math.sin(angle) * spd;

      this.colors[idx * 3] = r;
      this.colors[idx * 3 + 1] = g;
      this.colors[idx * 3 + 2] = b;

      this.life[idx] = duration * (0.7 + Math.random() * 0.5);
      this.maxLife[idx] = this.life[idx];
    }
  }

  /**
   * Updates all active burst particles in-place.
   */
  public update(dt: number): void {
    let anyUpdated = false;
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.life[i] > 0) {
        anyUpdated = true;
        this.life[i] -= dt;
        if (this.life[i] <= 0) {
          this.positions[i * 3 + 1] = -999;
        } else {
          this.positions[i * 3] += this.velocities[i * 3] * dt;
          this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
          this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
          this.velocities[i * 3 + 1] -= 4.5 * dt; // gentle gravity
        }
      }
    }
    if (anyUpdated) {
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
  }
}
