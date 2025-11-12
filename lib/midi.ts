// MIDI Export functionality
// Generates MIDI files for both Pythagorean and Equal Temperament tunings

interface MIDIEvent {
  deltaTime: number;
  data: number[];
}

export class MIDIExporter {
  private ppq = 480; // Pulses per quarter note (ticks per beat)

  /**
   * Convert frequency to MIDI note number
   * @param frequency - Frequency in Hz
   * @returns Object with note and cents deviation
   */
  private frequencyToMIDI(frequency: number): { note: number; cents: number } {
    // MIDI note = 69 + 12 * log2(freq/440)
    const midiFloat = 69 + 12 * Math.log2(frequency / 440);
    const midiNote = Math.round(midiFloat);
    const cents = (midiFloat - midiNote) * 100;

    return { note: midiNote, cents: cents };
  }

  /**
   * Convert cents to pitch bend value
   * Pitch bend range is typically ±2 semitones (±200 cents)
   * Pitch bend values: 0-16383, center is 8192
   * @param cents - Cents deviation
   * @returns Pitch bend value (0-16383)
   */
  private centsToPitchBend(cents: number): number {
    const bendRange = 200; // ±2 semitones in cents
    const bendValue = 8192 + (cents / bendRange) * 8192;
    return Math.max(0, Math.min(16383, Math.round(bendValue)));
  }

  /**
   * Create MIDI file bytes
   * @param tracks - Array of track data
   * @returns MIDI file bytes
   */
  private createMIDIFile(tracks: MIDIEvent[][]): Uint8Array {
    const chunks: Uint8Array[] = [];

    // Header chunk
    const headerChunk = this.createHeaderChunk(tracks.length);
    chunks.push(headerChunk);

    // Track chunks
    tracks.forEach(track => {
      chunks.push(this.createTrackChunk(track));
    });

    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const midiFile = new Uint8Array(totalLength);
    let offset = 0;
    chunks.forEach(chunk => {
      midiFile.set(chunk, offset);
      offset += chunk.length;
    });

    return midiFile;
  }

  /**
   * Create MIDI header chunk
   * @param numTracks - Number of tracks
   * @returns Header chunk bytes
   */
  private createHeaderChunk(numTracks: number): Uint8Array {
    const header = new Uint8Array(14);
    const view = new DataView(header.buffer);

    // "MThd" chunk identifier
    header[0] = 0x4D; // M
    header[1] = 0x54; // T
    header[2] = 0x68; // h
    header[3] = 0x64; // d

    // Chunk length (always 6 for header)
    view.setUint32(4, 6, false);

    // Format (1 = multiple tracks, synchronous)
    view.setUint16(8, 1, false);

    // Number of tracks
    view.setUint16(10, numTracks, false);

    // Division (ticks per quarter note)
    view.setUint16(12, this.ppq, false);

    return header;
  }

  /**
   * Create MIDI track chunk
   * @param events - Track events
   * @returns Track chunk bytes
   */
  private createTrackChunk(events: MIDIEvent[]): Uint8Array {
    const trackData = this.encodeTrackEvents(events);
    const header = new Uint8Array(8);
    const view = new DataView(header.buffer);

    // "MTrk" chunk identifier
    header[0] = 0x4D; // M
    header[1] = 0x54; // T
    header[2] = 0x72; // r
    header[3] = 0x6B; // k

    // Chunk length
    view.setUint32(4, trackData.length, false);

    const chunk = new Uint8Array(header.length + trackData.length);
    chunk.set(header, 0);
    chunk.set(trackData, header.length);

    return chunk;
  }

  /**
   * Encode track events
   * @param events - Track events
   * @returns Encoded track data
   */
  private encodeTrackEvents(events: MIDIEvent[]): Uint8Array {
    const bytes: number[] = [];

    events.forEach(event => {
      // Delta time
      this.writeVarLength(bytes, event.deltaTime);

      // Event data
      bytes.push(...event.data);
    });

    return new Uint8Array(bytes);
  }

  /**
   * Write variable length quantity
   * @param bytes - Byte array to write to
   * @param value - Value to encode
   */
  private writeVarLength(bytes: number[], value: number): void {
    const buffer: number[] = [];
    buffer.push(value & 0x7F);

    value >>= 7;
    while (value > 0) {
      buffer.push((value & 0x7F) | 0x80);
      value >>= 7;
    }

    bytes.push(...buffer.reverse());
  }

  /**
   * Generate Pythagorean tuning MIDI file
   * @param chordSequence - Chord sequence with parsed chords and calculated frequencies
   * @param baseDuration - Base duration in seconds
   * @param tempo - Tempo in BPM
   * @returns MIDI file bytes
   */
  generatePythagoreanMIDI(
    chordSequence: Array<{
      pythagoreanNotes: Array<{ frequency: number }>;
      duration: number;
    }>,
    baseDuration = 1,
    tempo = 120
  ): Uint8Array {
    const microsecondsPerBeat = Math.round(60000000 / tempo);
    const ticksPerSecond = (this.ppq * tempo) / 60;

    const tracks: MIDIEvent[][] = [];

    // Track 0: Tempo track
    const tempoTrack: MIDIEvent[] = [
      { deltaTime: 0, data: [0xFF, 0x51, 0x03,
        (microsecondsPerBeat >> 16) & 0xFF,
        (microsecondsPerBeat >> 8) & 0xFF,
        microsecondsPerBeat & 0xFF] },
      { deltaTime: 0, data: [0xFF, 0x2F, 0x00] } // End of track
    ];
    tracks.push(tempoTrack);

    // Track 1: Notes with pitch bend
    const noteTrack: MIDIEvent[] = [];
    let currentTicks = 0;

    chordSequence.forEach((chord, chordIndex) => {
      const durationTicks = Math.round(chord.duration * baseDuration * ticksPerSecond);

      chord.pythagoreanNotes.forEach((noteData, noteIndex) => {
        const { note, cents } = this.frequencyToMIDI(noteData.frequency);
        const channel = Math.min(noteIndex, 15); // Use different channels for each note

        // Pitch bend message (only if not centered)
        if (Math.abs(cents) > 0.5) {
          noteTrack.push({
            deltaTime: chordIndex === 0 && noteIndex === 0 ? 0 : 0,
            data: [0xE0 | channel, this.centsToPitchBend(cents) & 0x7F, (this.centsToPitchBend(cents) >> 7) & 0x7F]
          });
        }

        // Note on
        noteTrack.push({
          deltaTime: 0,
          data: [0x90 | channel, note, 80] // Velocity 80
        });
      });

      // Note off messages
      chord.pythagoreanNotes.forEach((noteData, noteIndex) => {
        const { note } = this.frequencyToMIDI(noteData.frequency);
        const channel = Math.min(noteIndex, 15);

        noteTrack.push({
          deltaTime: noteIndex === 0 ? durationTicks : 0,
          data: [0x80 | channel, note, 0]
        });
      });

      currentTicks += durationTicks;
    });

    // End of track
    noteTrack.push({ deltaTime: 0, data: [0xFF, 0x2F, 0x00] });
    tracks.push(noteTrack);

    return this.createMIDIFile(tracks);
  }

  /**
   * Generate Equal Temperament MIDI file
   * @param chordSequence - Chord sequence with parsed chords and calculated frequencies
   * @param baseDuration - Base duration in seconds
   * @param tempo - Tempo in BPM
   * @returns MIDI file bytes
   */
  generateEqualTemperamentMIDI(
    chordSequence: Array<{
      equalTemperamentNotes: Array<{ frequency: number }>;
      duration: number;
    }>,
    baseDuration = 1,
    tempo = 120
  ): Uint8Array {
    const microsecondsPerBeat = Math.round(60000000 / tempo);
    const ticksPerSecond = (this.ppq * tempo) / 60;

    const tracks: MIDIEvent[][] = [];

    // Track 0: Tempo track
    const tempoTrack: MIDIEvent[] = [
      { deltaTime: 0, data: [0xFF, 0x51, 0x03,
        (microsecondsPerBeat >> 16) & 0xFF,
        (microsecondsPerBeat >> 8) & 0xFF,
        microsecondsPerBeat & 0xFF] },
      { deltaTime: 0, data: [0xFF, 0x2F, 0x00] } // End of track
    ];
    tracks.push(tempoTrack);

    // Track 1: Notes (no pitch bend)
    const noteTrack: MIDIEvent[] = [];

    chordSequence.forEach((chord, chordIndex) => {
      const durationTicks = Math.round(chord.duration * baseDuration * ticksPerSecond);

      chord.equalTemperamentNotes.forEach((noteData, noteIndex) => {
        const { note } = this.frequencyToMIDI(noteData.frequency);
        const channel = Math.min(noteIndex, 15);

        // Note on
        noteTrack.push({
          deltaTime: chordIndex === 0 && noteIndex === 0 ? 0 : 0,
          data: [0x90 | channel, note, 80]
        });
      });

      // Note off messages
      chord.equalTemperamentNotes.forEach((noteData, noteIndex) => {
        const { note } = this.frequencyToMIDI(noteData.frequency);
        const channel = Math.min(noteIndex, 15);

        noteTrack.push({
          deltaTime: noteIndex === 0 ? durationTicks : 0,
          data: [0x80 | channel, note, 0]
        });
      });
    });

    // End of track
    noteTrack.push({ deltaTime: 0, data: [0xFF, 0x2F, 0x00] });
    tracks.push(noteTrack);

    return this.createMIDIFile(tracks);
  }

  /**
   * Download MIDI file
   * @param midiData - MIDI file bytes
   * @param filename - Filename
   */
  downloadMIDI(midiData: Uint8Array, filename: string): void {
    const blob = new Blob([midiData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
