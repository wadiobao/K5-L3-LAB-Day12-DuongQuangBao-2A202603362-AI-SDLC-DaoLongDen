/**
 * @file main.ts
 * @description Interactive 3D WebGL View using Three.js adhering to three-best-practices and 3d-games skills.
 */

import * as THREE from 'three';
import { GameEngine, DEFAULT_TUNING } from './core/engine.js';
import { soundFx } from './render/audio.js';

// Pre-allocated scratch objects to prevent garbage collection allocations in render loop (three-best-practices rule)
const _cameraTarget = new THREE.Vector3();
const _scratchVec = new THREE.Vector3();
const _scratchMatrix = new THREE.Matrix4();

class GameView {
  private engine: GameEngine;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Visual Meshes
  private playerMesh!: THREE.Group;
  private hatLanternLight!: THREE.PointLight;
  private lanternMeshes: THREE.Group[] = [];
  private lanternLights: THREE.PointLight[] = [];
  private moteInstancedMesh!: THREE.InstancedMesh;
  private shadeMeshes: THREE.Mesh[] = [];

  // Input Tracking
  private keyState: Record<string, boolean> = {};
  private pendingPulse: boolean = false;
  private pendingInteract: boolean = false;

  // HUD Elements
  private flamesUI!: HTMLElement;
  private carriedCountUI!: HTMLElement;
  private lanternCountUI!: HTMLElement;
  private timeDisplayUI!: HTMLElement;
  private scoreDisplayUI!: HTMLElement;
  private modalUI!: HTMLElement;
  private modalTitleUI!: HTMLElement;
  private modalDescUI!: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    this.engine = new GameEngine(Date.now(), DEFAULT_TUNING);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06040e);
    this.scene.fog = new THREE.FogExp2(0x080614, 0.018);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 10, -18);

    this.bindHUDElements();
    this.setupLighting();
    this.buildWorld();
    this.setupControls();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.startLoop();
  }

  private bindHUDElements(): void {
    this.flamesUI = document.getElementById('flames-ui')!;
    this.carriedCountUI = document.getElementById('carried-count')!;
    this.lanternCountUI = document.getElementById('lantern-count')!;
    this.timeDisplayUI = document.getElementById('time-display')!;
    this.scoreDisplayUI = document.getElementById('score-display')!;
    this.modalUI = document.getElementById('game-modal')!;
    this.modalTitleUI = document.getElementById('modal-title')!;
    this.modalDescUI = document.getElementById('modal-desc')!;

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x221c38, 1.2);
    this.scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0x6b60a8, 1.0);
    moonLight.position.set(30, 60, -30);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 150;
    moonLight.shadow.camera.left = -50;
    moonLight.shadow.camera.right = 50;
    moonLight.shadow.camera.top = 50;
    moonLight.shadow.camera.bottom = -50;
    this.scene.add(moonLight);
  }

  private buildWorld(): void {
    // 1. Island Ground Cylinder (matrixAutoUpdate = false for static performance)
    const islandGeo = new THREE.CylinderGeometry(50, 48, 4, 48);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x141220,
      roughness: 0.85,
      metalness: 0.1
    });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.position.set(0, -2, 0);
    islandMesh.receiveShadow = true;
    islandMesh.matrixAutoUpdate = false;
    islandMesh.updateMatrix();
    this.scene.add(islandMesh);

    // 2. Build Mây Character (with Nón Lá and Small Lantern)
    this.playerMesh = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.45, 1.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a6572, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.playerMesh.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.35;
    head.castShadow = true;
    this.playerMesh.add(head);

    // Nón Lá (Cone hat)
    const hatGeo = new THREE.ConeGeometry(0.85, 0.4, 24);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xd7b988, roughness: 0.9 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.6;
    hat.castShadow = true;
    this.playerMesh.add(hat);

    // Small Lantern on Nón Lá (Creative Feature: glows brighter as Mây carries more motes)
    const hatLanternGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const hatLanternMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 0.8
    });
    const hatLanternMesh = new THREE.Mesh(hatLanternGeo, hatLanternMat);
    hatLanternMesh.position.set(0.4, 1.45, 0.4);
    this.playerMesh.add(hatLanternMesh);

    this.hatLanternLight = new THREE.PointLight(0xffaa00, 1.5, 6);
    this.hatLanternLight.position.set(0.4, 1.45, 0.4);
    this.playerMesh.add(this.hatLanternLight);

    this.scene.add(this.playerMesh);

    // 3. Build 5 Great Lanterns (L1..L5)
    this.engine.lanterns.forEach(lantern => {
      const group = new THREE.Group();
      group.position.set(lantern.pos[0], lantern.pos[1], lantern.pos[2]);

      // Pillar
      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 3.5, 12);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3d354a, roughness: 0.8 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 1.75;
      pillar.castShadow = true;
      group.add(pillar);

      // Glass Lantern Top
      const lampGeo = new THREE.CylinderGeometry(0.65, 0.5, 1.0, 12);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0x221a2b,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.3
      });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.y = 3.6;
      group.add(lamp);

      // Light source (inactive initially)
      const light = new THREE.PointLight(0xffaa22, 0, 16);
      light.position.y = 3.6;
      group.add(light);

      group.matrixAutoUpdate = false;
      group.updateMatrix();

      this.lanternMeshes.push(group);
      this.lanternLights.push(light);
      this.scene.add(group);
    });

    // 4. InstancedMesh for Motes (Fireflies) — 1 draw call optimization (three-best-practices)
    const moteCount = this.engine.motes.length;
    const moteGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xffea70 });
    this.moteInstancedMesh = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
    this.moteInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.moteInstancedMesh);

    // 5. Build Shade Meshes
    this.engine.shades.forEach(() => {
      const shadeGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const shadeMat = new THREE.MeshStandardMaterial({
        color: 0x080210,
        emissive: 0x330044,
        emissiveIntensity: 0.5,
        roughness: 0.2
      });
      const shadeMesh = new THREE.Mesh(shadeGeo, shadeMat);
      shadeMesh.castShadow = true;
      this.shadeMeshes.push(shadeMesh);
      this.scene.add(shadeMesh);
    });
  }

  private setupControls(): void {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keyState[k] = true;
      if (k === 'f') this.pendingPulse = true;
      if (k === 'e' || k === ' ') this.pendingInteract = true;
    });

    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      this.keyState[k] = false;
      if (k === 'f') this.pendingPulse = false;
      if (k === 'e' || k === ' ') this.pendingInteract = false;
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private restartGame(): void {
    this.modalUI.style.display = 'none';
    this.engine = new GameEngine(Date.now(), DEFAULT_TUNING);

    // Reset lantern visuals
    this.lanternLights.forEach(l => (l.intensity = 0));
    this.lanternMeshes.forEach(m => {
      const lamp = m.children[1] as THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
      lamp.material.emissive.setHex(0x000000);
      lamp.material.emissiveIntensity = 0;
    });
  }

  private updateHUD(): void {
    // 1. Flames UI
    const flameIcons = this.flamesUI.querySelectorAll('.flame-icon');
    flameIcons.forEach((el, idx) => {
      if (idx < this.engine.player.flames) {
        el.classList.remove('lost');
      } else {
        el.classList.add('lost');
      }
    });

    // 2. Motes & Lantern counts
    this.carriedCountUI.innerText = `${this.engine.player.carried} / ${this.engine.tuning.carry_capacity}`;
    const litCount = this.engine.lanterns.filter(l => l.lit).length;
    this.lanternCountUI.innerText = `${litCount} / 5`;

    // 3. Time Display
    const timeLeft = Math.floor(this.engine.getTimeLeftSeconds());
    const mins = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    this.timeDisplayUI.innerText = `${mins}:${secs}`;

    // 4. Score Display
    this.scoreDisplayUI.innerText = `${this.engine.score}`;

    // 5. Game Over / Won Modal
    if (this.engine.state !== 'playing' && this.modalUI.style.display !== 'flex') {
      this.modalUI.style.display = 'flex';
      if (this.engine.state === 'won') {
        this.modalTitleUI.innerText = 'CHIẾN THẮNG!';
        this.modalTitleUI.style.color = '#ffe082';
        this.modalDescUI.innerText = `Xuất sắc! Bạn đã thắp lại toàn bộ Đèn Lồng Lớn. Điểm số: ${this.engine.score}`;
      } else {
        this.modalTitleUI.innerText = 'TRỜI ĐÃ RẠNG / MẤT HẾT LỬA';
        this.modalTitleUI.style.color = '#ff5555';
        this.modalDescUI.innerText = `Sương đen đã bao phủ hòn đảo. Điểm số của bạn: ${this.engine.score}`;
      }
    }
  }

  private startLoop(): void {
    let lastTime = performance.now();
    let accumulatedTime = 0;
    const fixedStep = 1000 / 60; // 60Hz tick

    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);

      const delta = currentTime - lastTime;
      lastTime = currentTime;
      accumulatedTime += Math.min(delta, 100);

      // Simulation fixed tick step
      while (accumulatedTime >= fixedStep) {
        accumulatedTime -= fixedStep;

        let moveX = 0;
        let moveZ = 0;
        if (this.keyState['w'] || this.keyState['arrowup']) moveZ += 1;
        if (this.keyState['s'] || this.keyState['arrowdown']) moveZ -= 1;
        if (this.keyState['a'] || this.keyState['arrowleft']) moveX -= 1;
        if (this.keyState['d'] || this.keyState['arrowright']) moveX += 1;

        const events = this.engine.step({
          tick: this.engine.tickCount,
          move: [moveX, moveZ],
          cam_yaw_deg: 0,
          interact: this.pendingInteract,
          pulse: this.pendingPulse
        });

        // Trigger Audio Effects
        events.forEach(ev => {
          if (ev.name === 'mote_picked') soundFx.playMotePickup();
          if (ev.name === 'lantern_lit') soundFx.playLanternLit();
          if (ev.name === 'pulse') soundFx.playPulse();
          if (ev.name === 'player_hit') soundFx.playHurt();
        });
      }

      this.updateVisuals();
      this.updateHUD();
      this.renderer.render(this.scene, this.camera);
    };

    requestAnimationFrame(animate);
  }

  private updateVisuals(): void {
    const time = performance.now() * 0.003;

    // 1. Update Player Position & Rotation
    this.playerMesh.position.set(this.engine.player.pos[0], this.engine.player.pos[1], this.engine.player.pos[2]);

    // Creative Feature: Hat Lantern glow intensifies with carried motes
    const carryRatio = this.engine.player.carried / this.engine.tuning.carry_capacity;
    this.hatLanternLight.intensity = 0.5 + carryRatio * 3.5;
    this.hatLanternLight.color.setHSL(0.12 - carryRatio * 0.04, 1.0, 0.5 + carryRatio * 0.2);

    // 2. Third-person Smooth Follow Camera (Damping rule from 3d-games)
    _cameraTarget.set(this.engine.player.pos[0], this.engine.player.pos[1] + 1.2, this.engine.player.pos[2]);
    _scratchVec.set(this.engine.player.pos[0], this.engine.player.pos[1] + 7.5, this.engine.player.pos[2] - 12);
    this.camera.position.lerp(_scratchVec, 0.06);
    this.camera.lookAt(_cameraTarget);

    // 3. Update Lantern Visuals
    this.engine.lanterns.forEach((l, idx) => {
      const lampMesh = this.lanternMeshes[idx].children[1] as THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
      const light = this.lanternLights[idx];

      if (l.lit) {
        lampMesh.material.emissive.setHex(0xff9900);
        lampMesh.material.emissiveIntensity = 2.0;
        light.intensity = 4.0;
      } else if (l.deposited > 0) {
        const ratio = l.deposited / this.engine.tuning.lantern_cost;
        lampMesh.material.emissive.setHex(0xffaa22);
        lampMesh.material.emissiveIntensity = ratio * 0.8;
        light.intensity = ratio * 1.0;
      }
    });

    // 4. Update Motes InstancedMesh (Zero allocation: reuse scratch matrix)
    this.engine.motes.forEach((mote, i) => {
      if (mote.active) {
        const floatY = 0.5 + Math.sin(time + i * 1.5) * 0.25;
        _scratchMatrix.makeTranslation(mote.pos[0], floatY, mote.pos[2]);
      } else {
        // Hide collected motes beneath island
        _scratchMatrix.makeTranslation(0, -999, 0);
      }
      this.moteInstancedMesh.setMatrixAt(i, _scratchMatrix);
    });
    this.moteInstancedMesh.instanceMatrix.needsUpdate = true;

    // 5. Update Shades Position & Pulse Oscillation
    this.engine.shades.forEach((shade, i) => {
      if (this.shadeMeshes[i]) {
        const mesh = this.shadeMeshes[i];
        const hover = 0.8 + Math.sin(time * 2 + i) * 0.15;
        mesh.position.set(shade.pos[0], hover, shade.pos[2]);

        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (shade.state === 'stunned') {
          mat.emissive.setHex(0x5555ff); // Blue glow when stunned
        } else {
          mat.emissive.setHex(0x440055); // Ominous dark purple
        }
      }
    });
  }
}

// Start game view on page load
window.addEventListener('DOMContentLoaded', () => {
  new GameView();
});
