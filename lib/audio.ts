// Web Audio API playback system
// Generates and plays sine waves for each chord tone

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private currentScheduledNodes: { oscillator: OscillatorNode; gainNode: GainNode }[] = [];
  private masterGain: GainNode | null = null;

  /**
   * Initialize audio context
   */
  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3; // Set master volume
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Create and schedule an oscillator for a specific frequency
   * @param frequency - Frequency in Hz
   * @param startTime - Start time in audio context time
   * @param duration - Duration in seconds
   * @param volume - Volume multiplier (0-1)
   */
  private scheduleNote(
    frequency: number,
    startTime: number,
    duration: number,
    volume = 0.15
  ): OscillatorNode {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('Audio context not initialized');
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Envelope: quick attack, sustain, quick release
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01); // 10ms attack
    gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // 50ms release

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);

    this.currentScheduledNodes.push({ oscillator, gainNode });

    return oscillator;
  }

  /**
   * Play a single chord
   * @param frequencies - Array of frequencies in Hz
   * @param startTime - Start time in audio context time
   * @param duration - Duration in seconds
   */
  private playChord(frequencies: number[], startTime: number, duration: number): void {
    const volume = 0.15 / Math.sqrt(frequencies.length); // Adjust volume based on number of notes

    frequencies.forEach(freq => {
      this.scheduleNote(freq, startTime, duration, volume);
    });
  }

  /**
   * Play a sequence of chords
   * @param chordSequence - Array of chord objects with frequencies and durations
   * @param baseDuration - Base duration in seconds
   * @returns Promise that resolves when playback is complete
   */
  async playSequence(
    chordSequence: Array<{ frequencies: number[]; duration: number }>,
    baseDuration = 1
  ): Promise<void> {
    await this.init();

    this.stop(); // Stop any currently playing audio
    this.isPlaying = true;

    const currentTime = this.audioContext!.currentTime;
    let scheduleTime = currentTime + 0.1; // Start with small delay

    chordSequence.forEach(chord => {
      const duration = chord.duration * baseDuration;
      this.playChord(chord.frequencies, scheduleTime, duration);
      scheduleTime += duration;
    });

    // Calculate total duration
    const totalDuration = chordSequence.reduce((sum, chord) => {
      return sum + (chord.duration * baseDuration);
    }, 0);

    // Return promise that resolves when playback is done
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isPlaying = false;
        this.currentScheduledNodes = [];
        resolve();
      }, (totalDuration + 0.2) * 1000); // Add small buffer
    });
  }

  /**
   * Stop all currently playing/scheduled audio
   */
  stop(): void {
    if (!this.audioContext) return;

    const currentTime = this.audioContext.currentTime;

    this.currentScheduledNodes.forEach(({ oscillator, gainNode }) => {
      try {
        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.01);
        oscillator.stop(currentTime + 0.01);
      } catch (e) {
        // Oscillator may have already stopped
      }
    });

    this.currentScheduledNodes = [];
    this.isPlaying = false;
  }

  /**
   * Set master volume
   * @param volume - Volume level (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(volume, this.audioContext!.currentTime);
    }
  }

  /**
   * Get current playing state
   * @returns Whether audio is currently playing
   */
  getPlayingState(): boolean {
    return this.isPlaying;
  }

  /**
   * Clean up audio context
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
