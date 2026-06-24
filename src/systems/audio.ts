import { gameState } from './gameState';

type MusicCue = 'field' | 'battle' | 'menu' | 'victory';
type SfxCue = 'confirm' | 'cancel' | 'menu' | 'hit' | 'heal' | 'save' | 'load' | 'error' | 'battleStart' | 'victory';

type PatternNote = {
  frequency: number;
  duration: number;
  gap: number;
};

const MUSIC_PATTERNS: Record<MusicCue, PatternNote[]> = {
  field: [
    { frequency: 392, duration: 0.12, gap: 0.28 },
    { frequency: 523.25, duration: 0.14, gap: 0.24 },
    { frequency: 587.33, duration: 0.1, gap: 0.3 },
    { frequency: 493.88, duration: 0.18, gap: 0.42 }
  ],
  battle: [
    { frequency: 196, duration: 0.1, gap: 0.12 },
    { frequency: 261.63, duration: 0.08, gap: 0.1 },
    { frequency: 329.63, duration: 0.08, gap: 0.1 },
    { frequency: 392, duration: 0.12, gap: 0.18 }
  ],
  menu: [
    { frequency: 329.63, duration: 0.1, gap: 0.36 },
    { frequency: 392, duration: 0.1, gap: 0.36 },
    { frequency: 493.88, duration: 0.16, gap: 0.48 }
  ],
  victory: [
    { frequency: 523.25, duration: 0.13, gap: 0.08 },
    { frequency: 659.25, duration: 0.13, gap: 0.08 },
    { frequency: 783.99, duration: 0.28, gap: 0.22 }
  ]
};

class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private currentMusic: MusicCue | null = null;
  private noteIndex = 0;

  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.12;
    this.masterGain.connect(this.context.destination);
  }

  playMusic(cue: MusicCue): void {
    if (!gameState.snapshot.options.musicEnabled) {
      this.stopMusic();
      return;
    }

    this.unlock();
    if (!this.context || !this.masterGain) return;
    if (this.currentMusic === cue && this.musicTimer !== null) return;

    this.stopMusic();
    this.currentMusic = cue;
    this.noteIndex = 0;
    this.scheduleNextMusicNote();
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentMusic = null;
  }

  refreshMusicState(): void {
    if (!gameState.snapshot.options.musicEnabled) this.stopMusic();
  }

  playSfx(cue: SfxCue): void {
    if (!gameState.snapshot.options.sfxEnabled) return;
    this.unlock();
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    if (cue === 'confirm') this.playTone(740, 0.045, 0.08, 'square', now);
    if (cue === 'cancel') this.playTone(220, 0.07, 0.08, 'sawtooth', now);
    if (cue === 'menu') this.playArp([440, 660], 0.04);
    if (cue === 'hit') this.playNoise(0.08);
    if (cue === 'heal') this.playArp([523.25, 659.25, 783.99], 0.06);
    if (cue === 'save') this.playArp([392, 523.25, 659.25], 0.07);
    if (cue === 'load') this.playArp([659.25, 523.25, 392], 0.07);
    if (cue === 'error') this.playTone(146.83, 0.11, 0.1, 'sawtooth', now);
    if (cue === 'battleStart') this.playArp([196, 246.94, 293.66], 0.05);
    if (cue === 'victory') this.playArp([523.25, 659.25, 783.99, 1046.5], 0.09);
  }

  private scheduleNextMusicNote(): void {
    if (!this.currentMusic || !this.context || !this.masterGain) return;
    if (!gameState.snapshot.options.musicEnabled) {
      this.stopMusic();
      return;
    }

    const pattern = MUSIC_PATTERNS[this.currentMusic];
    const note = pattern[this.noteIndex % pattern.length];
    this.playTone(note.frequency, note.duration, 0.035, 'triangle', this.context.currentTime);
    this.noteIndex += 1;

    this.musicTimer = window.setTimeout(() => this.scheduleNextMusicNote(), (note.duration + note.gap) * 1000);
  }

  private playArp(frequencies: number[], stepDuration: number): void {
    if (!this.context) return;
    frequencies.forEach((frequency, index) => {
      this.playTone(frequency, stepDuration, 0.09, 'square', this.context!.currentTime + index * stepDuration * 1.2);
    });
  }

  private playTone(frequency: number, duration: number, volume: number, type: OscillatorType, startTime: number): void {
    if (!this.context || !this.masterGain) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  private playNoise(duration: number): void {
    if (!this.context || !this.masterGain) return;

    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = 0.08;
    noise.buffer = buffer;
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
}

export const audioManager = new AudioManager();

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
