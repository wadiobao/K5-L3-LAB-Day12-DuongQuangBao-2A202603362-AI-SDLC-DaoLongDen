/**
 * @file visuals.ts
 * @description Ultra-detailed procedural 3D character rig, Vietnamese bamboo/areca/pine foliage,
 * floating island underside cliffs, central stone courtyards, and animated pagoda lanterns.
 */

import * as THREE from 'three';
import { ProceduralTextures } from './textures.js';

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
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  backFlap: THREE.Mesh;
  hairBraidL: THREE.Mesh;
  hairBraidR: THREE.Mesh;
  scarfSegsL: THREE.Mesh[];
  scarfSegsR: THREE.Mesh[];
  hatGroup: THREE.Group;
  miniLanternPivot: THREE.Group;
  miniLanternMat: THREE.MeshStandardMaterial;
  miniHalo: THREE.Sprite;
  pouchMat: THREE.MeshStandardMaterial;
  hatLight: THREE.PointLight;
  charmAura: THREE.Mesh;
  dashRings: THREE.Mesh[];
  groundShadow: THREE.Mesh;
}

/**
 * Builds a richly detailed, multi-jointed Mây character rig with traditional Áo Tứ Thân tunic,
 * woven Nón Lá + red chin strap, hanging mini lantern, 3-segment flowing scarf, braids, and mote pouch.
 */
export function createPlayerRig(textures: ProceduralTextures): PlayerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const robeMat = new THREE.MeshStandardMaterial({ color: COLORS.mayRobe, roughness: 0.72 });
  const robeInnerMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb6, roughness: 0.78 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, roughness: 0.55 });
  const goldMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.35, metalness: 0.52 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.5 });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf59a9a, transparent: true, opacity: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x221c2c, roughness: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.85 });

  // Articulated Legs with Shoes (pivots at hips y = 0.48)
  const makeLeg = (xOffset: number): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, 0.48, 0);
    const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.085, 0.42, 10), darkMat);
    pant.position.y = -0.21;
    pant.castShadow = true;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.24), shoeMat);
    shoe.position.set(0, -0.43, 0.05);
    legGroup.add(pant, shoe);
    return legGroup;
  };
  const leftLeg = makeLeg(0.14);
  const rightLeg = makeLeg(-0.14);
  bodyGroup.add(leftLeg, rightLeg);

  // Layered Traditional Tunic + Gold Collar/Hem Trim + Flowing Back Flap
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, 0.82, 18), robeMat);
  torso.position.y = 0.8;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const frontBib = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.55, 0.08), robeInnerMat);
  frontBib.position.set(0, 0.78, 0.25);
  bodyGroup.add(frontBib);

  const hemTrim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.032, 8, 24), goldMat);
  hemTrim.rotation.x = Math.PI / 2;
  hemTrim.position.y = 0.4;
  bodyGroup.add(hemTrim);

  // Animated Flowing Back Robe Flap
  const flapGeo = new THREE.BoxGeometry(0.46, 0.46, 0.05);
  flapGeo.translate(0, -0.23, 0);
  const backFlap = new THREE.Mesh(flapGeo, robeMat);
  backFlap.position.set(0, 0.7, -0.32);
  bodyGroup.add(backFlap);

  // Waist Sash (#C8102E) + Glowing Mote Pouch on hip
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.13, 18), scarfMat);
  sash.position.y = 0.7;
  bodyGroup.add(sash);

  const pouchMat = new THREE.MeshStandardMaterial({
    color: COLORS.sand,
    emissive: COLORS.lanternLit,
    emissiveIntensity: 0.15,
    roughness: 0.6
  });
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), pouchMat);
  pouch.scale.set(0.85, 1.15, 0.85);
  pouch.position.set(0.34, 0.62, 0.05);
  bodyGroup.add(pouch);

  // Articulated Wide-Sleeve Arms + Hands
  const makeArm = (xOffset: number): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(xOffset, 1.1, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.44, 10), robeMat);
    sleeve.position.y = -0.2;
    sleeve.castShadow = true;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.02, 6, 12), goldMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.41;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), skinMat);
    hand.position.y = -0.46;
    armGroup.add(sleeve, cuff, hand);
    return armGroup;
  };
  const leftArm = makeArm(0.32);
  const rightArm = makeArm(-0.32);
  bodyGroup.add(leftArm, rightArm);

  // Scarf Collar & 3-Segment Flowing Silk Tails (wave physics!)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.075, 10, 20), scarfMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.2;
  bodyGroup.add(collar);

  const buildScarfChain = (xOff: number): THREE.Mesh[] => {
    const segs: THREE.Mesh[] = [];
    let parent: THREE.Object3D = bodyGroup;
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BoxGeometry(0.14 - i * 0.015, 0.035, 0.25);
      geo.translate(0, 0, -0.125);
      const seg = new THREE.Mesh(geo, scarfMat);
      if (i === 0) seg.position.set(xOff, 1.17, -0.22);
      else seg.position.set(0, 0, -0.23);
      parent.add(seg);
      parent = seg;
      segs.push(seg);
    }
    return segs;
  };
  const scarfSegsL = buildScarfChain(0.11);
  const scarfSegsR = buildScarfChain(-0.11);

  // Head + Expressive Eyes (with highlights) + Soft Blush + Hair & Twin Braids
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.255, 18, 18), skinMat);
  head.position.y = 1.4;
  head.castShadow = true;
  bodyGroup.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.262, 16, 14), darkMat);
  hairCap.position.set(0, 1.43, -0.05);
  bodyGroup.add(hairCap);

  const braidGeo = new THREE.CylinderGeometry(0.055, 0.035, 0.36, 8);
  braidGeo.translate(0, -0.18, 0);
  const hairBraidL = new THREE.Mesh(braidGeo, darkMat);
  hairBraidL.position.set(0.2, 1.38, -0.1);
  const hairBraidR = new THREE.Mesh(braidGeo, darkMat);
  hairBraidR.position.set(-0.2, 1.38, -0.1);
  // Small red hair ribbons on braids
  const ribL = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), scarfMat);
  ribL.position.y = -0.32;
  hairBraidL.add(ribL);
  const ribR = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), scarfMat);
  ribR.position.y = -0.32;
  hairBraidR.add(ribR);
  bodyGroup.add(hairBraidL, hairBraidR);

  const eyeGeo = new THREE.SphereGeometry(0.036, 8, 8);
  const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sparkleGeo = new THREE.SphereGeometry(0.013, 6, 6);
  for (const sx of [0.092, -0.092]) {
    const eye = new THREE.Mesh(eyeGeo, darkMat);
    eye.position.set(sx, 1.41, 0.225);
    const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
    sparkle.position.set(sx + 0.01, 1.422, 0.255);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), blushMat);
    blush.position.set(sx * 1.45, 1.355, 0.215);
    blush.rotation.y = sx > 0 ? 0.45 : -0.45;
    bodyGroup.add(eye, sparkle, blush);
  }

  // Woven Nón Lá + Gold Rim + Red Silk Chin Strap + Hanging Mini Lantern
  const hatGroup = new THREE.Group();
  hatGroup.position.y = 1.65;
  bodyGroup.add(hatGroup);

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 0.46, 30),
    new THREE.MeshStandardMaterial({ map: textures.nonLaMap, roughness: 0.84, side: THREE.DoubleSide })
  );
  hat.castShadow = true;
  hatGroup.add(hat);

  const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.03, 8, 30), goldMat);
  hatRim.rotation.x = Math.PI / 2;
  hatRim.position.y = -0.22;
  hatGroup.add(hatRim);

  const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.11, 12), goldMat);
  hatTop.position.y = 0.24;
  hatGroup.add(hatTop);

  // Red silk chin strap looping under chin
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 6, 16, Math.PI), scarfMat);
  strap.rotation.z = Math.PI;
  strap.position.set(0, -0.2, 0.04);
  hatGroup.add(strap);

  // Hanging Mini Lantern with pendulum pivot
  const miniLanternPivot = new THREE.Group();
  miniLanternPivot.position.set(-0.5, -0.21, 0.5);
  hatGroup.add(miniLanternPivot);

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), goldMat);
  cord.position.y = -0.12;
  miniLanternPivot.add(cord);

  const miniLanternMat = new THREE.MeshStandardMaterial({
    color: COLORS.lanternCore,
    emissive: COLORS.lanternLit,
    emissiveIntensity: 1.5
  });
  const miniLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.2, 6), miniLanternMat);
  miniLamp.position.y = -0.3;
  miniLanternPivot.add(miniLamp);

  const miniCap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.08, 6), goldMat);
  miniCap.position.y = -0.18;
  miniLanternPivot.add(miniCap);

  const miniTassel = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.16, 6), scarfMat);
  miniTassel.position.y = -0.47;
  miniLanternPivot.add(miniTassel);

  const miniHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowSpriteMap,
      color: COLORS.lanternLit,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  miniHalo.position.y = -0.3;
  miniHalo.scale.set(1.15, 1.15, 1);
  miniLanternPivot.add(miniHalo);

  const hatLight = new THREE.PointLight(COLORS.lanternLit, 1.7, 9.5);
  hatLight.position.y = -0.3;
  miniLanternPivot.add(hatLight);

  // Wind Charm Aura Ring
  const charmAura = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 0.92, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.mayScarf, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  charmAura.rotation.x = -Math.PI / 2;
  charmAura.position.y = 0.06;
  charmAura.visible = false;
  root.add(charmAura);

  // 3 Trailing Dash Wind Rings
  const dashRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(0.55 + i * 0.12, 0.045, 8, 24),
      new THREE.MeshBasicMaterial({ color: COLORS.gold, transparent: true, opacity: 0.85 - i * 0.22 })
    );
    r.position.set(0, 0.92, -0.35 - i * 0.42);
    r.visible = false;
    dashRings.push(r);
    root.add(r);
  }

  // Contact Ground Shadow Blob (helps depth perception during jumps & jump pads)
  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 20),
    new THREE.MeshBasicMaterial({ color: 0x050610, transparent: true, opacity: 0.45, depthWrite: false })
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.03;

  return {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    backFlap,
    hairBraidL,
    hairBraidR,
    scarfSegsL,
    scarfSegsR,
    hatGroup,
    miniLanternPivot,
    miniLanternMat,
    miniHalo,
    pouchMat,
    hatLight,
    charmAura,
    dashRings,
    groundShadow
  };
}

export interface LanternVisual {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  tearGroup: THREE.Group;
  tassels: THREE.Mesh[];
  glowHalo: THREE.Sprite;
  light: THREE.PointLight;
  safeRing: THREE.Mesh;
  fuelBarGroup: THREE.Group;
  fuelBarFill: THREE.Mesh;
  fuelBarMat: THREE.MeshBasicMaterial;
}

/**
 * Builds an ornate Vietnamese Pagoda Great Lantern with textured rice paper, double curved eaves,
 * swaying red silk tassels, volumetric glow sprite, 3D fuel bar, and 6m safe zone ring.
 */
export function createLanternVisual(pos: [number, number, number], textures: ProceduralTextures): LanternVisual {
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1], pos[2]);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4b4f5e, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodMap,
    bumpMap: textures.woodBump,
    bumpScale: 0.08,
    roughness: 0.78
  });
  const lacquerMat = new THREE.MeshStandardMaterial({ color: 0x8f1d24, roughness: 0.52 });
  const goldMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.35, metalness: 0.55 });

  // Stepped Octagonal Stone Pedestal
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.18, 0.32, 8), stoneMat);
  base1.position.y = 0.16;
  base1.receiveShadow = true;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.88, 0.28, 8), stoneMat);
  base2.position.y = 0.44;
  base2.receiveShadow = true;
  group.add(base1, base2);

  // Carved Wooden Pillar with Gold Collar Bands
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 2.85, 12), woodMat);
  pillar.position.y = 1.98;
  pillar.castShadow = true;
  group.add(pillar);

  for (const bandY of [0.85, 3.15]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.042, 8, 16), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = bandY;
    group.add(band);
  }

  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.54, 0.26, 6), woodMat);
  tray.position.y = 3.4;
  group.add(tray);

  // Textured Hexagonal Paper Lantern Core
  const coreMat = new THREE.MeshStandardMaterial({
    map: textures.lanternTornMap,
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.35
  });
  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.52, 1.12, 6), coreMat);
  coreMesh.position.y = 4.04;
  coreMesh.scale.set(1, 0.8, 1);
  group.add(coreMesh);

  // 3D dark tear slashes visible when unlit
  const tearGroup = new THREE.Group();
  tearGroup.position.y = 4.04;
  const tearMat = new THREE.MeshBasicMaterial({ color: 0x120a1a });
  const tear1 = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.08, 0.14), tearMat);
  tear1.rotation.z = 0.45;
  const tear2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.26), tearMat);
  tear2.rotation.x = -0.4;
  tearGroup.add(tear1, tear2);
  group.add(tearGroup);

  // Curved Pagoda Roof
  const roofPts = [
    new THREE.Vector2(0.01, 0.88),
    new THREE.Vector2(0.34, 0.54),
    new THREE.Vector2(0.8, 0.22),
    new THREE.Vector2(1.3, 0.02),
    new THREE.Vector2(1.42, 0.14)
  ];
  const roof = new THREE.Mesh(new THREE.LatheGeometry(roofPts, 6), woodMat);
  roof.position.y = 4.58;
  roof.castShadow = true;
  group.add(roof);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), goldMat);
  finial.position.y = 5.58;
  group.add(finial);

  // 4 Swaying Red Silk Tassels
  const tassels: THREE.Mesh[] = [];
  const tasselGeo = new THREE.ConeGeometry(0.055, 0.44, 6);
  tasselGeo.translate(0, -0.22, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const t = new THREE.Mesh(tasselGeo, lacquerMat);
    t.position.set(Math.cos(a) * 1.15, 4.64, Math.sin(a) * 1.15);
    tassels.push(t);
    group.add(t);
  }

  const glowHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowSpriteMap,
      color: COLORS.lanternLit,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glowHalo.position.y = 4.05;
  glowHalo.scale.set(5.6, 5.6, 1);
  group.add(glowHalo);

  const light = new THREE.PointLight(COLORS.lanternLit, 0, 22);
  light.position.y = 4.05;
  group.add(light);

  // 3D Fuel Bar
  const fuelBarGroup = new THREE.Group();
  fuelBarGroup.position.y = 6.18;
  fuelBarGroup.visible = false;
  const fuelBg = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.24, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x0e1430 })
  );
  const fuelBarMat = new THREE.MeshBasicMaterial({ color: COLORS.lanternLit });
  const fuelBarFill = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.15, 0.1), fuelBarMat);
  fuelBarGroup.add(fuelBg, fuelBarFill);
  group.add(fuelBarGroup);

  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(5.82, 6.08, 56),
    new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, side: THREE.DoubleSide, transparent: true, opacity: 0.36 })
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.06;
  safeRing.visible = false;
  group.add(safeRing);

  group.matrixAutoUpdate = false;
  group.updateMatrix();

  return { group, coreMesh, coreMat, tearGroup, tassels, glowHalo, light, safeRing, fuelBarGroup, fuelBarFill, fuelBarMat };
}

export interface ShadeVisual {
  root: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshBasicMaterial;
  auraSprite: THREE.Sprite;
  tendrils: THREE.Mesh[];
  eyes: THREE.Mesh[];
  drainBeam: THREE.Mesh;
  drainBeamMat: THREE.MeshBasicMaterial;
}

/**
 * Builds an articulated Ink Shade with glowing rim aura, 6 writhing tendrils, eyes, and a Fuel Drain Beam.
 */
export function createShadeVisual(textures: ProceduralTextures): ShadeVisual {
  const root = new THREE.Group();
  root.visible = false;

  const coreMat = new THREE.MeshStandardMaterial({
    color: COLORS.shadeBody,
    emissive: COLORS.shadeRim,
    emissiveIntensity: 0.85,
    roughness: 0.22
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 1), coreMat);
  core.castShadow = true;
  root.add(core);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe6d4ff });
  const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.24, 0.15, 0.58);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(-0.24, 0.15, 0.58);
  root.add(eyeL, eyeR);

  const auraSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowSpriteMap,
      color: COLORS.shadeRim,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  auraSprite.scale.set(2.8, 2.8, 1);
  root.add(auraSprite);

  const tendrils: THREE.Mesh[] = [];
  const tendrilGeo = new THREE.ConeGeometry(0.18, 0.92, 6);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(tendrilGeo, coreMat);
    const angle = (i / 6) * Math.PI * 2;
    t.position.set(Math.cos(angle) * 0.54, -0.38, Math.sin(angle) * 0.54);
    t.rotation.x = Math.PI;
    tendrils.push(t);
    root.add(t);
  }

  const beamGeo = new THREE.CylinderGeometry(0.08, 0.18, 1.0, 8, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  const drainBeamMat = new THREE.MeshBasicMaterial({
    color: COLORS.shadeRim,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const drainBeam = new THREE.Mesh(beamGeo, drainBeamMat);
  drainBeam.visible = false;

  return { root, coreMat, eyeMat, auraSprite, tendrils, eyes: [eyeL, eyeR], drainBeam, drainBeamMat };
}

export interface DrifterVisual {
  root: THREE.Group;
  segments: THREE.Mesh[];
}

/**
 * Builds a 6-segment undulating silk ribbon with mist halo for Gió Lạc (Drifter).
 */
export function createDrifterVisual(textures: ProceduralTextures): DrifterVisual {
  const root = new THREE.Group();
  root.visible = false;

  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.drifter,
    emissive: COLORS.drifter,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  const segments: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const width = 0.52 - i * 0.06;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, 0.4), mat);
    seg.position.set(0, 0, -i * 0.36);
    segments.push(seg);
    root.add(seg);
  }

  const mist = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowSpriteMap,
      color: COLORS.drifter,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mist.scale.set(2.2, 2.2, 1);
  root.add(mist);

  return { root, segments };
}

/**
 * Builds a floating Wind Charm talisman with glowing gold halo.
 */
export function createCharmVisual(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();
  group.visible = false;

  const talisman = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.9, 0.08),
    new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, emissive: COLORS.mayScarf, emissiveIntensity: 0.7 })
  );
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.98, 0.04),
    new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.85 })
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.035, 8, 28),
    new THREE.MeshBasicMaterial({ color: COLORS.gold })
  );
  halo.rotation.x = Math.PI / 3;

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowSpriteMap,
      color: COLORS.gold,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glow.scale.set(2.2, 2.2, 1);

  group.add(trim, talisman, halo, glow);
  return group;
}

export interface PulseVfx {
  ring: THREE.Mesh;
  dome: THREE.Mesh;
  active: boolean;
  progress: number;
}

export function createPulseVfx(): PulseVfx {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.84, 1.0, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 24, 16),
    new THREE.MeshBasicMaterial({
      color: COLORS.moteGlow,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  dome.visible = false;

  return { ring, dome, active: false, progress: 0 };
}

export interface IslandDecorResult {
  boatGroup: THREE.Group | null;
  floatingRocks: THREE.Mesh[];
  swayFoliageGroups: THREE.Group[];
}

/**
 * Adds rich island terrain details, floating underside boulders, central stone medallion,
 * Vietnamese bamboo groves, detailed multi-frond Areca palms, 3-tier pines, grass tufts,
 * night-blooming flowers, and Night-specific wooden pier / suspension bridge gates.
 */
export function addIslandDecorations(
  levelGroup: THREE.Group,
  night: number,
  avoidPositions: Array<[number, number, number]>,
  lanternPositions: Array<[number, number, number]>,
  textures: ProceduralTextures
): IslandDecorResult {
  let boatGroup: THREE.Group | null = null;
  const floatingRocks: THREE.Mesh[] = [];
  const swayFoliageGroups: THREE.Group[] = [];
  const dummy = new THREE.Object3D();

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodMap,
    bumpMap: textures.woodBump,
    bumpScale: 0.06,
    roughness: 0.82
  });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3a6f59, roughness: 0.65 });
  const bambooLeafMat = new THREE.MeshStandardMaterial({ color: 0x2c634f, roughness: 0.8, side: THREE.DoubleSide });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4f5568, roughness: 0.9 });
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x2c3245, roughness: 0.94 });
  const goldMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.4, metalness: 0.45 });
  const warmPostLightMat = new THREE.MeshBasicMaterial({ color: COLORS.lanternCore });

  // 1. Central Carved Stone Courtyard Medallion at (0,0,0) (and Island B (70,0,0) in Night 2)
  const centers = night === 2 ? [0, 70] : [0];
  for (const cx of centers) {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.1, 0.1, 16), stoneMat);
    plaza.position.set(cx, 0.03, 0);
    plaza.receiveShadow = true;
    plaza.matrixAutoUpdate = false;
    plaza.updateMatrix();
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.75, 24), goldMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, 0.09, 0);
    ring.matrixAutoUpdate = false;
    ring.updateMatrix();
    levelGroup.add(plaza, ring);
  }

  // 2. Floating Island Underside Rocky Spires & Orbiting Floating Cliff Pebbles
  const spireSpecs =
    night === 1
      ? [{ x: 0, z: 0, r: 35, h: 14 }]
      : night === 2
        ? [
            { x: 0, z: 0, r: 24, h: 12 },
            { x: 70, z: 0, r: 24, h: 12 }
          ]
        : [{ x: 0, z: 0, r: 40, h: 16 }];

  for (const sp of spireSpecs) {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 12), cliffMat);
    spire.rotation.x = Math.PI;
    spire.position.set(sp.x, -4.8 - sp.h * 0.5, sp.z);
    spire.matrixAutoUpdate = false;
    spire.updateMatrix();
    levelGroup.add(spire);

    // 6 orbiting floating rock fragments around the island's outer edge
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.4;
      const dist = sp.r + 7 + (k % 3) * 3;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + (k % 3) * 0.45, 0), cliffMat);
      rock.position.set(sp.x + Math.cos(a) * dist, -3.5 - (k % 3) * 1.4, sp.z + Math.sin(a) * dist);
      rock.userData.baseY = rock.position.y;
      rock.userData.phase = k * 1.3;
      floatingRocks.push(rock);
      levelGroup.add(rock);
    }
  }

  // 3. Stepping Stone Pathways radiating toward lanterns
  const stepPositions: Array<[number, number, number]> = [];
  for (const lp of lanternPositions) {
    if (lp[1] > 0.5) continue;
    const originX = night === 2 && lp[0] > 35 ? 70 : 0;
    for (let s = 1; s < 7; s++) {
      const t = s / 7;
      stepPositions.push([originX + (lp[0] - originX) * t, 0.03, lp[2] * t]);
    }
  }
  if (stepPositions.length > 0) {
    const stepMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.68, 0.74, 0.08, 7), stoneMat, stepPositions.length);
    stepMesh.receiveShadow = true;
    stepPositions.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.scale.set(1, 1, 0.85);
      dummy.updateMatrix();
      stepMesh.setMatrixAt(i, dummy.matrix);
    });
    stepMesh.instanceMatrix.needsUpdate = true;
    stepMesh.matrixAutoUpdate = false;
    levelGroup.add(stepMesh);
  }

  // 4. Night-specific Landmarks
  if (night === 1) {
    // Wooden Pier with Torii-style Entrance Gate, Barrels, & Bobbing Sampan Boat
    const pierGroup = new THREE.Group();
    for (let z = -38.5; z >= -46.2; z -= 0.85) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 0.7), woodMat);
      plank.position.set(0, 0.06, z);
      plank.receiveShadow = true;
      pierGroup.add(plank);
    }
    // Pier Entrance Arch
    for (const px of [-2.1, 2.1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 3.6, 8), woodMat);
      col.position.set(px, 1.8, -38.8);
      pierGroup.add(col);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 0.35), woodMat);
    crossBeam.position.set(0, 3.45, -38.8);
    pierGroup.add(crossBeam);

    // Dock posts + lanterns + wooden barrel
    for (const px of [-2.0, 2.0]) {
      for (const pz of [-42, -46]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.2, 8), woodMat);
        post.position.set(px, 0.4, pz);
        pierGroup.add(post);
        if (pz === -46) {
          const miniGlow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), warmPostLightMat);
          miniGlow.position.set(px, 1.65, pz);
          pierGroup.add(miniGlow);
        }
      }
    }
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.35, 0.72, 10), woodMat);
    barrel.position.set(-1.45, 0.5, -40.5);
    pierGroup.add(barrel);

    pierGroup.matrixAutoUpdate = false;
    pierGroup.updateMatrix();
    levelGroup.add(pierGroup);

    // Bobbing Sampan Boat with Oar & Bow Lantern
    boatGroup = new THREE.Group();
    boatGroup.position.set(4.8, -1.6, -45.8);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.58, 5.4, 10), woodMat);
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1.25, 1.0, 0.52);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.4), woodMat);
    bench.position.set(0, 0.25, 0);
    const bowStick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), woodMat);
    bowStick.position.set(0, 0.4, 2.35);
    const bowLight = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), warmPostLightMat);
    bowLight.position.set(0, 0.92, 2.35);
    boatGroup.add(hull, bench, bowStick, bowLight);
    levelGroup.add(boatGroup);
  } else if (night === 2) {
    // Bridge Entrance Gates + Lantern Posts + Side Rope Railings (decorative outside walkable strip)
    for (const gx of [26.2, 43.8]) {
      for (const gz of [-2.15, 2.15]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 8), woodMat);
        col.position.set(gx, 1.5, gz);
        col.matrixAutoUpdate = false;
        col.updateMatrix();
        levelGroup.add(col);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 4.9), woodMat);
      lintel.position.set(gx, 3.05, 0);
      lintel.matrixAutoUpdate = false;
      lintel.updateMatrix();
      levelGroup.add(lintel);
    }
    for (const bx of [30, 35, 40]) {
      for (const bz of [-2.02, 2.02]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.6, 8), woodMat);
        post.position.set(bx, 0.7, bz);
        post.matrixAutoUpdate = false;
        post.updateMatrix();
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), warmPostLightMat);
        bulb.position.set(bx, 1.6, bz);
        bulb.matrixAutoUpdate = false;
        bulb.updateMatrix();
        levelGroup.add(post, bulb);
      }
    }
  } else if (night === 3) {
    // Decorative Lantern Posts along both inclined ramps (30° and 150°)
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const perpX = -Math.sin(rad) * 1.85;
      const perpZ = Math.cos(rad) * 1.85;
      for (const distR of [30.2, 27.0, 24.0]) {
        const baseH = Math.max(0, (30 - distR) * 0.5);
        for (const side of [-1, 1]) {
          const rx = Math.cos(rad) * distR + perpX * side;
          const rz = Math.sin(rad) * distR + perpZ * side;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.7, 8), stoneMat);
          post.position.set(rx, baseH + 0.85, rz);
          post.matrixAutoUpdate = false;
          post.updateMatrix();
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), warmPostLightMat);
          bulb.position.set(rx, baseH + 1.8, rz);
          bulb.matrixAutoUpdate = false;
          bulb.updateMatrix();
          levelGroup.add(post, bulb);
        }
      }
    }
  }

  // 5. Detailed Swaying Trees, Bamboo Groves, Areca Palms, Grass Tufts & Night Flowers
  const isSafeSpot = (x: number, z: number) => {
    if (Math.sqrt(x * x + z * z) < 5.8) return false;
    if (night === 1 && Math.abs(x) < 4.8 && z < -34) return false;
    if (night === 2 && x > 22 && x < 48 && Math.abs(z) < 5.5) return false;
    for (const p of avoidPositions) {
      const dx = x - p[0];
      const dz = z - p[2];
      if (dx * dx + dz * dz < 19) return false;
    }
    return true;
  };

  let s = night * 2026 + 137;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const treePositions: Array<[number, number, number, number]> = [];
  const bambooPositions: Array<[number, number, number, number]> = [];
  const rockPositions: Array<[number, number, number, number]> = [];
  const tuftPositions: Array<[number, number, number, number]> = [];
  const flowerPositions: Array<[number, number, number]> = [];

  const scatterOnDisk = (cx: number, rMin: number, rMax: number, treeN: number, bambooN: number, rockN: number, tuftN: number) => {
    for (let i = 0; i < treeN; i++) {
      const a = rand() * Math.PI * 2;
      const r = rMin + rand() * (rMax - rMin);
      const x = cx + Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) treePositions.push([x, 0, z, 0.85 + rand() * 0.65]);
    }
    for (let i = 0; i < bambooN; i++) {
      const a = rand() * Math.PI * 2;
      const r = rMin + rand() * (rMax - rMin);
      const x = cx + Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) bambooPositions.push([x, 0, z, 0.85 + rand() * 0.55]);
    }
    for (let i = 0; i < rockN; i++) {
      const a = rand() * Math.PI * 2;
      const r = 7 + rand() * (rMax - 7);
      const x = cx + Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) rockPositions.push([x, 0, z, 0.45 + rand() * 0.65]);
    }
    for (let i = 0; i < tuftN; i++) {
      const a = rand() * Math.PI * 2;
      const r = 5 + rand() * (rMax - 4);
      const x = cx + Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isSafeSpot(x, z)) {
        tuftPositions.push([x, 0, z, 0.65 + rand() * 0.7]);
        if (i % 3 === 0) flowerPositions.push([x + 0.25, 0.22, z + 0.2]);
      }
    }
  };

  if (night === 1) {
    scatterOnDisk(0, 15, 37, 22, 12, 26, 95);
  } else if (night === 2) {
    scatterOnDisk(0, 11, 25.5, 14, 6, 12, 50);
    scatterOnDisk(70, 11, 25.5, 14, 6, 12, 50);
  } else if (night === 3) {
    scatterOnDisk(0, 27, 42, 22, 10, 22, 90);
  }

  // Build Hero Swaying Trees (Areca Palms with 6 curved fronds on Night 2, 3-Tier Pines on Nights 1 & 3)
  const palmFrondGeo = new THREE.BoxGeometry(0.32, 0.05, 2.2);
  palmFrondGeo.translate(0, 0, 1.1);
  const pineLowMat = new THREE.MeshStandardMaterial({ color: 0x1a3e35, roughness: 0.86 });
  const pineMidMat = new THREE.MeshStandardMaterial({ color: 0x245246, roughness: 0.84 });
  const pineTopMat = new THREE.MeshStandardMaterial({ color: 0x2f6657, roughness: 0.82 });

  if (night === 2) {
    // Detailed Curved Multi-Frond Areca Palms (Cây Cau)
    for (let i = 0; i < treePositions.length; i++) {
      const [x, y, z, scale] = treePositions[i];
      const palm = new THREE.Group();
      palm.position.set(x, y, z);
      palm.scale.setScalar(scale);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.19, 5.4, 8), woodMat);
      trunk.position.y = 2.7;
      trunk.rotation.z = 0.05;
      trunk.castShadow = true;
      palm.add(trunk);

      // Coconut / Areca nut cluster
      const nuts = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x4b7040 }));
      nuts.position.set(0.14, 5.15, 0);
      palm.add(nuts);

      // 6 Arched Palm Fronds
      const crown = new THREE.Group();
      crown.position.set(0.14, 5.38, 0);
      for (let f = 0; f < 6; f++) {
        const frond = new THREE.Mesh(palmFrondGeo, bambooLeafMat);
        frond.rotation.y = (f / 6) * Math.PI * 2 + i * 0.4;
        frond.rotation.x = 0.42;
        crown.add(frond);
      }
      palm.add(crown);
      palm.userData.phase = i * 0.9;
      swayFoliageGroups.push(palm);
      levelGroup.add(palm);
    }
  } else {
    // 3-Tier Lush Night Pines with Sway Animation
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.26, 2.0, 7);
    const tier1Geo = new THREE.ConeGeometry(1.5, 2.0, 8);
    const tier2Geo = new THREE.ConeGeometry(1.18, 1.9, 8);
    const tier3Geo = new THREE.ConeGeometry(0.8, 1.7, 8);

    for (let i = 0; i < treePositions.length; i++) {
      const [x, y, z, scale] = treePositions[i];
      const tree = new THREE.Group();
      tree.position.set(x, y, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(trunkGeo, woodMat);
      trunk.position.y = 1.0;
      trunk.castShadow = true;
      const t1 = new THREE.Mesh(tier1Geo, pineLowMat);
      t1.position.y = 2.15;
      t1.castShadow = true;
      const t2 = new THREE.Mesh(tier2Geo, pineMidMat);
      t2.position.y = 3.25;
      t2.castShadow = true;
      const t3 = new THREE.Mesh(tier3Geo, pineTopMat);
      t3.position.y = 4.25;
      t3.castShadow = true;
      tree.add(trunk, t1, t2, t3);

      tree.userData.phase = i * 1.1;
      swayFoliageGroups.push(tree);
      levelGroup.add(tree);
    }
  }

  // Vietnamese Bamboo Groves (multi-stalk curved bamboo clusters with sway)
  const stalkGeo = new THREE.CylinderGeometry(0.055, 0.075, 4.4, 6);
  stalkGeo.translate(0, 2.2, 0);
  const leafClusterGeo = new THREE.ConeGeometry(0.65, 1.1, 5);
  for (let i = 0; i < bambooPositions.length; i++) {
    const [x, y, z, scale] = bambooPositions[i];
    const grove = new THREE.Group();
    grove.position.set(x, y, z);
    grove.scale.setScalar(scale);

    for (let b = 0; b < 3; b++) {
      const a = (b / 3) * Math.PI * 2 + i;
      const stalk = new THREE.Mesh(stalkGeo, bambooMat);
      stalk.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
      stalk.rotation.z = (b - 1) * 0.1;
      stalk.rotation.x = Math.sin(a) * 0.08;
      stalk.castShadow = true;

      const foliage = new THREE.Mesh(leafClusterGeo, bambooLeafMat);
      foliage.position.y = 4.2;
      stalk.add(foliage);
      grove.add(stalk);
    }
    grove.userData.phase = i * 1.7 + 0.5;
    swayFoliageGroups.push(grove);
    levelGroup.add(grove);
  }

  // Instanced Grass Tufts (1 draw call)
  if (tuftPositions.length > 0) {
    const tuftMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.28, 0.55, 5),
      new THREE.MeshStandardMaterial({ color: 0x356c5b, roughness: 0.9 }),
      tuftPositions.length
    );
    tuftPositions.forEach(([x, y, z, scale], i) => {
      dummy.position.set(x, y + 0.25 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0.1, i * 1.3, 0.08);
      dummy.updateMatrix();
      tuftMesh.setMatrixAt(i, dummy.matrix);
    });
    tuftMesh.instanceMatrix.needsUpdate = true;
    tuftMesh.matrixAutoUpdate = false;
    levelGroup.add(tuftMesh);
  }

  // Instanced Soft Glowing Night Blossoms (1 draw call)
  if (flowerPositions.length > 0) {
    const flowerMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshBasicMaterial({ color: COLORS.moteGlow }),
      flowerPositions.length
    );
    flowerPositions.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(1, 0.7, 1);
      dummy.rotation.set(0, i * 0.8, 0);
      dummy.updateMatrix();
      flowerMesh.setMatrixAt(i, dummy.matrix);
    });
    flowerMesh.instanceMatrix.needsUpdate = true;
    flowerMesh.matrixAutoUpdate = false;
    levelGroup.add(flowerMesh);
  }

  // Instanced Mossy Boulders (1 draw call)
  if (rockPositions.length > 0) {
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      stoneMat,
      rockPositions.length
    );
    rockPositions.forEach(([x, y, z, scale], i) => {
      dummy.position.set(x, y + 0.22 * scale, z);
      dummy.scale.set(scale * 1.35, scale * 0.65, scale);
      dummy.rotation.set(i * 0.4, i * 1.3, i * 0.2);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(i, dummy.matrix);
    });
    rockMesh.instanceMatrix.needsUpdate = true;
    rockMesh.matrixAutoUpdate = false;
    levelGroup.add(rockMesh);
  }

  return { boatGroup, floatingRocks, swayFoliageGroups };
}
