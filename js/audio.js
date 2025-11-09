// Web Audio API playback system
// Generates and plays sine waves for each chord tone

export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.currentScheduledNodes = [];
    this.masterGain = null;
  }

  /**
   * Initialize audio context
   */
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3; // Set master volume
    }
    
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      return this.audioContext.resume();
    }
    
    return Promise.resolve();
  }

  /**
   * Create and schedule an oscillator for a specific frequency
   * @param {number} frequency - Frequency in Hz
   * @param {number} startTime - Start time in audio context time
   * @param {number} duration - Duration in seconds
   * @param {number} volume - Volume multiplier (0-1)
   */
  scheduleNote(frequency, startTime, duration, volume = 0.15) {
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
   * @param {Array} frequencies - Array of frequencies in Hz
   * @param {number} startTime - Start time in audio context time
   * @param {number} duration - Duration in seconds
   */
  playChord(frequencies, startTime, duration) {
    const volume = 0.15 / Math.sqrt(frequencies.length); // Adjust volume based on number of notes
    
    frequencies.forEach(freq => {
      this.scheduleNote(freq, startTime, duration, volume);
    });
  }

  /**
   * Play a sequence of chords
   * @param {Array} chordSequence - Array of chord objects with frequencies and durations
   * @param {number} baseDuration - Base duration in seconds
   * @returns {Promise} - Resolves when playback is complete
   */
  async playSequence(chordSequence, baseDuration = 1) {
    await this.init();
    
    this.stop(); // Stop any currently playing audio
    this.isPlaying = true;
    
    const currentTime = this.audioContext.currentTime;
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
  stop() {
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
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }

  /**
   * Get current playing state
   * @returns {boolean}
   */
  getPlayingState() {
    return this.isPlaying;
  }

  /**
   * Clean up audio context
   */
  dispose() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
