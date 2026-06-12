type SfxName = 'attack' | 'hit' | 'loot' | 'eat' | 'craft' | 'hurt' | 'death';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.ctx.destination);
  }

  async resume(): Promise<void> {
    this.init();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(name: SfxName): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    switch (name) {
      case 'attack':
        this.tone(220, 0.04, 'square', 0.08, t);
        break;
      case 'hit':
        this.noise(0.06, 180, t);
        this.tone(90, 0.08, 'sawtooth', 0.12, t);
        break;
      case 'loot':
        this.tone(660, 0.06, 'sine', 0.1, t);
        this.tone(880, 0.08, 'sine', 0.08, t + 0.05);
        break;
      case 'eat':
        this.tone(140, 0.05, 'triangle', 0.1, t);
        this.tone(110, 0.07, 'triangle', 0.08, t + 0.06);
        break;
      case 'craft':
        this.tone(523, 0.08, 'sine', 0.12, t);
        this.tone(784, 0.1, 'sine', 0.1, t + 0.07);
        break;
      case 'hurt':
        this.tone(70, 0.15, 'sawtooth', 0.18, t);
        break;
      case 'death':
        this.tone(200, 0.2, 'triangle', 0.15, t);
        this.tone(80, 0.5, 'sine', 0.2, t + 0.15, 0.001);
        break;
    }
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    start: number,
    endFreq?: number,
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), start + duration);
    }
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(duration: number, cutoff: number, start: number): void {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}
