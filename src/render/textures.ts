/**
 * @file textures.ts
 * @description Generates cached power-of-two (512x512) procedural PBR CanvasTextures
 * matching the PRD-1 fairytale palette with zero external network dependencies.
 */

import * as THREE from 'three';

export interface ProceduralTextures {
  grassMap: THREE.CanvasTexture;
  grassBump: THREE.CanvasTexture;
  sandMap: THREE.CanvasTexture;
  woodMap: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  lanternLitMap: THREE.CanvasTexture;
  lanternTornMap: THREE.CanvasTexture;
  nonLaMap: THREE.CanvasTexture;
  glowSpriteMap: THREE.CanvasTexture;
}

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function toTiledTexture(canvas: HTMLCanvasElement, repeatX: number, repeatY: number, isColor = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates and caches all procedural PBR textures used across the 3 Nights.
 */
export function createProceduralTextures(): ProceduralTextures {
  // Deterministic PRNG for texture grain
  let seed = 202603362;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // 1. Grass Diffuse (#2F5D50 base) & Bump
  const [gCanvas, gCtx] = makeCanvas(512);
  const [gbCanvas, gbCtx] = makeCanvas(512);
  gCtx.fillStyle = '#2F5D50';
  gCtx.fillRect(0, 0, 512, 512);
  gbCtx.fillStyle = '#808080';
  gbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3200; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const h = 4 + rand() * 10;
    const shade = rand();
    gCtx.strokeStyle = shade > 0.65 ? '#396E5F' : shade > 0.3 ? '#285044' : '#24473D';
    gCtx.lineWidth = 1.2 + rand();
    gCtx.beginPath();
    gCtx.moveTo(x, y);
    gCtx.lineTo(x + (rand() - 0.5) * 4, y - h);
    gCtx.stroke();

    gbCtx.strokeStyle = shade > 0.5 ? '#B0B0B0' : '#555555';
    gbCtx.lineWidth = 1.2;
    gbCtx.beginPath();
    gbCtx.moveTo(x, y);
    gbCtx.lineTo(x + (rand() - 0.5) * 3, y - h);
    gbCtx.stroke();
  }
  // Tiny subtle night-moss & petal speckles
  for (let i = 0; i < 120; i++) {
    gCtx.fillStyle = rand() > 0.7 ? 'rgba(201, 180, 138, 0.28)' : 'rgba(60, 120, 95, 0.35)';
    gCtx.beginPath();
    gCtx.arc(rand() * 512, rand() * 512, 1.5 + rand() * 2.5, 0, Math.PI * 2);
    gCtx.fill();
  }

  // 2. Coastal Sand & Stone Rim (#C9B48A base)
  const [sCanvas, sCtx] = makeCanvas(512);
  sCtx.fillStyle = '#C9B48A';
  sCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    const v = rand();
    sCtx.fillStyle = v > 0.6 ? '#D6C39C' : v > 0.3 ? '#B8A075' : '#9E8861';
    sCtx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 3, 2 + rand() * 2);
  }
  for (let i = 0; i < 24; i++) {
    sCtx.strokeStyle = 'rgba(130, 108, 74, 0.22)';
    sCtx.lineWidth = 2;
    sCtx.beginPath();
    const y = (i / 24) * 512;
    sCtx.moveTo(0, y);
    sCtx.bezierCurveTo(170, y + 12, 340, y - 12, 512, y);
    sCtx.stroke();
  }

  // 3. Bamboo & Timber Wood (#6B4A2F base) & Bump
  const [wCanvas, wCtx] = makeCanvas(512);
  const [wbCanvas, wbCtx] = makeCanvas(512);
  wCtx.fillStyle = '#6B4A2F';
  wCtx.fillRect(0, 0, 512, 512);
  wbCtx.fillStyle = '#808080';
  wbCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = rand() * 512;
    wCtx.strokeStyle = rand() > 0.5 ? 'rgba(90, 58, 34, 0.55)' : 'rgba(135, 96, 62, 0.35)';
    wCtx.lineWidth = 1 + rand() * 3;
    wCtx.beginPath();
    wCtx.moveTo(x, 0);
    wCtx.lineTo(x + (rand() - 0.5) * 6, 512);
    wCtx.stroke();

    wbCtx.strokeStyle = rand() > 0.5 ? '#A8A8A8' : '#585858';
    wbCtx.lineWidth = 1.5;
    wbCtx.beginPath();
    wbCtx.moveTo(x, 0);
    wbCtx.lineTo(x, 512);
    wbCtx.stroke();
  }
  // Bamboo horizontal rings
  for (let y = 64; y < 512; y += 128) {
    wCtx.fillStyle = 'rgba(42, 26, 14, 0.45)';
    wCtx.fillRect(0, y, 512, 5);
    wbCtx.fillStyle = '#D0D0D0';
    wbCtx.fillRect(0, y, 512, 5);
  }

  // 4. Rice Paper Lantern Texture (Lit — warm #FFE9B0 + #FFB347 + floral/cloud ink motifs + wooden ribs)
  const [lCanvas, lCtx] = makeCanvas(512);
  const grad = lCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#FFB347');
  grad.addColorStop(0.5, '#FFE9B0');
  grad.addColorStop(1, '#FFB347');
  lCtx.fillStyle = grad;
  lCtx.fillRect(0, 0, 512, 512);

  // Subtle rice paper fibers
  for (let i = 0; i < 600; i++) {
    lCtx.strokeStyle = 'rgba(255, 250, 230, 0.25)';
    lCtx.lineWidth = 1;
    const x = rand() * 512;
    const y = rand() * 512;
    lCtx.beginPath();
    lCtx.moveTo(x, y);
    lCtx.lineTo(x + (rand() - 0.5) * 24, y + (rand() - 0.5) * 24);
    lCtx.stroke();
  }
  // Traditional lotus/cloud decorative motifs per lantern panel
  lCtx.strokeStyle = 'rgba(180, 95, 28, 0.42)';
  lCtx.lineWidth = 3;
  for (let p = 0; p < 6; p++) {
    const cx = (p + 0.5) * (512 / 6);
    lCtx.beginPath();
    lCtx.arc(cx, 256, 22, 0, Math.PI * 2);
    lCtx.stroke();
    lCtx.beginPath();
    lCtx.arc(cx - 16, 264, 14, 0, Math.PI * 2);
    lCtx.arc(cx + 16, 264, 14, 0, Math.PI * 2);
    lCtx.stroke();
  }
  // Wooden hexagonal frame ribs
  lCtx.fillStyle = '#4A311D';
  lCtx.fillRect(0, 0, 512, 18);
  lCtx.fillRect(0, 494, 512, 18);
  for (let p = 0; p <= 6; p++) {
    const x = Math.round((p * 512) / 6);
    lCtx.fillRect(x - 4, 0, 8, 512);
  }

  // 5. Torn Unlit Lantern Paper Texture (#5B5F6E + jagged dark tears for non-color distinction)
  const [ltCanvas, ltCtx] = makeCanvas(512);
  ltCtx.fillStyle = '#5B5F6E';
  ltCtx.fillRect(0, 0, 512, 512);
  ltCtx.fillStyle = '#2C2E38';
  ltCtx.fillRect(0, 0, 512, 18);
  ltCtx.fillRect(0, 494, 512, 18);
  for (let p = 0; p <= 6; p++) {
    const x = Math.round((p * 512) / 6);
    ltCtx.fillRect(x - 4, 0, 8, 512);
  }
  // Prominent jagged tear slashes across each panel
  ltCtx.strokeStyle = '#120A1A';
  ltCtx.lineWidth = 10;
  for (let p = 0; p < 6; p++) {
    const x0 = p * (512 / 6) + 14;
    ltCtx.beginPath();
    ltCtx.moveTo(x0, 120);
    ltCtx.lineTo(x0 + 26, 210);
    ltCtx.lineTo(x0 + 10, 290);
    ltCtx.lineTo(x0 + 48, 395);
    ltCtx.stroke();
  }

  // 6. Woven Nón Lá Palm Leaf Texture (#C9B48A radial bands)
  const [nCanvas, nCtx] = makeCanvas(512);
  nCtx.fillStyle = '#C9B48A';
  nCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 16) {
    nCtx.strokeStyle = 'rgba(130, 102, 60, 0.45)';
    nCtx.lineWidth = 2;
    nCtx.beginPath();
    nCtx.moveTo(0, y);
    nCtx.lineTo(512, y);
    nCtx.stroke();
  }
  for (let x = 0; x < 512; x += 24) {
    nCtx.strokeStyle = 'rgba(165, 138, 92, 0.35)';
    nCtx.lineWidth = 1.5;
    nCtx.beginPath();
    nCtx.moveTo(x, 0);
    nCtx.lineTo(x, 512);
    nCtx.stroke();
  }

  // 7. Soft Radial Glow Sprite Texture (alpha falloff for volumetric halos & fireflies)
  const [glCanvas, glCtx] = makeCanvas(256);
  const rGrad = glCtx.createRadialGradient(128, 128, 4, 128, 128, 126);
  rGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  rGrad.addColorStop(0.25, 'rgba(255, 240, 200, 0.75)');
  rGrad.addColorStop(0.6, 'rgba(255, 200, 110, 0.22)');
  rGrad.addColorStop(1.0, 'rgba(255, 180, 70, 0.0)');
  glCtx.fillStyle = rGrad;
  glCtx.fillRect(0, 0, 256, 256);

  const glowSpriteMap = new THREE.CanvasTexture(glCanvas);
  glowSpriteMap.colorSpace = THREE.SRGBColorSpace;

  const lanternLitMap = new THREE.CanvasTexture(lCanvas);
  lanternLitMap.colorSpace = THREE.SRGBColorSpace;

  const lanternTornMap = new THREE.CanvasTexture(ltCanvas);
  lanternTornMap.colorSpace = THREE.SRGBColorSpace;

  const nonLaMap = new THREE.CanvasTexture(nCanvas);
  nonLaMap.colorSpace = THREE.SRGBColorSpace;

  return {
    grassMap: toTiledTexture(gCanvas, 10, 10, true),
    grassBump: toTiledTexture(gbCanvas, 10, 10, false),
    sandMap: toTiledTexture(sCanvas, 6, 6, true),
    woodMap: toTiledTexture(wCanvas, 2, 2, true),
    woodBump: toTiledTexture(wbCanvas, 2, 2, false),
    lanternLitMap,
    lanternTornMap,
    nonLaMap,
    glowSpriteMap
  };
}
