export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.initialized = true;
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
  }

  public playMove(): void {
    if (!this.audioContext || this.isMuted) return;
    this.playTone(300, 'square', 0.05);
  }

  public playRotate(): void {
    if (!this.audioContext || this.isMuted) return;
    this.playTone(400, 'sine', 0.05);
    setTimeout(() => this.playTone(350, 'sine', 0.05), 50);
  }

  public playDrop(): void {
    if (!this.audioContext || this.isMuted) return;
    this.playTone(200, 'sine', 0.08);
  }

  public playHardDrop(): void {
    if (!this.audioContext || this.isMuted) return;
    this.playTone(100, 'square', 0.1);
    setTimeout(() => this.playTone(80, 'square', 0.15), 50);
  }

  public playLineClear(): void {
    if (!this.audioContext || this.isMuted) return;
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.1), i * 50);
    });
  }

  public playTetra(): void {
    if (!this.audioContext || this.isMuted) return;
    const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.15);
        this.playTone(freq * 2, 'square', 0.15);
      }, i * 80);
    });
  }

  public playHold(): void {
    if (!this.audioContext || this.isMuted) return;
    this.playTone(350, 'triangle', 0.08);
    setTimeout(() => this.playTone(450, 'triangle', 0.08), 60);
  }

  public playGameOver(): void {
    if (!this.audioContext || this.isMuted) return;
    const melody = [392, 349.23, 329.63, 261.63];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.3);
        this.playTone(freq / 2, 'square', 0.3);
      }, i * 200);
    });
  }

  public playLevelUp(): void {
    if (!this.audioContext || this.isMuted) return;
    const frequencies = [440, 554.37, 659.25, 880];
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.12);
        this.playTone(freq * 1.5, 'square', 0.12);
      }, i * 100);
    });
  }

  private playTone(frequency: number, type: OscillatorType, duration: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    if (this.masterGain) {
      gainNode.connect(this.masterGain);
    } else {
      gainNode.connect(this.audioContext.destination);
    }

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const soundEngine = new SoundEngine();