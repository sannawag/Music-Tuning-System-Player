// Parser for chord sequence input
// Handles parsing of user input like "A4: 1,3,5, duration=2"

export interface ParsedChord {
  fundamental: string;
  intervals: string[];
  duration: number;
}

export class Parser {
  /**
   * Parse a single chord line
   * Format: "fundamental: intervals, duration=multiplier"
   * Examples:
   *   "A4: 1,3,5, duration=2"
   *   "440: 1,b3,5, duration=1.5"
   *   "C#3: 1,3,5,7,9, duration=1"
   *
   * @param line - Single line of chord input
   * @returns Parsed chord object
   */
  static parseChordLine(line: string): ParsedChord | null {
    line = line.trim();

    if (!line || line.startsWith('#') || line.startsWith('//')) {
      // Empty line or comment
      return null;
    }

    // Split by colon to separate fundamental from intervals and duration
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid format: Missing colon. Expected format: "A4: 1,3,5, duration=2"`);
    }

    const fundamental = line.substring(0, colonIndex).trim();
    const remainder = line.substring(colonIndex + 1).trim();

    // Split remainder by comma to get intervals and duration
    const parts = remainder.split(',').map(p => p.trim());

    const intervals: string[] = [];
    let duration = 1; // Default duration multiplier

    for (const part of parts) {
      if (part.toLowerCase().startsWith('duration')) {
        // Parse duration
        const durationMatch = part.match(/duration\s*=\s*([0-9.]+)/i);
        if (!durationMatch) {
          throw new Error(`Invalid duration format: ${part}. Expected format: "duration=2"`);
        }
        duration = parseFloat(durationMatch[1]);
        if (isNaN(duration) || duration <= 0) {
          throw new Error(`Invalid duration value: ${durationMatch[1]}. Must be a positive number.`);
        }
      } else if (part) {
        // This is an interval
        intervals.push(part);
      }
    }

    if (intervals.length === 0) {
      throw new Error(`No intervals specified for fundamental ${fundamental}`);
    }

    return {
      fundamental,
      intervals,
      duration
    };
  }

  /**
   * Parse entire chord sequence input
   * @param input - Multi-line chord sequence
   * @returns Array of parsed chord objects
   */
  static parseChordSequence(input: string): ParsedChord[] {
    const lines = input.split('\n');
    const chords: ParsedChord[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const chord = this.parseChordLine(lines[i]);
        if (chord) {
          chords.push(chord);
        }
      } catch (error) {
        throw new Error(`Line ${i + 1}: ${(error as Error).message}`);
      }
    }

    if (chords.length === 0) {
      throw new Error('No valid chords found in input');
    }

    return chords;
  }

  /**
   * Validate parsed chord data
   * @param chord - Parsed chord object
   * @returns True if valid
   * @throws Error if invalid
   */
  static validateChord(chord: ParsedChord): boolean {
    if (!chord.fundamental) {
      throw new Error('Missing fundamental');
    }

    if (!Array.isArray(chord.intervals) || chord.intervals.length === 0) {
      throw new Error('No intervals specified');
    }

    if (typeof chord.duration !== 'number' || chord.duration <= 0) {
      throw new Error('Invalid duration');
    }

    return true;
  }

  /**
   * Generate example chord sequence
   * @returns Example input
   */
  static getExampleSequence(): string {
    return `# Major chord progression in C
C4: 1,3,5, duration=2
F4: 1,3,5, duration=2
G4: 1,3,5, duration=2
C4: 1,3,5, duration=4

# Minor progression in A
A3: 1,b3,5, duration=1.5
D4: 1,b3,5, duration=1.5
E4: 1,3,5, duration=1.5
A3: 1,b3,5, duration=3

# Extended jazz voicing
# Using Hz input and compound intervals
440: 1,3,5,7,9,11, duration=4`;
  }
}
