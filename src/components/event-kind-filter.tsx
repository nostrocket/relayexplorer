import * as React from "react"
import { Input } from "@/components/ui/input"

interface EventKindFilterProps {
  selectedKinds: number[]
  onKindsChange: (kinds: number[]) => void
  className?: string
}

export function EventKindFilter({ selectedKinds, onKindsChange, className }: EventKindFilterProps) {
  const [text, setText] = React.useState(() => selectedKinds.join(", "))

  React.useEffect(() => {
    const fromProps = selectedKinds.join(", ")
    const parsedFromText = text
      .split(",")
      .map(s => parseInt(s.trim(), 10))
      .filter(n => Number.isFinite(n) && n >= 0)
    if (parsedFromText.join(", ") !== fromProps) {
      setText(fromProps)
    }
  }, [selectedKinds]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (value: string) => {
    setText(value)
    const kinds = value
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => parseInt(s, 10))
      .filter(n => Number.isFinite(n) && n >= 0)
    onKindsChange(kinds)
  }

  return (
    <Input
      type="text"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Filter by kinds (comma-separated)"
      className={className}
    />
  )
}
