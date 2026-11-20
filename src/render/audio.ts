/**
 * @file audio.ts
 * @description Procedural sound synthesizer using Web Audio API with persistent volume control.
 * 100% royalty-free, zero external audio asset dependencies.
 */

class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 0.7;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('ddl_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed)) this.masterVolume = Math.max(0, Math.min(1, parsed));
      }
    }
  }

  /**
   * Updates master output volume (0.0 to 1.0) and persists to localStorage.
   */
  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('ddl_volume', String(this.masterVolume));
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  private initCtx(): AudioContext | null {
    if (this.masterVolume <= 0.001) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(type: OscillatorType, startHz: number, endHz: number, duration: number, gainPeak: number): void {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startHz, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), ctx.currentTime + duration);

      gain.gain.setValueAtTime(gainPeak * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Autoplay fallback
    }
  }

  playMotePickup(): void {
    this.tone('sine', 587.33, 880, 0.25, 0.2);
  }

  playLanternLit(): void {
    this.tone('triangle', 220, 440, 0.9, 0.35);
  }

  /**
   * Plays a sharp metallic katana whirlwind slash sound for the 360° skill.
   */
  playPulse(): void {
    this.tone('sawtooth', 980, 140, 0.24, 0.24);
    this.tone('triangle', 1480, 320, 0.18, 0.16);
  }

  /**
   * Plays a dramatic multi-layered katana unsheathe + island-wide crescent wave slice sound.
   */
  playUltimateSlash(): void {
    this.tone('sine', 1320, 2400, 0.18, 0.22);
    this.tone('sawtooth', 720, 55, 0.65, 0.34);
    this.tone('triangle', 165, 52, 0.95, 0.32);
  }

  /**
   * Plays a swirling chakra wind buildup followed by a massive Rasengan detonation shockwave.
   */
  playRasengan(): void {
    this.tone('sine', 320, 1480, 0.45, 0.24);
    this.tone('sawtooth', 520, 880, 0.4, 0.16);
    setTimeout(() => {
      this.tone('sawtooth', 260, 36, 0.95, 0.38);
      this.tone('triangle', 140, 28, 1.1, 0.35);
    }, 360);
  }

  /**
   * Plays a mystical portal open / island teleport chime.
   */
  playPortal(): void {
    this.tone('sine', 440, 880, 0.35, 0.22);
    this.tone('triangle', 660, 1320, 0.55, 0.24);
  }

  playHurt(): void {
    this.tone('sine', 100, 35, 0.28, 0.35);
  }

  playJump(): void {
    this.tone('sine', 240, 480, 0.16, 0.18);
  }

  playDash(): void {
    this.tone('triangle', 420, 140, 0.18, 0.22);
  }

  playShadeSpawn(): void {
    this.tone('sawtooth', 85, 55, 0.45, 0.15);
  }

  playCountdownTick(): void {
    this.tone('square', 660, 660, 0.06, 0.1);
  }

  playWin(): void {
    this.tone('triangle', 440, 880, 0.6, 0.3);
  }

  playLose(): void {
    this.tone('sawtooth', 180, 50, 0.7, 0.3);
  }
}

export const soundFx = new ProceduralAudio();
