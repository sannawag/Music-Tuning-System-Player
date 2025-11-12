"use client"

import { cn } from "@/lib/utils"
import { useRef } from "react"

interface PianoKeyboardProps {
  onKeyPress: (note: string) => void
  selectedFundamental: string | null
  selectedIntervals: string[]
}

const whiteKeys = ["C", "D", "E", "F", "G", "A", "B"]
const blackKeyPattern = [
  { note: "C#", position: 0 },
  { note: "D#", position: 1 },
  { note: "F#", position: 3 },
  { note: "G#", position: 4 },
  { note: "A#", position: 5 },
]

const getFrequency = (note: string) => {
  const noteMap: { [key: string]: number } = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  }

  const match = note.match(/^([A-G]#?)(\d+)$/)
  if (!match) return 440

  const [, noteName, octaveStr] = match
  const octave = Number.parseInt(octaveStr)
  const noteNumber = noteMap[noteName]

  // A4 = 440 Hz, calculate from there
  const semitonesFromA4 = (octave - 4) * 12 + (noteNumber - 9)
  return 440 * Math.pow(2, semitonesFromA4 / 12)
}

export default function PianoKeyboard({ onKeyPress, selectedFundamental, selectedIntervals }: PianoKeyboardProps) {
  const audioContextRef = useRef<AudioContext | null>(null)

  const octaves = [0, 1, 2, 3, 4, 5, 6, 7, 8]

  // Helper function to determine if a key should be rendered (A0 starts, C8 ends)
  const shouldRenderKey = (note: string, octave: number) => {
    if (octave === 0) {
      // Only A0 and B0 (and A#0/Bb0)
      return note === "A" || note === "A#" || note === "B"
    }
    if (octave === 8) {
      // Only C8
      return note === "C"
    }
    return true
  }

  const isSelected = (note: string) => {
    return selectedFundamental === note || selectedIntervals.includes(note)
  }

  const isFundamental = (note: string) => {
    return selectedFundamental === note
  }

  const playNote = (note: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const freq = getFrequency(note)
    const osc = audioContextRef.current.createOscillator()
    const gain = audioContextRef.current.createGain()

    osc.frequency.value = freq
    osc.type = "sine"

    gain.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5)

    osc.connect(gain)
    gain.connect(audioContextRef.current.destination)

    osc.start()
    osc.stop(audioContextRef.current.currentTime + 0.5)
  }

  const handleKeyPress = (note: string) => {
    playNote(note)
    onKeyPress(note)
  }

  return (
    <div className="relative overflow-x-auto pb-4">
      <div className="flex min-w-max">
        {octaves.map((octave) => (
          <div key={octave} className="relative flex">
            {/* White Keys */}
            {whiteKeys.map((note, index) => {
              const fullNote = `${note}${octave}`

              if (!shouldRenderKey(note, octave)) return null

              const isMiddleC = fullNote === "C4"
              const isCKey = note === "C"

              return (
                <button
                  key={fullNote}
                  onClick={() => handleKeyPress(fullNote)}
                  className={cn(
                    "relative h-40 w-12 border-2 border-border bg-card transition-all duration-150",
                    "hover:bg-accent/20 active:bg-accent/40",
                    "rounded-b-lg shadow-md",
                    isSelected(fullNote) && !isFundamental(fullNote) && "bg-accent text-accent-foreground",
                    isFundamental(fullNote) && "bg-primary text-primary-foreground",
                    index === 0 && octave === 0 && "rounded-l-lg",
                  )}
                >
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    {isCKey ? (
                      <>
                        <span className="text-xs font-semibold">{fullNote}</span>
                        {isMiddleC && <div className="mt-1 text-[10px] font-bold text-primary">Middle C</div>}
                      </>
                    ) : (
                      <span className="text-xs font-semibold">{note}</span>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Black Keys */}
            <div className="absolute left-0 top-0 flex pointer-events-none">
              {blackKeyPattern.map(({ note, position }) => {
                const fullNote = `${note}${octave}`

                if (!shouldRenderKey(note, octave)) {
                  return null
                }

                // Calculate proper left offset: each white key is 48px (w-12), position 0-6
                // Black keys are offset within their white key positions
                const leftOffset = position * 48 + 36 // 36px = 75% into the white key

                return (
                  <button
                    key={fullNote}
                    onClick={() => handleKeyPress(fullNote)}
                    style={{
                      position: "absolute",
                      left: `${leftOffset}px`,
                    }}
                    className={cn(
                      "h-24 w-8 border-2 border-border bg-foreground text-background transition-all duration-150",
                      "hover:bg-foreground/80 active:bg-foreground/60",
                      "rounded-b-md shadow-lg pointer-events-auto",
                      isSelected(fullNote) &&
                        !isFundamental(fullNote) &&
                        "bg-accent text-accent-foreground border-accent",
                      isFundamental(fullNote) && "bg-primary text-primary-foreground border-primary",
                    )}
                  >
                    <div className="absolute bottom-1 left-0 right-0 text-center">
                      <span className="text-[10px] font-semibold">{note.replace("#", "♯")}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
