"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Square, Download, Moon, Sun, Info, Plus } from "lucide-react"
import PianoKeyboard from "@/components/piano-keyboard"
import FrequencyDisplay from "@/components/frequency-display"
import { PythagoreanTuning } from "@/lib/tuning"
import { Parser } from "@/lib/parser"
import { AudioPlayer } from "@/lib/audio"
import { MIDIExporter } from "@/lib/midi"

export default function PythagoreanChordTool() {
  const [darkMode, setDarkMode] = useState(false)
  const [chordInput, setChordInput] = useState("")
  const [baseDuration, setBaseDuration] = useState(1.0)
  const [tempo, setTempo] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [status, setStatus] = useState("")
  const [frequencies, setFrequencies] = useState<any[]>([])

  const [selectedFundamental, setSelectedFundamental] = useState<string | null>(null)
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>([])

  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const midiExporterRef = useRef<MIDIExporter>(new MIDIExporter())

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    // Initialize audio module
    audioPlayerRef.current = new AudioPlayer()
  }, [darkMode])

  const loadExample = () => {
    const example = Parser.getExampleSequence()
    setChordInput(example)
    setStatus("Example loaded!")
  }

  const parseAndDisplay = () => {
    try {
      const parsedChords = Parser.parseChordSequence(chordInput)
      const processedSequence = parsedChords.map(chord => {
        const pythagoreanChord = PythagoreanTuning.calculateChord(chord.fundamental, chord.intervals)

        // Also calculate equal temperament for comparison
        const equalTemperamentNotes = chord.intervals.map(interval => {
          const freq = PythagoreanTuning.calculateEqualTemperament(pythagoreanChord.fundamental, interval)
          return { interval, frequency: freq }
        })

        return {
          fundamental: chord.fundamental,
          fundamentalFreq: pythagoreanChord.fundamental,
          intervals: chord.intervals,
          duration: chord.duration,
          pythagoreanNotes: pythagoreanChord.notes,
          equalTemperamentNotes: equalTemperamentNotes,
          frequencies: pythagoreanChord.notes.map(n => n.frequency)
        }
      })

      setFrequencies(processedSequence)
      setStatus(`Successfully parsed ${parsedChords.length} chord(s)`)
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      setFrequencies([])
    }
  }

  const playSequence = async () => {
    if (frequencies.length === 0) {
      setStatus("Please parse the input first!")
      return
    }

    if (!audioPlayerRef.current) return

    try {
      setIsPlaying(true)
      setStatus("Playing...")

      await audioPlayerRef.current.playSequence(frequencies.map(chord => ({
        frequencies: chord.frequencies,
        duration: chord.duration * baseDuration
      })), 1)

      setIsPlaying(false)
      setStatus("Playback complete")
      setTimeout(() => setStatus(""), 3000)
    } catch (error) {
      setIsPlaying(false)
      setStatus(`Playback error: ${(error as Error).message}`)
    }
  }

  const stopPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop()
    }
    setIsPlaying(false)
    setStatus("Stopped")
  }

  const exportPythagoreanMIDI = () => {
    if (frequencies.length === 0 || !midiExporterRef.current) return

    try {
      const midiData = midiExporterRef.current.generatePythagoreanMIDI(frequencies, baseDuration, tempo)
      midiExporterRef.current.downloadMIDI(midiData, 'pythagorean_chords.mid')
      setStatus('Pythagorean MIDI file downloaded')
      setTimeout(() => setStatus(""), 3000)
    } catch (error) {
      setStatus(`Export error: ${(error as Error).message}`)
    }
  }

  const exportEqualTemperamentMIDI = () => {
    if (frequencies.length === 0 || !midiExporterRef.current) return

    try {
      const midiData = midiExporterRef.current.generateEqualTemperamentMIDI(frequencies, baseDuration, tempo)
      midiExporterRef.current.downloadMIDI(midiData, 'equal_temperament_chords.mid')
      setStatus('Equal Temperament MIDI file downloaded')
      setTimeout(() => setStatus(""), 3000)
    } catch (error) {
      setStatus(`Export error: ${(error as Error).message}`)
    }
  }

  const handleKeySelect = (note: string) => {
    if (!selectedFundamental) {
      setSelectedFundamental(note)
      setSelectedIntervals([])
      setStatus(`Fundamental: ${note}. Now select interval notes.`)
    } else {
      if (selectedIntervals.includes(note)) {
        setSelectedIntervals(selectedIntervals.filter((n) => n !== note))
      } else {
        setSelectedIntervals([...selectedIntervals, note])
      }
    }
  }

  const addToSequence = () => {
    if (!selectedFundamental || selectedIntervals.length === 0) {
      setStatus("Please select fundamental and at least one interval note")
      return
    }

    const fundFreq = PythagoreanTuning.noteToFrequency(selectedFundamental)

    const sortedIntervals = selectedIntervals.sort((a, b) => {
      return PythagoreanTuning.noteToFrequency(a) - PythagoreanTuning.noteToFrequency(b)
    })

    const scaleDegrees = sortedIntervals.map((note) => {
      const ratio = PythagoreanTuning.noteToFrequency(note) / fundFreq
      const semitones = Math.round(12 * Math.log2(ratio))
      return semitonesToScaleDegree(semitones)
    })

    const intervalsStr = scaleDegrees.join(",")
    const newLine = `${selectedFundamental}: ${intervalsStr}, duration=1`
    setChordInput((prev: string) => (prev ? `${prev}\n${newLine}` : newLine))
    setStatus("Chord added to sequence!")
  }

  const semitonesToScaleDegree = (totalSemitones: number): string => {
    const octaves = Math.floor(totalSemitones / 12)
    const semitonesInOctave = totalSemitones % 12

    const semitoneToScaleDegree: { [key: number]: string } = {
      0: "1",      // Unison
      1: "b2",     // Minor 2nd
      2: "2",      // Major 2nd
      3: "b3",     // Minor 3rd
      4: "3",      // Major 3rd
      5: "4",      // Perfect 4th
      6: "b5",     // Tritone (diminished 5th)
      7: "5",      // Perfect 5th
      8: "b6",     // Minor 6th
      9: "6",      // Major 6th
      10: "b7",    // Minor 7th
      11: "7"      // Major 7th
    }

    const baseDegree = semitoneToScaleDegree[semitonesInOctave] || "1"
    if (octaves === 0) return baseDegree

    // For compound intervals, add octave offset
    const degreeNumber = parseInt(baseDegree.replace(/[^\d]/g, ''))
    const accidental = baseDegree.replace(/\d/g, '')
    const compoundDegree = degreeNumber + (octaves * 7)

    return accidental + compoundDegree
  }

  const newChord = () => {
    setSelectedFundamental(null)
    setSelectedIntervals([])
    setStatus("Ready to build new chord")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-4xl md:text-5xl text-balance bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Pythagorean Chord Tool
            </h1>
            <p className="mt-2 text-muted-foreground text-lg">Create chord sequences with pure Pythagorean tuning</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDarkMode(!darkMode)} className="shrink-0">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        {/* Piano Keyboard */}
        <Card className="border-2 border-primary/20 shadow-xl bg-card/50 backdrop-blur mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🎹 Visual Piano Keyboard</CardTitle>
            <CardDescription>Click keys to build chords visually. First click sets the fundamental note.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PianoKeyboard
              onKeyPress={handleKeySelect}
              selectedFundamental={selectedFundamental}
              selectedIntervals={selectedIntervals}
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-mono text-muted-foreground">
                  {selectedFundamental ? (
                    <>
                      <span className="text-primary font-semibold">Fundamental:</span> {selectedFundamental}
                      {selectedIntervals.length > 0 && (
                        <>
                          {" | "}
                          <span className="text-accent font-semibold">Intervals:</span> {selectedIntervals.join(", ")}
                        </>
                      )}
                    </>
                  ) : (
                    "Click a key to select the fundamental note"
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={addToSequence}
                  size="sm"
                  disabled={!selectedFundamental || selectedIntervals.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Sequence
                </Button>
                <Button onClick={newChord} variant="outline" size="sm" disabled={!selectedFundamental}>
                  New Chord
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Chord Sequence Input</CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Format:{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  Fundamental: intervals, duration=multiplier
                </code>
                <br />
                Example: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">C4: 1,3,5, duration=2</code>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={chordInput}
              onChange={(e) => setChordInput(e.target.value)}
              placeholder="Enter chord sequences..."
              className="min-h-[150px] font-mono text-sm"
            />
            <Button onClick={loadExample} variant="secondary" size="sm">
              Load Example
            </Button>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Playback Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseDuration">Base Duration (seconds)</Label>
                <Input
                  id="baseDuration"
                  type="number"
                  step="0.1"
                  value={baseDuration}
                  onChange={(e) => setBaseDuration(Number.parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempo">Tempo (BPM)</Label>
                <Input
                  id="tempo"
                  type="number"
                  value={tempo}
                  onChange={(e) => setTempo(Number.parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={parseAndDisplay} className="flex-1 min-w-[150px]">
                Parse & Display
              </Button>
              <Button
                onClick={playSequence}
                disabled={isPlaying || frequencies.length === 0}
                variant="secondary"
                className="flex-1 min-w-[120px]"
              >
                <Play className="mr-2 h-4 w-4" />
                Play
              </Button>
              <Button
                onClick={stopPlayback}
                disabled={!isPlaying}
                variant="destructive"
                className="flex-1 min-w-[120px]"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={exportPythagoreanMIDI}
                disabled={frequencies.length === 0}
                variant="outline"
                className="flex-1 min-w-[180px] bg-transparent"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Pythagorean MIDI
              </Button>
              <Button
                onClick={exportEqualTemperamentMIDI}
                disabled={frequencies.length === 0}
                variant="outline"
                className="flex-1 min-w-[180px] bg-transparent"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Equal Temp MIDI
              </Button>
            </div>

            {status && (
              <div className="rounded-lg bg-muted p-3 text-sm font-medium text-muted-foreground">{status}</div>
            )}
          </CardContent>
        </Card>

        {/* Frequency Display */}
        {frequencies.length > 0 && <FrequencyDisplay frequencies={frequencies} />}
      </div>
    </div>
  )
}
