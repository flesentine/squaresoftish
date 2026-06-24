import { gameState } from './gameState';

type MusicCue = 'field' | 'battle' | 'menu' | 'victory';
type SfxCue = 'confirm' | 'cancel' | 'menu' | 'hit' | 'heal' | 'save' | 'load' | 'error' | 'battleStart' | 'victory';
type Instrument = 'lead' | 'bell' | 'bass' | 'pad' | 'kick' | 'snare' | 'hat';

type Channel = {
  instrument: Instrument;
  volume: number;
  echo: number;
  notes: Array<string | null>;
};

type Song = {
  bpm: number;
  channels: Channel[];
};

const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11
};

const SONGS: Record<MusicCue, Song> = {
  field: {
    bpm: 118,
    channels: [
      { instrument: 'lead', volume: 0.07, echo: 0.45, notes: ['E5:2', null, 'G5', 'A5', 'B5:2', null, 'A5', 'G5', 'E5', 'D5', 'E5:2', null, 'B4', 'D5', 'E5:2', null, 'G5:2', null, 'A5', 'B5', 'D6:2', null, 'B5', 'A5', 'G5', 'E5', 'D5', 'E5', 'G5:2', null, 'E5:2', null] },
      { instrument: 'bell', volume: 0.04, echo: 0.6, notes: ['E6', null, 'B5', null, 'G5', null, 'B5', null, 'D6', null, 'A5', null, 'E5', null, 'A5', null] },
      { instrument: 'bass', volume: 0.08, echo: 0.08, notes: ['E2:2', null, 'E3', null, 'D2:2', null, 'D3', null, 'C2:2', null, 'C3', null, 'D2:2', null, 'D3', null] },
      { instrument: 'hat', volume: 0.018, echo: 0.02, notes: [null, 'x', null, 'x', null, 'x', null, 'x', null, 'x', null, 'x', null, 'x', null, 'x'] }
    ]
  },
  battle: {
    bpm: 152,
    channels: [
      { instrument: 'lead', volume: 0.085, echo: 0.28, notes: ['E5', 'G5', 'B5', 'E6', 'D6:2', null, 'B5', 'A5', 'G5', 'B5', 'D6', 'G6', 'F#6:2', null, 'D6', 'B5', 'A5', 'C6', 'E6', 'A6', 'G6:2', null, 'E6', 'C6', 'B5', 'D6', 'F#6', 'B6', 'A6', 'G6', 'F#6', 'D6'] },
      { instrument: 'bass', volume: 0.095, echo: 0.04, notes: ['E2', 'E2', 'E3', 'E2', 'D2', 'D2', 'D3', 'D2', 'C2', 'C2', 'C3', 'C2', 'D2', 'D2', 'D3', 'D2'] },
      { instrument: 'kick', volume: 0.1, echo: 0.01, notes: ['x', null, null, null, 'x', null, null, null, 'x', null, null, 'x', 'x', null, null, null] },
      { instrument: 'snare', volume: 0.075, echo: 0.06, notes: [null, null, null, null, 'x', null, null, null, null, null, null, null, 'x', null, null, null] },
      { instrument: 'hat', volume: 0.025, echo: 0.02, notes: ['x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x'] }
    ]
  },
  menu: {
    bpm: 94,
    channels: [
      { instrument: 'bell', volume: 0.052, echo: 0.62, notes: ['G5:2', null, 'B5', null, 'D6:2', null, 'B5', null, 'A5:2', null, 'C6', null, 'E6:2', null, 'C6', null] },
      { instrument: 'bass', volume: 0.06, echo: 0.06, notes: ['G2:4', null, null, null, 'A2:4', null, null, null, 'E2:4', null, null, null, 'D2:4', null, null, null] }
    ]
  },
  victory: {
    bpm: 132,
    channels: [
      { instrument: 'lead', volume: 0.09, echo: 0.36, notes: ['C5', 'E5', 'G5', 'C6:2', null, 'G5', 'C6', 'E6:4', null, null, null, null] },
      { instrument: 'bell', volume: 0.06, echo: 0.5, notes: ['G5', 'C6', 'E6', 'G6:2', null, 'E6', 'G6', 'C7:4', null, null, null, null] },
      { instrument: 'bass', volume: 0.08, echo: 0.05, notes: ['C2:2', null, 'G2:2', null, 'C3:6', null, null, null, null, null, null, null] }
    ]
  }
};

class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private echoDelay: DelayNode | null = null;
  private musicTimer: number | null = null;
  private currentMusic: MusicCue | null = null;
  private stepIndex = 0;
  private noiseBuffer: AudioBuffer | null = null;

  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.16;
    this.masterGain.connect(this.context.destination);

    this.echoDelay = this.context.createDelay(1.2);
    this.echoDelay.delayTime.value = 0.185;
    const feedback = this.context.createGain();
    feedback.gain.value = 0.24;
    const echoReturn = this.context.createGain();
    echoReturn.gain.value = 0.36;
    this.echoDelay.connect(feedback);
    feedback.connect(this.echoDelay);
    this.echoDelay.connect(echoReturn);
    echoReturn.connect(this.masterGain);

    this.noiseBuffer = this.createNoiseBuffer(1);
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
    this.stepIndex = 0;
    this.scheduleNextMusicStep();
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
    if (!this.context) return;

    const now = this.context.currentTime;
    if (cue === 'confirm') this.playNote('B5', 0.055, 0.09, 'bell', now, 0.1);
    if (cue === 'cancel') this.playNote('D3', 0.08, 0.1, 'bass', now, 0.02);
    if (cue === 'menu') this.playArp(['E5', 'B5'], 0.045, 'bell');
    if (cue === 'hit') this.playDrum('snare', 0.09, now, 0.03);
    if (cue === 'heal') this.playArp(['C5', 'E5', 'G5', 'C6'], 0.055, 'bell');
    if (cue === 'save') this.playArp(['G4', 'C5', 'E5', 'G5'], 0.06, 'bell');
    if (cue === 'load') this.playArp(['G5', 'E5', 'C5', 'G4'], 0.06, 'bell');
    if (cue === 'error') this.playNote('C2', 0.13, 0.12, 'bass', now, 0);
    if (cue === 'battleStart') this.playArp(['E3', 'B3', 'E4', 'G4'], 0.05, 'lead');
    if (cue === 'victory') this.playArp(['C5', 'E5', 'G5', 'C6', 'E6'], 0.075, 'lead');
  }

  private scheduleNextMusicStep(): void {
    if (!this.currentMusic || !this.context || !this.masterGain) return;
    if (!gameState.snapshot.options.musicEnabled) {
      this.stopMusic();
      return;
    }

    const song = SONGS[this.currentMusic];
    const stepDuration = 60 / song.bpm / 2;
    const now = this.context.currentTime + 0.012;

    for (const channel of song.channels) {
      const cell = channel.notes[this.stepIndex % channel.notes.length];
      if (!cell) continue;

      if (cell === 'x') {
        this.playDrum(channel.instrument, channel.volume, now, channel.echo);
      } else {
        const [note, stepText] = cell.split(':');
        const steps = Number(stepText ?? 1);
        const duration = stepDuration * (Number.isFinite(steps) ? steps : 1) * 0.86;
        this.playNote(note, duration, channel.volume, channel.instrument, now, channel.echo);
      }
    }

    this.stepIndex += 1;
    this.musicTimer = window.setTimeout(() => this.scheduleNextMusicStep(), stepDuration * 1000);
  }

  private playArp(notes: string[], stepDuration: number, instrument: Instrument): void {
    if (!this.context) return;
    notes.forEach((note, index) => {
      this.playNote(note, stepDuration, 0.09, instrument, this.context!.currentTime + index * stepDuration * 1.12, 0.18);
    });
  }

  private playNote(note: string, duration: number, volume: number, instrument: Instrument, startTime: number, echoAmount: number): void {
    if (!this.context || !this.masterGain) return;
    if (instrument === 'kick' || instrument === 'snare' || instrument === 'hat') {
      this.playDrum(instrument, volume, startTime, echoAmount);
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const frequency = this.noteToFrequency(note);

    oscillator.type = instrument === 'bell' ? 'triangle' : instrument === 'bass' ? 'square' : instrument === 'pad' ? 'sawtooth' : 'square';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(instrument === 'bass' ? 900 : instrument === 'pad' ? 1200 : 2600, startTime);
    filter.Q.value = 0.8;

    const attack = instrument === 'pad' ? 0.025 : 0.006;
    const release = instrument === 'bell' ? 0.18 : 0.08;
    const peak = Math.max(0.0001, volume);
    const sustain = peak * (instrument === 'bass' ? 0.52 : instrument === 'pad' ? 0.28 : 0.35);
    const attackEnd = startTime + attack;
    const decayEnd = attackEnd + 0.1;
    const releaseEnd = startTime + duration + release;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, attackEnd);
    gain.gain.exponentialRampToValueAtTime(sustain, decayEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    this.connectEcho(gain, echoAmount);
    oscillator.start(startTime);
    oscillator.stop(releaseEnd + 0.03);

    if (instrument === 'lead') this.addLeadDouble(frequency, duration, volume * 0.22, startTime, echoAmount * 0.5);
  }

  private addLeadDouble(frequency: number, duration: number, volume: number, startTime: number, echoAmount: number): void {
    if (!this.context || !this.masterGain) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.detune.setValueAtTime(8, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.08);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    this.connectEcho(gain, echoAmount);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.12);
  }

  private playDrum(instrument: Instrument, volume: number, startTime: number, echoAmount = 0): void {
    if (!this.context || !this.masterGain || !this.noiseBuffer) return;

    if (instrument === 'kick') {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, startTime);
      osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.11);
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.16);
      return;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    source.buffer = this.noiseBuffer;
    filter.type = instrument === 'hat' ? 'highpass' : 'bandpass';
    filter.frequency.value = instrument === 'hat' ? 5200 : 1600;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (instrument === 'hat' ? 0.035 : 0.09));
    source.playbackRate.value = instrument === 'hat' ? 1.9 : 1.15;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    this.connectEcho(gain, echoAmount);
    source.start(startTime);
  }

  private connectEcho(node: AudioNode, amount: number): void {
    if (!this.context || !this.echoDelay || amount <= 0) return;
    const echoSend = this.context.createGain();
    echoSend.gain.value = amount;
    node.connect(echoSend);
    echoSend.connect(this.echoDelay);
  }

  private noteToFrequency(note: string): number {
    const match = note.match(/^([A-G](?:#|b)?)(\d)$/);
    if (!match) return 440;
    const [, name, octaveText] = match;
    const octave = Number(octaveText);
    const midi = (octave + 1) * 12 + NOTE_OFFSETS[name];
    return 440 * 2 ** ((midi - 69) / 12);
  }

  private createNoiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.context) return null;
    const bufferSize = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) output[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

export const audioManager = new AudioManager();

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
