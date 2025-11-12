import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FrequencyDisplayProps {
  frequencies: Array<{
    fundamental: string
    fundamentalFreq: number
    intervals: string[]
    duration: number
    pythagoreanNotes: Array<{ interval: string; frequency: number; ratio: number }>
    equalTemperamentNotes: Array<{ interval: string; frequency: number }>
    frequencies: number[]
  }>
}

export default function FrequencyDisplay({ frequencies }: FrequencyDisplayProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Frequency Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {frequencies.map((chord, chordIndex) => (
          <div key={chordIndex} className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                {chordIndex + 1}
              </span>
              Chord: {chord.fundamental} - Duration: {chord.duration}s
            </h3>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Interval</TableHead>
                    <TableHead className="font-semibold">Pythagorean (Hz)</TableHead>
                    <TableHead className="font-semibold">Equal Temp (Hz)</TableHead>
                    <TableHead className="font-semibold">Difference (cents)</TableHead>
                    <TableHead className="font-semibold">Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chord.pythagoreanNotes.map((note, i) => {
                    const etNote = chord.equalTemperamentNotes[i]
                    const centsDiff = (1200 * Math.log2(note.frequency / etNote.frequency))

                    return (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-semibold">{note.interval}</TableCell>
                        <TableCell className="font-mono">{note.frequency.toFixed(2)}</TableCell>
                        <TableCell className="font-mono">{etNote.frequency.toFixed(2)}</TableCell>
                        <TableCell className="font-mono">
                          <span className={centsDiff > 0 ? "text-accent" : "text-primary"}>
                            {centsDiff > 0 ? "+" : ""}
                            {centsDiff.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">{note.ratio.toFixed(4)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
