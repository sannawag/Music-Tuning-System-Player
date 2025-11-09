// Pythagorean Tuning System
// This module calculates frequencies using pure 3:2 fifths (Pythagorean ratios)

export const PythagoreanTuning = {
  // Base Pythagorean interval ratios (within one octave)
  intervals: {
    '1': 1/1,           // Unison
    'b2': 256/243,      // Minor 2nd
    '2': 9/8,           // Major 2nd
    'b3': 32/27,        // Minor 3rd
    '3': 81/64,         // Major 3rd (Pythagorean third)
    '4': 4/3,           // Perfect 4th
    '#4': 729/512,      // Augmented 4th / Tritone
    'b5': 729/512,      // Diminished 5th (same as #4 in Pythagorean)
    '5': 3/2,           // Perfect 5th
    'b6': 128/81,       // Minor 6th
    '6': 27/16,         // Major 6th
    'b7': 16/9,         // Minor 7th
    '7': 243/128,       // Major 7th
    '8': 2/1,           // Octave
  },

  // Note names to semitone offsets from A
  noteToSemitone: {
    'C': -9, 'C#': -8, 'Db': -8,
    'D': -7, 'D#': -6, 'Eb': -6,
    'E': -5,
    'F': -4, 'F#': -3, 'Gb': -3,
    'G': -2, 'G#': -1, 'Ab': -1,
    'A': 0, 'A#': 1, 'Bb': 1,
    'B': 2
  },

  /**
   * Parse a note string (e.g., "A4", "C#3", "Bb5") to frequency
   * @param {string} note - Note name with octave (e.g., "A4")
   * @returns {number} - Frequency in Hz
   */
  noteToFrequency(note) {
    const match = note.match(/^([A-G][#b]?)(-?\d+)$/);
    if (!match) {
      throw new Error(`Invalid note format: ${note}. Use format like A4, C#3, Bb5`);
    }

    const noteName = match[1];
    const octave = parseInt(match[2]);
    
    // Calculate semitones from A4 (440 Hz)
    const semitoneOffset = this.noteToSemitone[noteName];
    if (semitoneOffset === undefined) {
      throw new Error(`Invalid note name: ${noteName}`);
    }
    
    const totalSemitones = semitoneOffset + (octave - 4) * 12;
    
    // Use equal temperament for the base frequency calculation
    // (since we're starting from A4 = 440 Hz standard)
    return 440 * Math.pow(2, totalSemitones / 12);
  },

  /**
   * Parse interval notation and return the ratio
   * Supports simple intervals (1-8) and compound intervals (9+)
   * @param {string} interval - Interval notation (e.g., "3", "b7", "9", "#11")
   * @returns {number} - Frequency ratio
   */
  getIntervalRatio(interval) {
    interval = interval.trim();
    
    // Check if it's a simple interval (within one octave)
    if (this.intervals[interval]) {
      return this.intervals[interval];
    }
    
    // Handle compound intervals (larger than octave)
    const match = interval.match(/^([#b]?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid interval: ${interval}`);
    }
    
    const accidental = match[1];
    const number = parseInt(match[2]);
    
    if (number <= 8) {
      // Must be a simple interval we don't have
      throw new Error(`Unknown interval: ${interval}`);
    }
    
    // Calculate compound interval
    // e.g., 9 = 2 + octave, 10 = 3 + octave, etc.
    const octaves = Math.floor((number - 1) / 7);
    const simpleIntervalNumber = ((number - 1) % 7) + 1;
    const simpleInterval = accidental + simpleIntervalNumber;
    
    if (!this.intervals[simpleInterval]) {
      throw new Error(`Unknown compound interval: ${interval} (derived from ${simpleInterval})`);
    }
    
    // Multiply by 2 for each octave
    return this.intervals[simpleInterval] * Math.pow(2, octaves);
  },

  /**
   * Calculate frequency for a note at a given interval from fundamental
   * @param {number} fundamental - Fundamental frequency in Hz
   * @param {string} interval - Interval notation
   * @returns {number} - Resulting frequency in Hz
   */
  calculateFrequency(fundamental, interval) {
    const ratio = this.getIntervalRatio(interval);
    return fundamental * ratio;
  },

  /**
   * Calculate all frequencies for a chord given fundamental and intervals
   * @param {string|number} fundamental - Note name (e.g., "A4") or frequency in Hz
   * @param {string[]} intervals - Array of interval notations
   * @returns {Object} - Object with fundamental frequency and array of chord frequencies
   */
  calculateChord(fundamental, intervals) {
    let fundamentalFreq;
    
    // Parse fundamental
    if (typeof fundamental === 'string') {
      // Try parsing as note name first
      try {
        fundamentalFreq = this.noteToFrequency(fundamental);
      } catch (e) {
        // Try parsing as number
        fundamentalFreq = parseFloat(fundamental);
        if (isNaN(fundamentalFreq)) {
          throw new Error(`Invalid fundamental: ${fundamental}`);
        }
      }
    } else {
      fundamentalFreq = fundamental;
    }

    // Calculate frequencies for each interval
    const frequencies = intervals.map(interval => {
      return {
        interval: interval,
        frequency: this.calculateFrequency(fundamentalFreq, interval),
        ratio: this.getIntervalRatio(interval)
      };
    });

    return {
      fundamental: fundamentalFreq,
      notes: frequencies
    };
  },

  /**
   * Calculate equal temperament frequency for comparison
   * @param {number} fundamental - Fundamental frequency in Hz
   * @param {string} interval - Interval notation
   * @returns {number} - Equal temperament frequency
   */
  calculateEqualTemperament(fundamental, interval) {
    // Map interval to semitones
    const intervalToSemitones = {
      '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5,
      '#4': 6, 'b5': 6, '5': 7, 'b6': 8, '6': 9, 'b7': 10, '7': 11, '8': 12
    };

    const match = interval.match(/^([#b]?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid interval: ${interval}`);
    }

    const accidental = match[1];
    const number = parseInt(match[2]);
    
    let semitones;
    if (number <= 8) {
      semitones = intervalToSemitones[interval];
      if (semitones === undefined) {
        throw new Error(`Unknown interval for equal temperament: ${interval}`);
      }
    } else {
      // Compound interval
      const octaves = Math.floor((number - 1) / 7);
      const simpleNumber = ((number - 1) % 7) + 1;
      const simpleInterval = accidental + simpleNumber;
      semitones = intervalToSemitones[simpleInterval] + (octaves * 12);
    }

    return fundamental * Math.pow(2, semitones / 12);
  },

  /**
   * Calculate the difference in cents between Pythagorean and Equal Temperament
   * @param {number} pythagoreanFreq - Pythagorean frequency
   * @param {number} equalTempFreq - Equal temperament frequency
   * @returns {number} - Difference in cents
   */
  centsDifference(pythagoreanFreq, equalTempFreq) {
    return 1200 * Math.log2(pythagoreanFreq / equalTempFreq);
  }
};
