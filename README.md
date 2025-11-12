# Pythagorean Chord Tool

A standalone web application for creating chord sequences with pure Pythagorean tuning. Play chords in the browser and export them as MIDI files for use in DAWs and synthesizers.

Available at https://music-tuning-system-player.vercel.app/

## Features

- **Pure Pythagorean Tuning**: Uses authentic 3:2 fifth ratios for mathematically pure intervals
- **Flexible Input**: Specify fundamentals as note names (A4, C#3) or frequencies in Hz (440, 261.63)
- **Extended Intervals**: Support for compound intervals (9ths, 10ths, 11ths, etc.) beyond the octave
- **Real-time Playback**: Play chord sequences directly in the browser using Web Audio API
- **MIDI Export**: Export both Pythagorean and Equal Temperament versions for comparison
- **Visual Analysis**: See exact frequencies, ratios, and cent differences from equal temperament

## How to Use

### Input Format

Enter chord sequences using this format:
```
Fundamental: intervals, duration=multiplier
```

#### Examples:

**Basic major chord progression:**
```
C4: 1,3,5, duration=2
F4: 1,3,5, duration=2
G4: 1,3,5, duration=2
C4: 1,3,5, duration=4
```

**Minor progression with Hz input:**
```
A3: 1,b3,5, duration=1.5
D4: 1,b3,5, duration=1.5
E4: 1,3,5, duration=1.5
A3: 1,b3,5, duration=3
```

**Extended jazz voicing with compound intervals:**
```
440: 1,3,5,7,9,11, duration=4
```

### Fundamentals

- **Note names**: A4, C#3, Bb5, F2, etc.
- **Frequencies**: 440, 261.63, 523.25, etc.

### Intervals

**Simple intervals (within one octave):**
- 1 (unison)
- b2, 2 (seconds)
- b3, 3 (thirds)
- 4 (fourth)
- #4/b5 (tritone)
- 5 (fifth)
- b6, 6 (sixths)
- b7, 7 (sevenths)
- 8 (octave)

**Compound intervals (beyond octave):**
- 9, b9, 10, b10, 11, #11, 12, b13, 13, 14, 15, etc.

### Duration

- Optional multiplier of the base duration (defaults to 1)
- Base duration can be set in the UI (default: 1 second)

## Pythagorean Tuning

This tool uses authentic Pythagorean tuning based on pure 3:2 fifths:

| Interval | Ratio | Cents |
|----------|-------|-------|
| Unison | 1/1 | 0 |
| Minor 2nd | 256/243 | 90.2 |
| Major 2nd | 9/8 | 203.9 |
| Minor 3rd | 32/27 | 294.1 |
| Major 3rd | 81/64 | 407.8 |
| Perfect 4th | 4/3 | 498.0 |
| Tritone | 729/512 | 611.7 |
| Perfect 5th | 3/2 | 702.0 |
| Minor 6th | 128/81 | 792.2 |
| Major 6th | 27/16 | 905.9 |
| Minor 7th | 16/9 | 996.1 |
| Major 7th | 243/128 | 1109.8 |
| Octave | 2/1 | 1200 |

## MIDI Export

### Pythagorean MIDI
- Uses pitch bend messages to achieve exact Pythagorean frequencies
- Pitch bend range: ±2 semitones (±200 cents)
- Compatible with synthesizers that support pitch bend

### Equal Temperament MIDI
- Standard MIDI notes for comparison
- No pitch bend messages

## Running the Tool

### Option 1: Simple (Recommended for non-programmers)
1. Download or receive the `pythagorean-chord-tool` folder
2. Open the `index.html` file directly in your web browser by double-clicking it
3. The tool will work immediately in your browser

### Option 2: Local Server (Better for advanced features)
If you have Python installed:
1. Open a terminal/command prompt in the `pythagorean-chord-tool` directory
2. Run: `python -m http.server 8000`
3. Open `http://localhost:8000` in your browser

**Note:** For the best experience, use a modern web browser like Chrome, Firefox, or Edge. Some features may not work in older browsers.

## Technical Details

### Architecture

- **tuning.js**: Pythagorean frequency calculations and interval parsing
- **parser.js**: Input parsing and validation
- **audio.js**: Web Audio API playback system
- **midi.js**: MIDI file generation and export

### Browser Requirements

- Modern browser with Web Audio API support
- ES6 modules support
- HTTPS required for audio playback (or localhost)

## Examples

### Simple Major Triad
```
C4: 1,3,5
```
Creates a C major triad with frequencies: 261.63 Hz, 327.03 Hz, 392.44 Hz

### Extended Jazz Voicing
```
Bb3: 1,b3,5,b7,9,11
```
Creates a Bb11 chord with compound intervals

### Microtonal Cluster
```
A4: 1,b2,2,b3,3,4,#4,5
```
Creates a dense cluster of notes around A4

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests!
