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
  katanaScabbard: THREE.Group;
  katanaSheathedHilt: THREE.Group;
  katanaDrawn: THREE.Group;
  katanaBladeGlowMat: THREE.MeshStandardMaterial;
  katanaSlashArc: THREE.Mesh;
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
  const browGeo = new THREE.BoxGeometry(0.075, 0.014, 0.014);
  for (const sx of [0.092, -0.092]) {
    const eye = new THREE.Mesh(eyeGeo, darkMat);
    eye.position.set(sx, 1.41, 0.225);
    const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
    sparkle.position.set(sx + 0.01, 1.422, 0.255);
    const brow = new THREE.Mesh(browGeo, darkMat);
    brow.position.set(sx, 1.468, 0.232);
    brow.rotation.z = sx > 0 ? -0.1 : 0.1;
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), blushMat);
    blush.position.set(sx * 1.45, 1.355, 0.215);
    blush.rotation.y = sx > 0 ? 0.45 : -0.45;
    bodyGroup.add(eye, sparkle, brow, blush);
  }

  // Ornate Shoulder Pads & Back Obi Sash Bow
  for (const sx of [0.3, -0.3]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), scarfMat);
    pad.position.set(sx, 1.13, 0);
    pad.rotation.z = sx > 0 ? -0.4 : 0.4;
    const padRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 6, 14), goldMat);
    padRim.rotation.x = Math.PI / 2;
    padRim.position.set(sx, 1.12, 0);
    bodyGroup.add(pad, padRim);
  }
  const obiKnot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.12), scarfMat);
  obiKnot.position.set(0, 0.72, -0.34);
  const obiGold = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.14), goldMat);
  obiGold.position.set(0, 0.72, -0.35);
  bodyGroup.add(obiKnot, obiGold);

  // Katana Rig: Lacquered Diagonal Back Scabbard (Saya) + Gold Tsuba + Sheathed Hilt + Drawn Glowing Blade
  const sayaMat = new THREE.MeshStandardMaterial({ color: 0x1a0b12, roughness: 0.25, metalness: 0.45 });
  const tsukaMat = new THREE.MeshStandardMaterial({ color: 0x8f1422, roughness: 0.65 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xe6eef8, roughness: 0.14, metalness: 0.92 });
  const katanaBladeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: COLORS.lanternLit,
    emissiveIntensity: 0.95,
    roughness: 0.18,
    metalness: 0.6
  });

  const katanaScabbard = new THREE.Group();
  katanaScabbard.position.set(0.04, 0.95, -0.36);
  katanaScabbard.rotation.z = -0.68; // Diagonal across back from right shoulder to left hip
  katanaScabbard.rotation.x = 0.08;

  // Slightly curved 2-part lacquered scabbard (saya) + golden end-cap (kojiri) & throat (koiguchi)
  const sayaLower = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.68, 0.09), sayaMat);
  sayaLower.position.set(0, -0.26, 0);
  sayaLower.castShadow = true;
  const sayaUpper = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.56, 0.095), sayaMat);
  sayaUpper.position.set(-0.018, 0.34, 0);
  sayaUpper.rotation.z = 0.06;
  sayaUpper.castShadow = true;
  const kojiri = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.1), goldMat);
  kojiri.position.set(0, -0.61, 0);
  const koiguchi = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.11), goldMat);
  koiguchi.position.set(-0.036, 0.62, 0);
  const sageoTie = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.022, 6, 12), scarfMat);
  sageoTie.rotation.x = Math.PI / 2;
  sageoTie.position.set(-0.015, 0.25, 0);
  katanaScabbard.add(sayaLower, sayaUpper, kojiri, koiguchi, sageoTie);

  // Sheathed Hilt (hidden briefly while blade is drawn in hand during Pulse / Dash)
  const katanaSheathedHilt = new THREE.Group();
  katanaSheathedHilt.position.set(-0.04, 0.66, 0);
  katanaSheathedHilt.rotation.z = 0.07;
  const sTsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.024, 14), goldMat);
  const sTsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.36, 8), tsukaMat);
  sTsuka.position.y = 0.19;
  const sKashira = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), goldMat);
  sKashira.position.y = 0.38;
  // Diamond wrap accents on hilt
  for (let w = 0; w < 4; w++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 4, 8), goldMat);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.y = 0.06 + w * 0.08;
    katanaSheathedHilt.add(wrap);
  }
  katanaSheathedHilt.add(sTsuba, sTsuka, sKashira);
  katanaScabbard.add(katanaSheathedHilt);
  bodyGroup.add(katanaScabbard);

  // Drawn Katana attached to Mây's right hand (appears on Dash / Pulse slash)
  const katanaDrawn = new THREE.Group();
  katanaDrawn.position.set(0, -0.45, 0.06);
  katanaDrawn.rotation.x = Math.PI / 2;
  const dTsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.32, 8), tsukaMat);
  dTsuka.position.y = -0.08;
  const dTsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.024, 14), goldMat);
  dTsuba.position.y = 0.09;
  const dBladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.68, 0.075), steelMat);
  dBladeBase.position.y = 0.44;
  const dBladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.46, 4), steelMat);
  dBladeTip.scale.set(0.32, 1, 1);
  dBladeTip.position.set(0, 1.0, -0.02);
  dBladeTip.rotation.x = -0.06;
  const dBladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.026, 1.05, 0.028), katanaBladeGlowMat);
  dBladeEdge.position.set(0, 0.62, 0.034);
  katanaDrawn.add(dTsuka, dTsuba, dBladeBase, dBladeTip, dBladeEdge);
  katanaDrawn.visible = false;
  rightArm.add(katanaDrawn);

  // Golden Crescent Katana Slash Arc VFX
  const katanaSlashArc = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.65, 28, 1, -Math.PI * 0.65, Math.PI * 1.3),
    new THREE.MeshBasicMaterial({
      color: COLORS.lanternCore,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  katanaSlashArc.rotation.x = -Math.PI / 2;
  katanaSlashArc.position.y = 0.95;
  katanaSlashArc.visible = false;
  root.add(katanaSlashArc);

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
    groundShadow,
    katanaScabbard,
    katanaSheathedHilt,
    katanaDrawn,
    katanaBladeGlowMat,
    katanaSlashArc
  };
}

export interface LanternVisual {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  flameCore: THREE.Mesh;
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
 * Builds an ornate Vietnamese Pagoda Great Lantern with carved stone lotus pedestal, decorative
 * lacquered lattice ribs, flickering 3D inner flame core, double curved eaves, swaying silk tassels
 * with gold beads, volumetric glow sprite, 3D fuel bar, and 6m safe zone ring.
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
  const lacquerMat = new THREE.MeshStandardMaterial({ color: 0x991f26, roughness: 0.48 });
  const goldMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.35, metalness: 0.58 });

  // Stepped Octagonal Carved Stone Lotus Pedestal
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.26, 0.32, 8), stoneMat);
  base1.position.y = 0.16;
  base1.receiveShadow = true;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.94, 0.3, 8), stoneMat);
  base2.position.y = 0.46;
  base2.receiveShadow = true;
  group.add(base1, base2);

  // 8 Carved Lotus Petals around pedestal crown
  const petalGeo = new THREE.ConeGeometry(0.24, 0.36, 4);
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, stoneMat);
    petal.position.set(Math.cos(a) * 0.68, 0.66, Math.sin(a) * 0.68);
    petal.rotation.y = -a;
    petal.rotation.z = -0.35;
    group.add(petal);
  }

  // Carved Wooden Pillar with Gold Collar Bands & 4 Curved Roof Consoles
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.35, 2.85, 12), woodMat);
  pillar.position.y = 1.98;
  pillar.castShadow = true;
  group.add(pillar);

  for (const bandY of [0.9, 2.0, 3.18]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.044, 8, 16), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = bandY;
    group.add(band);
  }

  for (let b = 0; b < 4; b++) {
    const a = (b / 4) * Math.PI * 2;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.12), lacquerMat);
    bracket.position.set(Math.cos(a) * 0.44, 3.22, Math.sin(a) * 0.44);
    bracket.rotation.y = -a;
    bracket.rotation.z = 0.35;
    group.add(bracket);
  }

  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.56, 0.28, 6), woodMat);
  tray.position.y = 3.42;
  const trayTrim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 6, 6), goldMat);
  trayTrim.rotation.x = Math.PI / 2;
  trayTrim.position.y = 3.55;
  group.add(tray, trayTrim);

  // Textured Hexagonal Paper Lantern Core + 6 Outer Lacquered Wood Ribs + Inner Flame Core
  const coreMat = new THREE.MeshStandardMaterial({
    map: textures.lanternTornMap,
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.32
  });
  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.54, 1.16, 6), coreMat);
  coreMesh.position.y = 4.06;
  coreMesh.scale.set(1, 0.8, 1);
  group.add(coreMesh);

  for (let r = 0; r < 6; r++) {
    const a = (r / 6) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.18, 5), lacquerMat);
    rib.position.set(Math.cos(a) * 0.62, 4.06, Math.sin(a) * 0.62);
    group.add(rib);
  }

  const flameCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 1),
    new THREE.MeshBasicMaterial({ color: 0xfff8d4 })
  );
  flameCore.position.y = 4.06;
  flameCore.visible = false;
  group.add(flameCore);

  // 3D dark tear slashes visible when unlit
  const tearGroup = new THREE.Group();
  tearGroup.position.y = 4.06;
  const tearMat = new THREE.MeshBasicMaterial({ color: 0x120a1a });
  const tear1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.14), tearMat);
  tear1.rotation.z = 0.45;
  const tear2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.3), tearMat);
  tear2.rotation.x = -0.4;
  tearGroup.add(tear1, tear2);
  group.add(tearGroup);

  // Double-Tiered Curved Pagoda Roof with Upturned Gold Eave Tips
  const roofPts = [
    new THREE.Vector2(0.01, 0.88),
    new THREE.Vector2(0.36, 0.56),
    new THREE.Vector2(0.84, 0.24),
    new THREE.Vector2(1.38, 0.02),
    new THREE.Vector2(1.52, 0.18)
  ];
  const roof = new THREE.Mesh(new THREE.LatheGeometry(roofPts, 6), lacquerMat);
  roof.position.y = 4.62;
  roof.castShadow = true;
  group.add(roof);

  const upperRoofPts = [
    new THREE.Vector2(0.01, 0.55),
    new THREE.Vector2(0.34, 0.24),
    new THREE.Vector2(0.78, 0.02),
    new THREE.Vector2(0.88, 0.12)
  ];
  const upperRoof = new THREE.Mesh(new THREE.LatheGeometry(upperRoofPts, 6), woodMat);
  upperRoof.position.y = 5.26;
  group.add(upperRoof);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
  finial.position.y = 5.95;
  group.add(finial);

  // 4 Swaying Red Silk Tassels with Gold Beads
  const tassels: THREE.Mesh[] = [];
  const tasselGeo = new THREE.ConeGeometry(0.058, 0.48, 6);
  tasselGeo.translate(0, -0.24, 0);
  const beadGeo = new THREE.SphereGeometry(0.052, 6, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const t = new THREE.Mesh(tasselGeo, lacquerMat);
    t.position.set(Math.cos(a) * 1.24, 4.7, Math.sin(a) * 1.24);
    const bead = new THREE.Mesh(beadGeo, goldMat);
    bead.position.y = -0.05;
    t.add(bead);
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
  glowHalo.position.y = 4.08;
  glowHalo.scale.set(6.2, 6.2, 1);
  group.add(glowHalo);

  const light = new THREE.PointLight(COLORS.lanternLit, 0, 22);
  light.position.y = 4.08;
  group.add(light);

  // 3D Fuel Bar
  const fuelBarGroup = new THREE.Group();
  fuelBarGroup.position.y = 6.55;
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

  return { group, coreMesh, coreMat, flameCore, tearGroup, tassels, glowHalo, light, safeRing, fuelBarGroup, fuelBarFill, fuelBarMat };
}

export interface ShadeVisual {
  root: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshBasicMaterial;
  auraSprite: THREE.Sprite;
  tendrils: THREE.Mesh[];
  orbitWisps: THREE.Mesh[];
  runeRing: THREE.Mesh;
  eyes: THREE.Mesh[];
  drainBeam: THREE.Mesh;
  drainBeamMat: THREE.MeshBasicMaterial;
}

/**
 * Builds a detailed folklore Ink Shade phantom with tattered spirit mantle, horned shadow mask,
 * piercing glowing eyes, orbiting dark ink wisps, rotating curse rune ring, 6 articulated tendrils,
 * and a pulsing Fuel Drain Beam.
 */
export function createShadeVisual(textures: ProceduralTextures): ShadeVisual {
  const root = new THREE.Group();
  root.visible = false;

  const coreMat = new THREE.MeshStandardMaterial({
    color: COLORS.shadeBody,
    emissive: COLORS.shadeRim,
    emissiveIntensity: 0.9,
    roughness: 0.2
  });
  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0x0d0716,
    emissive: 0x2a104f,
    emissiveIntensity: 0.5,
    roughness: 0.55,
    side: THREE.DoubleSide
  });
  const maskMat = new THREE.MeshStandardMaterial({
    color: 0xd9d2e9,
    emissive: 0x26143b,
    emissiveIntensity: 0.35,
    roughness: 0.35
  });

  // Main Spirit Torso & Tattered Flowing Cloak Mantle
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 1), coreMat);
  core.position.y = 0.25;
  core.castShadow = true;
  root.add(core);

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.76, 1.35, 8, 1, true), cloakMat);
  cloak.position.y = -0.32;
  root.add(cloak);

  // Folk Spirit Mask + Curved Shadow Horns
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10, -Math.PI * 0.4, Math.PI * 0.8, 0.3, Math.PI * 0.65), maskMat);
  mask.position.set(0, 0.38, 0.26);
  mask.rotation.y = Math.PI * 0.5;
  root.add(mask);

  const hornGeo = new THREE.ConeGeometry(0.09, 0.58, 6);
  for (const sx of [0.28, -0.28]) {
    const horn = new THREE.Mesh(hornGeo, coreMat);
    horn.position.set(sx, 0.85, 0.16);
    horn.rotation.z = sx > 0 ? -0.45 : 0.45;
    horn.rotation.x = 0.2;
    root.add(horn);
  }

  // Piercing Slanted Spirit Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe6d4ff });
  const eyeGeo = new THREE.BoxGeometry(0.18, 0.065, 0.08);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.18, 0.44, 0.63);
  eyeL.rotation.z = -0.24;
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(-0.18, 0.44, 0.63);
  eyeR.rotation.z = 0.24;
  root.add(eyeL, eyeR);

  // Rotating Cursed Rune Ring behind Shade
  const runeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.028, 6, 24),
    new THREE.MeshBasicMaterial({ color: COLORS.shadeRim, transparent: true, opacity: 0.68 })
  );
  runeRing.position.set(0, 0.3, -0.15);
  root.add(runeRing);

  const auraSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowSpriteMap,
      color: COLORS.shadeRim,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  auraSprite.scale.set(3.2, 3.2, 1);
  auraSprite.position.y = 0.2;
  root.add(auraSprite);

  // 6 Writhing Claw Tendrils
  const tendrils: THREE.Mesh[] = [];
  const tendrilGeo = new THREE.ConeGeometry(0.16, 1.05, 6);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(tendrilGeo, coreMat);
    const angle = (i / 6) * Math.PI * 2;
    t.position.set(Math.cos(angle) * 0.56, -0.44, Math.sin(angle) * 0.56);
    t.rotation.x = Math.PI;
    tendrils.push(t);
    root.add(t);
  }

  // 3 Orbiting Ink Wisps
  const orbitWisps: THREE.Mesh[] = [];
  const wispGeo = new THREE.OctahedronGeometry(0.13, 0);
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(wispGeo, coreMat);
    orbitWisps.push(w);
    root.add(w);
  }

  const beamGeo = new THREE.CylinderGeometry(0.08, 0.22, 1.0, 8, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  const drainBeamMat = new THREE.MeshBasicMaterial({
    color: COLORS.shadeRim,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const drainBeam = new THREE.Mesh(beamGeo, drainBeamMat);
  drainBeam.visible = false;

  return { root, coreMat, eyeMat, auraSprite, tendrils, orbitWisps, runeRing, eyes: [eyeL, eyeR], drainBeam, drainBeamMat };
}

export interface DrifterVisual {
  root: THREE.Group;
  segments: THREE.Mesh[];
}

/**
 * Builds a ghostly wind-wraith for Gió Lạc (Drifter) with carved pale mask, swirling wind halo,
 * and 6-segment undulating silk ribbon tail.
 */
export function createDrifterVisual(textures: ProceduralTextures): DrifterVisual {
  const root = new THREE.Group();
  root.visible = false;

  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.drifter,
    emissive: 0x99c2e8,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  // Ghostly Wind-Spirit Head & Mask
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), mat);
  head.scale.set(0.9, 1.15, 1.05);
  head.position.set(0, 0.08, 0.24);
  root.add(head);

  const wEyeMat = new THREE.MeshBasicMaterial({ color: 0xe8f7ff });
  for (const sx of [0.11, -0.11]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), wEyeMat);
    e.position.set(sx, 0.12, 0.5);
    root.add(e);
  }

  const swirl = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.024, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0xc2e2ff, transparent: true, opacity: 0.65 })
  );
  swirl.rotation.x = Math.PI / 2.4;
  root.add(swirl);

  const segments: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const width = 0.56 - i * 0.065;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, 0.42), mat);
    seg.position.set(0, 0, -i * 0.36);
    segments.push(seg);
    root.add(seg);
  }

  const mist = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowSpriteMap,
      color: COLORS.drifter,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mist.scale.set(2.6, 2.6, 1);
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

  // 4b. Ancient Vietnamese Pagoda Shrines (Đền Cổ Ánh Sáng) on each island
  const lacquerRedMat = new THREE.MeshStandardMaterial({ color: 0x991f26, roughness: 0.48 });
  const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x6b2024, roughness: 0.62 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2316, roughness: 0.8 });
  const shrineLanternMat = new THREE.MeshStandardMaterial({
    color: COLORS.lanternCore,
    emissive: COLORS.lanternLit,
    emissiveIntensity: 1.85,
    roughness: 0.35
  });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6b35 });

  const addVietnameseShrine = (sx: number, sy: number, sz: number, yaw: number, scale = 1.0) => {
    const shrine = new THREE.Group();
    shrine.position.set(sx, sy, sz);
    shrine.rotation.y = yaw;
    shrine.scale.setScalar(scale);

    // 3-Tier Carved Stone Foundation + Front Stairs
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.32, 5.2), stoneMat);
    f1.position.y = 0.16;
    f1.receiveShadow = true;
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.32, 4.5), stoneMat);
    f2.position.y = 0.48;
    f2.receiveShadow = true;
    const f3 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.24, 3.9), stoneMat);
    f3.position.y = 0.76;
    f3.receiveShadow = true;
    shrine.add(f1, f2, f3);

    for (let st = 0; st < 3; st++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.24, 0.45), stoneMat);
      step.position.set(0, 0.12 + st * 0.24, 2.72 - st * 0.35);
      shrine.add(step);
    }

    // 4 Vermilion Lacquered Pillars with Stone Bases & Gold Caps
    const pGeo = new THREE.CylinderGeometry(0.18, 0.21, 3.1, 10);
    const pBaseGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.24, 8);
    for (const px of [-2.0, 2.0]) {
      for (const pz of [-1.5, 1.5]) {
        const pb = new THREE.Mesh(pBaseGeo, stoneMat);
        pb.position.set(px, 0.98, pz);
        const col = new THREE.Mesh(pGeo, lacquerRedMat);
        col.position.set(px, 2.55, pz);
        col.castShadow = true;
        shrine.add(pb, col);
      }
    }

    // Inner Sanctuary Walls, Lattice Doors, Horizontal Lacquered Plaque (Hoành Phi), Altar & Incense Burner
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.9, 0.22), darkWoodMat);
    backWall.position.set(0, 2.35, -1.52);
    const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 3.0), darkWoodMat);
    sideWallL.position.set(-2.02, 2.3, 0);
    const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 3.0), darkWoodMat);
    sideWallR.position.set(2.02, 2.3, 0);
    const altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.9), lacquerRedMat);
    altar.position.set(0, 1.35, -0.75);
    const altarTrim = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.98), goldMat);
    altarTrim.position.set(0, 1.85, -0.75);
    const incensePot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.34, 10), goldMat);
    incensePot.position.set(0, 2.06, -0.58);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), emberMat);
    ember.position.set(0, 2.26, -0.58);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.56, 0.12), lacquerRedMat);
    plaque.position.set(0, 3.68, 1.58);
    const plaqueBorder = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.68, 0.08), goldMat);
    plaqueBorder.position.set(0, 3.68, 1.55);
    shrine.add(backWall, sideWallL, sideWallR, altar, altarTrim, incensePot, ember, plaque, plaqueBorder);

    // Double-Tiered Curved Vietnamese Pagoda Roof (Đao Mái Cong 2 Tầng)
    const lowerRoofPts = [
      new THREE.Vector2(0.01, 1.3),
      new THREE.Vector2(1.4, 0.85),
      new THREE.Vector2(3.1, 0.25),
      new THREE.Vector2(4.2, 0.02),
      new THREE.Vector2(4.55, 0.32)
    ];
    const roof1 = new THREE.Mesh(new THREE.LatheGeometry(lowerRoofPts, 4), roofTileMat);
    roof1.rotation.y = Math.PI / 4;
    roof1.scale.set(1.08, 1.0, 0.92);
    roof1.position.y = 3.92;
    roof1.castShadow = true;

    const upperRoofPts = [
      new THREE.Vector2(0.01, 1.15),
      new THREE.Vector2(0.9, 0.68),
      new THREE.Vector2(2.15, 0.18),
      new THREE.Vector2(2.85, 0.02),
      new THREE.Vector2(3.12, 0.26)
    ];
    const roof2 = new THREE.Mesh(new THREE.LatheGeometry(upperRoofPts, 4), roofTileMat);
    roof2.rotation.y = Math.PI / 4;
    roof2.scale.set(1.08, 1.0, 0.92);
    roof2.position.y = 5.05;
    roof2.castShadow = true;

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 0.2), goldMat);
    ridge.position.y = 6.22;
    const finialOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), goldMat);
    finialOrb.position.y = 6.55;
    shrine.add(roof1, roof2, ridge, finialOrb);

    // Twin Glowing Hanging Shrine Lanterns under front eaves
    for (const lx of [-1.45, 1.45]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), shrineLanternMat);
      lamp.scale.set(0.85, 1.3, 0.85);
      lamp.position.set(lx, 3.25, 1.65);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: textures.glowSpriteMap,
          color: COLORS.lanternLit,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      glow.scale.set(2.4, 2.4, 1);
      glow.position.set(lx, 3.25, 1.65);
      shrine.add(lamp, glow);
    }

    shrine.matrixAutoUpdate = false;
    shrine.updateMatrix();
    levelGroup.add(shrine);
  };

  if (night === 1) {
    addVietnameseShrine(-24, 0, -24, Math.PI * 0.25, 1.05);
    addVietnameseShrine(26, 0, -22, -Math.PI * 0.28, 0.72);
  } else if (night === 2) {
    addVietnameseShrine(-18, 0, -14, Math.PI * 0.3, 0.86);
    addVietnameseShrine(88, 0, 14, -Math.PI * 0.72, 0.86);
  } else {
    addVietnameseShrine(-31, 0, -22, Math.PI * 0.28, 1.0);
    addVietnameseShrine(31, 0, -22, -Math.PI * 0.28, 1.0);
  }

  // 5. Detailed Swaying Trees, Hero Blossom Banyans, Bamboo Groves, Areca Palms, Grass Tufts & Night Flowers
  const isSafeSpot = (x: number, z: number) => {
    if (Math.sqrt(x * x + z * z) < 5.8) return false;
    if (night === 1 && Math.abs(x) < 4.8 && z < -34) return false;
    if (night === 1 && ((x + 24) ** 2 + (z + 24) ** 2 < 46 || (x - 26) ** 2 + (z + 22) ** 2 < 32)) return false;
    if (night === 2 && ((x + 18) ** 2 + (z + 14) ** 2 < 36 || (x - 88) ** 2 + (z - 14) ** 2 < 36)) return false;
    if (night === 3 && ((x + 31) ** 2 + (z + 22) ** 2 < 46 || (x - 31) ** 2 + (z + 22) ** 2 < 46)) return false;
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

  // Build Hero Swaying Trees (8-Frond Segmented Areca Palms on Night 2, 4-Tier Pines & Glowing Blossom Banyans)
  const palmSeg1Geo = new THREE.BoxGeometry(0.32, 0.05, 1.35);
  palmSeg1Geo.translate(0, 0, 0.675);
  const palmSeg2Geo = new THREE.BoxGeometry(0.24, 0.04, 1.25);
  palmSeg2Geo.translate(0, 0, 0.625);
  const pineLowMat = new THREE.MeshStandardMaterial({ color: 0x163830, roughness: 0.86 });
  const pineMidMat = new THREE.MeshStandardMaterial({ color: 0x204d42, roughness: 0.84 });
  const pineTopMat = new THREE.MeshStandardMaterial({ color: 0x2c6657, roughness: 0.82 });
  const pineTipMat = new THREE.MeshStandardMaterial({ color: 0x3b7d6b, roughness: 0.8 });
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xffd1dc,
    emissive: 0xff8fab,
    emissiveIntensity: 0.55,
    roughness: 0.6
  });

  // Hero Glowing Ancient Blossom / Banyan Trees (3-4 landmarks per island)
  const banyanCoords: Array<[number, number, number]> =
    night === 1
      ? [
          [-27, 0, 21],
          [28, 0, 20],
          [16, 0, -30]
        ]
      : night === 2
        ? [
            [-15, 0, 16],
            [84, 0, -16]
          ]
        : [
            [-34, 0, 22],
            [34, 0, 22],
            [0, 0, -36]
          ];

  for (let bi = 0; bi < banyanCoords.length; bi++) {
    const [bx, by, bz] = banyanCoords[bi];
    if (!isSafeSpot(bx, bz)) continue;
    const banyan = new THREE.Group();
    banyan.position.set(bx, by, bz);

    // Gnarled trunk + 4 buttress roots + 3 spreading branches
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.68, 3.6, 8), woodMat);
    trunk.position.y = 1.8;
    trunk.rotation.z = 0.06;
    trunk.castShadow = true;
    banyan.add(trunk);

    for (let r = 0; r < 4; r++) {
      const a = (r / 4) * Math.PI * 2 + bi;
      const rootMesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.35, 6), woodMat);
      rootMesh.position.set(Math.cos(a) * 0.52, 0.45, Math.sin(a) * 0.52);
      rootMesh.rotation.z = Math.cos(a) * -0.55;
      rootMesh.rotation.x = Math.sin(a) * 0.55;
      banyan.add(rootMesh);
    }

    const canopyOffsets: Array<[number, number, number, number]> = [
      [0, 4.4, 0, 2.05],
      [1.45, 3.85, 0.75, 1.48],
      [-1.35, 3.9, -0.7, 1.52],
      [0.4, 4.1, -1.35, 1.35],
      [-0.5, 4.85, 0.65, 1.25]
    ];
    for (let ci = 0; ci < canopyOffsets.length; ci++) {
      const [cx, cy, cz, cr] = canopyOffsets[ci];
      if (ci > 0) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.9, 6), woodMat);
        br.position.set(cx * 0.48, 2.95, cz * 0.48);
        br.rotation.z = -cx * 0.35;
        br.rotation.x = cz * 0.35;
        banyan.add(br);
      }
      const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(cr, 1), ci % 2 === 0 ? pineMidMat : pineTopMat);
      foliage.scale.set(1.15, 0.72, 1.1);
      foliage.position.set(cx, cy, cz);
      foliage.castShadow = true;
      banyan.add(foliage);

      // Glowing night-blossom clusters tucked into the canopy
      const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(cr * 0.46, 0), blossomMat);
      bloom.position.set(cx + (ci % 2 === 0 ? 0.5 : -0.45), cy - 0.15, cz + 0.4);
      banyan.add(bloom);
    }

    // Hanging glowing banyan lantern vine
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), woodMat);
    vine.position.set(1.2, 2.7, 0.8);
    const vBulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), shrineLanternMat);
    vBulb.position.set(1.2, 1.95, 0.8);
    banyan.add(vine, vBulb);

    banyan.userData.phase = bi * 1.4;
    swayFoliageGroups.push(banyan);
    levelGroup.add(banyan);
  }

  if (night === 2) {
    // Detailed Curved 8-Frond Segmented Areca Palms (Cây Cau)
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x4b7040, roughness: 0.65 });
    const ringGeo = new THREE.TorusGeometry(0.15, 0.022, 4, 8);
    for (let i = 0; i < treePositions.length; i++) {
      const [x, y, z, scale] = treePositions[i];
      const palm = new THREE.Group();
      palm.position.set(x, y, z);
      palm.scale.setScalar(scale);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.21, 5.6, 8), woodMat);
      trunk.position.y = 2.8;
      trunk.rotation.z = 0.055;
      trunk.castShadow = true;
      palm.add(trunk);

      // Characteristic Areca segmented trunk rings
      for (let ry = 0.8; ry <= 4.8; ry += 0.8) {
        const ring = new THREE.Mesh(ringGeo, darkWoodMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(ry * 0.045, ry, 0);
        palm.add(ring);
      }

      // Detailed Areca nut cluster (3 nuts)
      for (let ni = 0; ni < 3; ni++) {
        const a = (ni / 3) * Math.PI * 2;
        const nut = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), nutMat);
        nut.position.set(0.24 + Math.cos(a) * 0.14, 5.2, Math.sin(a) * 0.14);
        palm.add(nut);
      }

      // 8 Two-Segment Arched Palm Fronds (rising base + drooping tip)
      const crown = new THREE.Group();
      crown.position.set(0.26, 5.52, 0);
      for (let f = 0; f < 8; f++) {
        const frondGroup = new THREE.Group();
        frondGroup.rotation.y = (f / 8) * Math.PI * 2 + i * 0.4;
        const seg1 = new THREE.Mesh(palmSeg1Geo, bambooLeafMat);
        seg1.rotation.x = -0.22;
        const seg2 = new THREE.Mesh(palmSeg2Geo, pineTopMat);
        seg2.position.set(0, 0.29, 1.3);
        seg2.rotation.x = 0.55;
        frondGroup.add(seg1, seg2);
        crown.add(frondGroup);
      }
      palm.add(crown);
      palm.userData.phase = i * 0.9;
      swayFoliageGroups.push(palm);
      levelGroup.add(palm);
    }
  } else {
    // 4-Tier Lush Night Pines with Exposed Roots & Alternating Foliage Angles
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.29, 2.2, 7);
    const tier1Geo = new THREE.ConeGeometry(1.65, 1.85, 8);
    const tier2Geo = new THREE.ConeGeometry(1.32, 1.75, 8);
    const tier3Geo = new THREE.ConeGeometry(0.96, 1.55, 8);
    const tier4Geo = new THREE.ConeGeometry(0.58, 1.25, 7);

    for (let i = 0; i < treePositions.length; i++) {
      const [x, y, z, scale] = treePositions[i];
      const tree = new THREE.Group();
      tree.position.set(x, y, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(trunkGeo, woodMat);
      trunk.position.y = 1.1;
      trunk.castShadow = true;
      const t1 = new THREE.Mesh(tier1Geo, pineLowMat);
      t1.position.y = 2.05;
      t1.castShadow = true;
      const t2 = new THREE.Mesh(tier2Geo, pineMidMat);
      t2.position.y = 3.0;
      t2.rotation.y = 0.35;
      t2.castShadow = true;
      const t3 = new THREE.Mesh(tier3Geo, pineTopMat);
      t3.position.y = 3.9;
      t3.rotation.y = 0.7;
      t3.castShadow = true;
      const t4 = new THREE.Mesh(tier4Geo, pineTipMat);
      t4.position.y = 4.65;
      t4.castShadow = true;
      tree.add(trunk, t1, t2, t3, t4);

      tree.userData.phase = i * 1.1;
      swayFoliageGroups.push(tree);
      levelGroup.add(tree);
    }
  }

  // Vietnamese Bamboo Groves (segmented culm nodes + side branches + multi-layer fan leaves)
  const stalkGeo = new THREE.CylinderGeometry(0.055, 0.078, 4.6, 6);
  stalkGeo.translate(0, 2.3, 0);
  const nodeGeo = new THREE.TorusGeometry(0.072, 0.016, 4, 6);
  const leafClusterGeo = new THREE.ConeGeometry(0.68, 1.05, 5);
  for (let i = 0; i < bambooPositions.length; i++) {
    const [x, y, z, scale] = bambooPositions[i];
    const grove = new THREE.Group();
    grove.position.set(x, y, z);
    grove.scale.setScalar(scale);

    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + i;
      const stalk = new THREE.Mesh(stalkGeo, bambooMat);
      stalk.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28);
      stalk.rotation.z = (b - 1.5) * 0.085;
      stalk.rotation.x = Math.sin(a) * 0.08;
      stalk.castShadow = true;

      for (const ny of [1.1, 2.2, 3.3]) {
        const node = new THREE.Mesh(nodeGeo, pineLowMat);
        node.rotation.x = Math.PI / 2;
        node.position.y = ny;
        stalk.add(node);
      }

      const foliage1 = new THREE.Mesh(leafClusterGeo, bambooLeafMat);
      foliage1.position.set(0.18, 3.4, 0);
      foliage1.scale.set(0.75, 0.7, 0.75);
      const foliage2 = new THREE.Mesh(leafClusterGeo, pineTipMat);
      foliage2.position.y = 4.45;
      stalk.add(foliage1, foliage2);
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

export interface ConnectedArchipelagoResult {
  incomingBridgeStart: [number, number, number] | null;
  bridgeLanternMats: THREE.MeshStandardMaterial[];
}

/**
 * Renders the visual connected 3-island archipelago (Đảo Bến ↔ Đảo Cau ↔ Đảo Chuông) linked by arched
 * lantern sky-bridges and Tam Quan gates. Purely visual (added to levelGroup and skipped in bench mode)
 * so core physics boundaries and Test Contract v1.3 outputs remain 100% untouched.
 */
export function addConnectedArchipelago(
  levelGroup: THREE.Group,
  currentNight: number,
  textures: ProceduralTextures
): ConnectedArchipelagoResult {
  const group = new THREE.Group();
  const bridgeLanternMats: THREE.MeshStandardMaterial[] = [];

  const grassCompletedMat = new THREE.MeshStandardMaterial({ color: 0x2f6052, roughness: 0.92 });
  const grassUpcomingMat = new THREE.MeshStandardMaterial({ color: 0x1d3444, roughness: 0.95 });
  const sandCompletedMat = new THREE.MeshStandardMaterial({ color: 0x9b8b6d, roughness: 0.94 });
  const sandUpcomingMat = new THREE.MeshStandardMaterial({ color: 0x454e63, roughness: 0.96 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x1e273c, roughness: 0.96, flatShading: true });
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodMap, roughness: 0.85 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8b6742, roughness: 0.9 });
  const redRoofMat = new THREE.MeshStandardMaterial({ color: 0x8c2420, roughness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    emissive: COLORS.lanternLit,
    emissiveIntensity: 0.35,
    metalness: 0.5,
    roughness: 0.35
  });

  const makeBridgeLanternMat = (lit: boolean): THREE.MeshStandardMaterial => {
    const mat = new THREE.MeshStandardMaterial({
      color: lit ? COLORS.lanternCore : 0x6f84b0,
      emissive: lit ? COLORS.lanternLit : 0x3b4e7a,
      emissiveIntensity: lit ? 2.1 : 0.6,
      roughness: 0.35
    });
    bridgeLanternMats.push(mat);
    return mat;
  };

  // Traditional Vietnamese Tam Quan Gate at bridgeheads on the active island rim
  const buildTamQuanGate = (x: number, y: number, z: number, yaw: number, lit: boolean) => {
    const gate = new THREE.Group();
    gate.position.set(x, y, z);
    gate.rotation.y = yaw;

    const pillarGeo = new THREE.CylinderGeometry(0.24, 0.3, 4.6, 8);
    const baseGeo = new THREE.BoxGeometry(0.85, 0.55, 0.85);
    for (const sx of [-2.1, 2.1]) {
      const base = new THREE.Mesh(baseGeo, rockMat);
      base.position.set(sx, 0.27, 0);
      const pillar = new THREE.Mesh(pillarGeo, woodMat);
      pillar.position.set(sx, 2.3, 0);
      gate.add(base, pillar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.38, 0.52), woodMat);
    beam.position.set(0, 4.4, 0);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.32, 1.35), redRoofMat);
    roof.position.set(0, 4.82, 0);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 0.3), goldMat);
    ridge.position.set(0, 5.06, 0);
    gate.add(beam, roof, ridge);

    const lMat = makeBridgeLanternMat(lit);
    const lGeo = new THREE.SphereGeometry(0.32, 10, 8);
    for (const sx of [-1.45, 1.45]) {
      const lantern = new THREE.Mesh(lGeo, lMat);
      lantern.scale.set(0.85, 1.25, 0.85);
      lantern.position.set(sx, 3.65, 0);
      gate.add(lantern);

      if (lit) {
        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: textures.glowSpriteMap,
            color: COLORS.lanternLit,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        halo.scale.set(2.4, 2.4, 1);
        halo.position.set(sx, 3.65, 0);
        gate.add(halo);
      }
    }
    group.add(gate);
  };

  // Arched Lantern Sky-Bridge connecting two island rims across the cloud sea
  const buildSkyBridge = (p0: THREE.Vector3, p1: THREE.Vector3, lit: boolean) => {
    const mid = p0.clone().lerp(p1, 0.5);
    mid.y += 4.2;
    const curve = new THREE.CatmullRomCurve3([p0, mid, p1]);
    const totalLen = p0.distanceTo(p1);
    const plankCount = Math.max(16, Math.floor(totalLen / 1.15));

    const plankMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 0.18, 0.78), woodMat, plankCount);
    const dummy = new THREE.Object3D();
    const tangent = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3();

    const leftRopePts: THREE.Vector3[] = [];
    const rightRopePts: THREE.Vector3[] = [];
    const lanternPositions: THREE.Vector3[] = [];

    for (let i = 0; i < plankCount; i++) {
      const t = i / (plankCount - 1);
      const pos = curve.getPoint(t);
      curve.getTangent(t, tangent).normalize();
      side.crossVectors(up, tangent).normalize();

      dummy.position.copy(pos);
      dummy.lookAt(pos.clone().add(tangent));
      dummy.updateMatrix();
      plankMesh.setMatrixAt(i, dummy.matrix);

      if (i % 3 === 0 || i === plankCount - 1) {
        leftRopePts.push(pos.clone().addScaledVector(side, 1.65).add(new THREE.Vector3(0, 1.55, 0)));
        rightRopePts.push(pos.clone().addScaledVector(side, -1.65).add(new THREE.Vector3(0, 1.55, 0)));
      }
      if (i > 1 && i < plankCount - 2 && i % 5 === 0) {
        lanternPositions.push(pos.clone().addScaledVector(side, 1.72).add(new THREE.Vector3(0, 2.1, 0)));
        lanternPositions.push(pos.clone().addScaledVector(side, -1.72).add(new THREE.Vector3(0, 2.1, 0)));
      }
    }
    plankMesh.instanceMatrix.needsUpdate = true;
    group.add(plankMesh);

    const ropeL = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftRopePts), 24, 0.06, 5, false), ropeMat);
    const ropeR = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightRopePts), 24, 0.06, 5, false), ropeMat);
    group.add(ropeL, ropeR);

    if (lanternPositions.length > 0) {
      const lMat = makeBridgeLanternMat(lit);
      const postMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 2.35, 6), woodMat, lanternPositions.length);
      const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 8), lMat, lanternPositions.length);
      lanternPositions.forEach((lp, idx) => {
        dummy.position.set(lp.x, lp.y - 1.0, lp.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postMesh.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(lp.x, lp.y, lp.z);
        dummy.scale.set(0.85, 1.25, 0.85);
        dummy.updateMatrix();
        bulbMesh.setMatrixAt(idx, dummy.matrix);
      });
      postMesh.instanceMatrix.needsUpdate = true;
      bulbMesh.instanceMatrix.needsUpdate = true;
      group.add(postMesh, bulbMesh);
    }
  };

  // Stylized Distant Island Silhouettes (completed islands shine warmly, upcoming islands sit in twilight mist)
  const buildDistantIsland = (kind: 1 | 2 | 3, center: THREE.Vector3, status: 'completed' | 'upcoming') => {
    const isl = new THREE.Group();
    isl.position.copy(center);
    const isLit = status === 'completed';
    const gMat = isLit ? grassCompletedMat : grassUpcomingMat;
    const sMat = isLit ? sandCompletedMat : sandUpcomingMat;
    const beaconMat = makeBridgeLanternMat(isLit);

    const addDisc = (ox: number, oy: number, oz: number, r: number) => {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r - 1.2, r, 1.0, 28), gMat);
      top.position.set(ox, oy - 0.5, oz);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r - 5, 5.2, 24), sMat);
      rim.position.set(ox, oy - 3.2, oz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, r * 0.45, 12), rockMat);
      cone.rotation.x = Math.PI;
      cone.position.set(ox, oy - 5.5 - r * 0.22, oz);
      isl.add(top, rim, cone);
    };

    const addMiniLanterns = (pts: Array<[number, number, number]>) => {
      const lGeo = new THREE.SphereGeometry(0.75, 8, 8);
      for (const [lx, ly, lz] of pts) {
        const m = new THREE.Mesh(lGeo, beaconMat);
        m.position.set(lx, ly + 2.8, lz);
        isl.add(m);
        if (isLit) {
          const glow = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: textures.glowSpriteMap,
              color: COLORS.lanternLit,
              transparent: true,
              opacity: 0.6,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            })
          );
          glow.scale.set(9.5, 9.5, 1);
          glow.position.set(lx, ly + 3.2, lz);
          isl.add(glow);
        }
      }
    };

    if (kind === 1) {
      addDisc(0, 0, 0, 36);
      addMiniLanterns([
        [0, 0, 22],
        [20, 0, 6],
        [-20, 0, 6],
        [14, 0, -18],
        [-14, 0, -18]
      ]);
    } else if (kind === 2) {
      addDisc(0, 0, 0, 24);
      addDisc(58, 0, 0, 24);
      const innerBridge = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 3.6), woodMat);
      innerBridge.position.set(29, -0.1, 0);
      isl.add(innerBridge);
      // Tall stylized Areca palm silhouettes
      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 7.5, 6);
      const crownGeo = new THREE.ConeGeometry(2.1, 2.2, 6);
      for (const [px, pz] of [
        [-10, 8],
        [10, -10],
        [48, 9],
        [68, -8]
      ]) {
        const tr = new THREE.Mesh(trunkGeo, woodMat);
        tr.position.set(px, 3.7, pz);
        const cr = new THREE.Mesh(crownGeo, gMat);
        cr.position.set(px, 7.8, pz);
        isl.add(tr, cr);
      }
      addMiniLanterns([
        [-10, 0, 12],
        [12, 0, 10],
        [0, 0, -14],
        [48, 0, 12],
        [66, 0, 0],
        [54, 0, -14]
      ]);
    } else {
      addDisc(0, 0, 0, 40);
      const t1 = new THREE.Mesh(new THREE.CylinderGeometry(22, 23.5, 3.2, 24), sMat);
      t1.position.set(0, 1.5, 0);
      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 10.5, 6.2, 20), sMat);
      t2.position.set(0, 3.0, 0);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 8.2, 12), woodMat);
      tower.position.set(0, 10.0, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 3.2, 8), isLit ? goldMat : redRoofMat);
      roof.position.set(0, 15.2, 0);
      isl.add(t1, t2, tower, roof);
      addMiniLanterns([
        [0, 6, 0],
        [16, 3, 10],
        [-16, 3, 10],
        [28, 0, -8],
        [-28, 0, -8]
      ]);
    }

    // Distant warm dawn halo over completed islands
    if (isLit) {
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: textures.glowSpriteMap,
          color: COLORS.lanternLit,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      halo.scale.set(55, 34, 1);
      halo.position.set(kind === 2 ? 29 : 0, 12, 0);
      isl.add(halo);
    }

    group.add(isl);
  };

  let incomingBridgeStart: [number, number, number] | null = null;

  if (currentNight === 1) {
    // Active: Đảo Bến (0,0,0) -> Bridge 1-2 -> Đảo Cau (14, 5, 102) -> Bridge 2-3 -> Đảo Chuông (-12, 12, 206)
    buildTamQuanGate(2, 0, 39.2, 0.25, true);
    buildSkyBridge(new THREE.Vector3(2, 0, 39.2), new THREE.Vector3(14, 5, 78), true);
    buildDistantIsland(2, new THREE.Vector3(14, 5, 102), 'upcoming');
    buildSkyBridge(new THREE.Vector3(20, 5, 126), new THREE.Vector3(-8, 12, 166), false);
    buildDistantIsland(3, new THREE.Vector3(-12, 12, 206), 'upcoming');
  } else if (currentNight === 2) {
    // Behind: Đảo Bến (completed) -> Bridge 1-2 -> Active: Đảo Cau -> Bridge 2-3 -> Đảo Chuông (upcoming)
    buildDistantIsland(1, new THREE.Vector3(-14, -5, -104), 'completed');
    buildSkyBridge(new THREE.Vector3(-12, -5, -68), new THREE.Vector3(-2, 0, -27.2), true);
    buildTamQuanGate(-2, 0, -27.2, 0.22, true);

    buildTamQuanGate(14, 0, 24.4, 0.35, true);
    buildSkyBridge(new THREE.Vector3(14, 0, 24.4), new THREE.Vector3(30, 7, 68), true);
    buildDistantIsland(3, new THREE.Vector3(32, 7, 108), 'upcoming');
    incomingBridgeStart = [-12, 11, -68];
  } else {
    // Behind: Đảo Bến (completed) -> Đảo Cau (completed) -> Bridge 2-3 -> Active: Đảo Chuông
    buildDistantIsland(1, new THREE.Vector3(-32, -12, -214), 'completed');
    buildSkyBridge(new THREE.Vector3(-30, -12, -178), new THREE.Vector3(-16, -7, -134), true);
    buildDistantIsland(2, new THREE.Vector3(-14, -7, -110), 'completed');
    buildSkyBridge(new THREE.Vector3(-12, -7, -86), new THREE.Vector3(-2, 0, -44.2), true);
    buildTamQuanGate(-2, 0, -44.2, 0.2, true);
    incomingBridgeStart = [-12, 11, -86];
  }

  levelGroup.add(group);
  return { incomingBridgeStart, bridgeLanternMats };
}
