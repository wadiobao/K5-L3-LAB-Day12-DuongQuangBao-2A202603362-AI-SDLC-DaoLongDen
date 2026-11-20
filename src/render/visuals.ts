/**
 * @file visuals.ts
 * @description Procedural 3D character, entity, and VFX builders adhering to PRD-1 palette
 * and three-best-practices (zero-allocation animation updates, InstancedMesh, clean disposal).
 */

import * as THREE from 'three';

/** Official PRD-1 Color Palette */
export const COLORS = {
  sky: 0x0e1430,
  fog: 0x1b2350,
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  cloudSea: 0x12384a,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternOff: 0x5b5f6e,
  moteCore: 0xfff6c2,
  moteGlow: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeRim: 0x7a3cff,
  shadeStunned: 0x3a3450,
  mayRobe: 0xe8e2d0,
  mayScarf: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8
};

export interface PlayerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  scarfTailL: THREE.Mesh;
  scarfTailR: THREE.Mesh;
  hatGroup: THREE.Group;
  miniLanternPivot: THREE.Group;
  miniLanternMat: THREE.MeshStandardMaterial;
  hatLight: THREE.PointLight;
  charmAura: THREE.Mesh;
  dashRing: THREE.Mesh;
}

/**
 * Builds an articulated Mây character rig with Nón Lá, hanging lantern, flowing scarf, and aura VFX.
 */
export function createPlayerRig(): PlayerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const robeMat = new THREE.MeshStandardMaterial({ color: COLORS.mayRobe, roughness: 0.75 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2433, roughness: 0.8 });

  // Legs (articulated at hips y = 0.45)
  const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.46, 10);
  legGeo.translate(0, -0.23, 0);
  const leftLeg = new THREE.Mesh(legGeo, darkMat);
  leftLeg.position.set(0.14, 0.46, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, darkMat);
  rightLeg.position.set(-0.14, 0.46, 0);
  rightLeg.castShadow = true;
  bodyGroup.add(leftLeg, rightLeg);

  // Robe / Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 0.82, 16), robeMat);
  torso.position.y = 0.78;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Waist sash (#C8102E)
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 16), scarfMat);
  sash.position.y = 0.68;
  bodyGroup.add(sash);

  // Arms (articulated at shoulders y = 1.08)
  const armGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.48, 10);
  armGeo.translate(0, -0.22, 0);
  const leftArm = new THREE.Mesh(armGeo, robeMat);
  leftArm.position.set(0.32, 1.08, 0);
  leftArm.castShadow = true;
  const rightArm = new THREE.Mesh(armGeo, robeMat);
  rightArm.position.set(-0.32, 1.08, 0);
  rightArm.castShadow = true;
  bodyGroup.add(leftArm, rightArm);

  // Scarf collar & twin animated tails
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.075, 8, 18), scarfMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.18;
  bodyGroup.add(collar);

  const tailGeo = new THREE.BoxGeometry(0.14, 0.04, 0.55);
  tailGeo.translate(0, 0, -0.27);
  const scarfTailL = new THREE.Mesh(tailGeo, scarfMat);
  scarfTailL.position.set(0.1, 1.15, -0.22);
  const scarfTailR = new THREE.Mesh(tailGeo, scarfMat);
  scarfTailR.position.set(-0.1, 1.13, -0.22);
  bodyGroup.add(scarfTailL, scarfTailR);

  // Head + Eyes
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), skinMat);
  head.position.y = 1.38;
  head.castShadow = true;
  bodyGroup.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.032, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, darkMat);
  eyeL.position.set(0.09, 1.4, 0.22);
  const eyeR = new THREE.Mesh(eyeGeo, darkMat);
  eyeR.position.set(-0.09, 1.4, 0.22);
  bodyGroup.add(eyeL, eyeR);

  // Nón Lá (Conical Hat) + Gold rim + Swinging Mini Lantern
  const hatGroup = new THREE.Group();
  hatGroup.position.y = 1.62;
  bodyGroup.add(hatGroup);

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.86, 0.42, 24),
    new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.85 })
  );
  hat.castShadow = true;
  hatGroup.add(hat);

  const hatRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.025, 8, 28),
    new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.4, metalness: 0.4 })
  );
  hatRim.rotation.x = Math.PI / 2;
  hatRim.position.y = -0.2;
  hatGroup.add(hatRim);

  // Hanging mini-lantern on a small cord at the front-right rim
  const miniLanternPivot = new THREE.Group();
  miniLanternPivot.position.set(-0.48, -0.2, 0.48);
  hatGroup.add(miniLanternPivot);

  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6),
    new THREE.MeshBasicMaterial({ color: COLORS.gold })
  );
  cord.position.y = -0.12;
  miniLanternPivot.add(cord);

  const miniLanternMat = new THREE.MeshStandardMaterial({
    color: COLORS.lanternCore,
    emissive: COLORS.lanternLit,
    emissiveIntensity: 1.0
  });
  const miniLamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 1), miniLanternMat);
  miniLamp.position.y = -0.28;
  miniLanternPivot.add(miniLamp);

  const hatLight = new THREE.PointLight(COLORS.lanternLit, 1.5, 8);
  hatLight.position.y = -0.28;
  miniLanternPivot.add(hatLight);

  // Wind Charm Aura Ring (visible when charmTicks > 0)
  const charmAura = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.85, 24),
    new THREE.MeshBasicMaterial({ color: COLORS.mayScarf, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  charmAura.rotation.x = -Math.PI / 2;
  charmAura.position.y = 0.06;
  charmAura.visible = false;
  root.add(charmAura);

  // Dash Wind Ring (visible when dashTicks > 0)
  const dashRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.05, 8, 20),
    new THREE.MeshBasicMaterial({ color: COLORS.gold, transparent: true, opacity: 0.8 })
  );
  dashRing.position.set(0, 0.9, -0.35);
  dashRing.visible = false;
  root.add(dashRing);

  return {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    scarfTailL,
    scarfTailR,
    hatGroup,
    miniLanternPivot,
    miniLanternMat,
    hatLight,
    charmAura,
    dashRing
  };
}

export interface LanternVisual {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  tearGroup: THREE.Group;
  light: THREE.PointLight;
  safeRing: THREE.Mesh;
  fuelBarGroup: THREE.Group;
  fuelBarFill: THREE.Mesh;
  fuelBarMat: THREE.MeshBasicMaterial;
}

/**
 * Builds a detailed pagoda-style Great Lantern with stone pedestal, curved roof,
 * tear overlays for unlit state (colorblind shape cue), 3D fuel bar, and 6m safe zone ring.
 */
export function createLanternVisual(pos: [number, number, number]): LanternVisual {
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1], pos[2]);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4b4f5e, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.82 });
  const goldMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.35, metalness: 0.5 });

  // Stone Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.45, 8), stoneMat);
  base.position.y = 0.22;
  base.receiveShadow = true;
  group.add(base);

  // Wooden Pillar
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 3.0, 10), woodMat);
  pillar.position.y = 1.85;
  pillar.castShadow = true;
  group.add(pillar);

  // Lantern Platform
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.55, 0.25, 6), woodMat);
  tray.position.y = 3.35;
  group.add(tray);

  // Glowing Hexagonal Paper Core (deflates 20% vertically when unlit per Ticket-03)
  const coreMat = new THREE.MeshStandardMaterial({
    color: COLORS.lanternOff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.3
  });
  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.52, 1.05, 6), coreMat);
  coreMesh.position.y = 3.98;
  coreMesh.scale.set(1, 0.8, 1);
  group.add(coreMesh);

  // Paper tear marks visible when unlit (non-color visual distinction)
  const tearGroup = new THREE.Group();
  tearGroup.position.y = 3.98;
  const tearMat = new THREE.MeshBasicMaterial({ color: 0x120a1a });
  const tear1 = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.14), tearMat);
  tear1.rotation.z = 0.45;
  const tear2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.22), tearMat);
  tear2.rotation.x = -0.4;
  tearGroup.add(tear1, tear2);
  group.add(tearGroup);

  // Pagoda Curved Roof + Gold Finial
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.65, 6), woodMat);
  roof.position.y = 4.78;
  roof.castShadow = true;
  group.add(roof);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), goldMat);
  finial.position.y = 5.22;
  group.add(finial);

  const light = new THREE.PointLight(COLORS.lanternLit, 0, 20);
  light.position.y = 4.0;
  group.add(light);

  // 3D Fuel Bar above lantern roof (visible when lit)
  const fuelBarGroup = new THREE.Group();
  fuelBarGroup.position.y = 5.75;
  fuelBarGroup.visible = false;
  const fuelBg = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.22, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x0e1430 })
  );
  const fuelBarMat = new THREE.MeshBasicMaterial({ color: COLORS.lanternLit });
  const fuelBarFill = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 0.1), fuelBarMat);
  fuelBarGroup.add(fuelBg, fuelBarFill);
  group.add(fuelBarGroup);

  // Safe Zone Ground Ring (R = 6m, shown when lit and fuel >= 30)
  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(5.85, 6.05, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, side: THREE.DoubleSide, transparent: true, opacity: 0.32 })
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.05;
  safeRing.visible = false;
  group.add(safeRing);

  group.matrixAutoUpdate = false;
  group.updateMatrix();

  return { group, coreMesh, coreMat, tearGroup, light, safeRing, fuelBarGroup, fuelBarFill, fuelBarMat };
}

export interface ShadeVisual {
  root: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshBasicMaterial;
  tendrils: THREE.Mesh[];
  eyes: THREE.Mesh[];
}

/**
 * Builds an animated Ink Shade with swirling shadowy tendrils and glowing eyes.
 */
export function createShadeVisual(): ShadeVisual {
  const root = new THREE.Group();
  root.visible = false;

  const coreMat = new THREE.MeshStandardMaterial({
    color: COLORS.shadeBody,
    emissive: COLORS.shadeRim,
    emissiveIntensity: 0.6,
    roughness: 0.25
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), coreMat);
  core.castShadow = true;
  root.add(core);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe6d4ff });
  const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.22, 0.14, 0.56);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(-0.22, 0.14, 0.56);
  root.add(eyeL, eyeR);

  // 5 orbiting shadowy ink tendrils
  const tendrils: THREE.Mesh[] = [];
  const tendrilGeo = new THREE.ConeGeometry(0.18, 0.85, 6);
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(tendrilGeo, coreMat);
    const angle = (i / 5) * Math.PI * 2;
    t.position.set(Math.cos(angle) * 0.52, -0.35, Math.sin(angle) * 0.52);
    t.rotation.x = Math.PI;
    tendrils.push(t);
    root.add(t);
  }

  return { root, coreMat, eyeMat, tendrils, eyes: [eyeL, eyeR] };
}

export interface DrifterVisual {
  root: THREE.Group;
  segments: THREE.Mesh[];
}

/**
 * Builds a multi-segment undulating silk ribbon for Gió Lạc (Drifter).
 */
export function createDrifterVisual(): DrifterVisual {
  const root = new THREE.Group();
  root.visible = false;

  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.drifter,
    emissive: COLORS.drifter,
    emissiveIntensity: 0.4,
    roughness: 0.35,
    side: THREE.DoubleSide
  });

  const segments: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const width = 0.48 - i * 0.06;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, 0.42), mat);
    seg.position.set(0, 0, -i * 0.38);
    segments.push(seg);
    root.add(seg);
  }

  return { root, segments };
}

/**
 * Builds a floating Wind Charm talisman with an orbiting gold halo.
 */
export function createCharmVisual(): THREE.Group {
  const group = new THREE.Group();
  group.visible = false;

  const talisman = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.88, 0.08),
    new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, emissive: COLORS.mayScarf, emissiveIntensity: 0.45 })
  );
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.96, 0.04),
    new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.6 })
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.03, 8, 24),
    new THREE.MeshBasicMaterial({ color: COLORS.gold })
  );
  halo.rotation.x = Math.PI / 3;
  group.add(trim, talisman, halo);
  return group;
}

export interface PulseVfx {
  ring: THREE.Mesh;
  dome: THREE.Mesh;
  active: boolean;
  progress: number;
}

/**
 * Creates the reusable Pulse shockwave VFX (expanding golden ring + translucent dome).
 */
export function createPulseVfx(): PulseVfx {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.0, 40),
    new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 24, 16),
    new THREE.MeshBasicMaterial({ color: COLORS.moteGlow, transparent: true, opacity: 0.25, wireframe: false })
  );
  dome.visible = false;

  return { ring, dome, active: false, progress: 0 };
}

/**
 * Creates decorative instanced pine/bamboo trees & mossy rocks around an island (1 draw call each).
 */
export function addIslandDecorations(
  levelGroup: THREE.Group,
  night: number,
  avoidPositions: Array<[number, number, number]>
): void {
  const treePositions: Array<[number, number, number, number]> = [];
  const rockPositions: Array<[number, number, number, number]> = [];

  const isSafeSpot = (x: number, z: number) => {
    if (Math.sqrt(x * x + z * z) < 5) return false;
    for (const p of avoidPositions) {
      const dx = x - p[0];
      const dz = z - p[2];
      if (dx * dx + dz * dz < 16) return false;
    }
    return true;
  };

  // Deterministic pseudo-random placement for crisp aesthetics
  let s = night * 1337 + 99;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  if (night === 1) {
    for (let i = 0; i < 28; i++) {
      const a = rand() * Math.PI * 2;
      const r = 16 + rand() * 21;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) treePositions.push([x, 0, z, 0.8 + rand() * 0.6]);
    }
    for (let i = 0; i < 24; i++) {
      const a = rand() * Math.PI * 2;
      const r = 8 + rand() * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) rockPositions.push([x, 0, z, 0.4 + rand() * 0.6]);
    }
  } else if (night === 2) {
    for (const cx of [0, 70]) {
      for (let i = 0; i < 14; i++) {
        const a = rand() * Math.PI * 2;
        const r = 12 + rand() * 14;
        const x = cx + Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (isSafeSpot(x, z)) treePositions.push([x, 0, z, 0.75 + rand() * 0.55]);
      }
      for (let i = 0; i < 12; i++) {
        const a = rand() * Math.PI * 2;
        const r = 6 + rand() * 20;
        const x = cx + Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (isSafeSpot(x, z)) rockPositions.push([x, 0, z, 0.4 + rand() * 0.5]);
      }
    }
  } else if (night === 3) {
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const r = 27 + rand() * 15;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) treePositions.push([x, 0, z, 0.8 + rand() * 0.6]);
    }
    for (let i = 0; i < 20; i++) {
      const a = rand() * Math.PI * 2;
      const r = 26 + rand() * 16;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) rockPositions.push([x, 0, z, 0.45 + rand() * 0.55]);
    }
  }

  const dummy = new THREE.Object3D();

  // Instanced Tree Trunks + Foliage Cones (2 draw calls total for all trees)
  if (treePositions.length > 0) {
    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.22, 1.8, 7),
      new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.9 }),
      treePositions.length
    );
    const leafMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.15, 2.8, 7),
      new THREE.MeshStandardMaterial({ color: 0x1e443b, roughness: 0.85 }),
      treePositions.length
    );
    trunkMesh.castShadow = true;
    leafMesh.castShadow = true;

    treePositions.forEach(([x, y, z, scale], i) => {
      dummy.position.set(x, y + 0.9 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, i * 1.1, 0);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.5 * scale, z);
      dummy.updateMatrix();
      leafMesh.setMatrixAt(i, dummy.matrix);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.matrixAutoUpdate = false;
    leafMesh.matrixAutoUpdate = false;
    levelGroup.add(trunkMesh, leafMesh);
  }

  // Instanced Decorative Stones
  if (rockPositions.length > 0) {
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({ color: 0x454a59, roughness: 0.92 }),
      rockPositions.length
    );
    rockPositions.forEach(([x, y, z, scale], i) => {
      dummy.position.set(x, y + 0.22 * scale, z);
      dummy.scale.set(scale * 1.3, scale * 0.65, scale);
      dummy.rotation.set(i * 0.4, i * 1.3, i * 0.2);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(i, dummy.matrix);
    });
    rockMesh.instanceMatrix.needsUpdate = true;
    rockMesh.matrixAutoUpdate = false;
    levelGroup.add(rockMesh);
  }
}
