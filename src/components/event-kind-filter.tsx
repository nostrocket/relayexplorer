"use client"

import * as React from "react"
import { FancyBox, type FancyBoxItem } from "@/components/ui/fancy-box"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { eventKinds, popularKinds } from "@/lib/event-kinds"
import { FilterIcon, XIcon } from "lucide-react"

interface EventKindFilterProps {
  selectedKinds: number[]
  onKindsChange: (kinds: number[]) => void
  className?: string
}

const PRESET_FILTERS = [
  { label: "Core", kinds: [0, 1, 3, 4, 6, 7] },
  { label: "Social", kinds: [0, 1, 6, 7, 1111] },
  { label: "Media", kinds: [20, 21, 22, 1063, 1222] },
  { label: "Commerce", kinds: [1021, 1022, 30017, 30018, 30020] },
  { label: "Bitcoin", kinds: [9734, 9735, 7375, 13194] },
  { label: "Popular", kinds: popularKinds },
]

export function EventKindFilter({ selectedKinds, onKindsChange, className }: EventKindFilterProps) {
  // Convert event kinds to FancyBox items
  const fancyBoxItems: FancyBoxItem[] = React.useMemo(
    () => eventKinds.map((kind) => ({
      value: kind.kind.toString(),
      label: `${kind.kind}: ${kind.label}`,
      description: kind.description,
      category: kind.category,
      deprecated: kind.deprecated,
    })),
    []
  )

  // Convert selected kinds to strings for FancyBox
  const selectedValues = selectedKinds.map(String)

  const handleSelectionChange = React.useCallback(
    (values: string[]) => {
      // Parse custom values as numbers and filter out invalid ones
      const kinds = values
        .map((v) => parseInt(v, 10))
        .filter((k) => !isNaN(k))
        .sort((a, b) => a - b)
      onKindsChange(kinds)
    },
    [onKindsChange]
  )

  const applyPreset = React.useCallback(
    (preset: typeof PRESET_FILTERS[0]) => {
      onKindsChange(preset.kinds)
    },
    [onKindsChange]
  )

  const clearAll = React.useCallback(() => {
    onKindsChange([])
  }, [onKindsChange])

  const hasFilters = selectedKinds.length > 0

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Event Kinds</span>
        {hasFilters && (
          <Badge variant="secondary" className="text-xs">
            {selectedKinds.length}
          </Badge>
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 w-6 p-0 ml-auto"
          >
            <XIcon className="h-3 w-3" />
          </Button>
        )}
      </div>

      <FancyBox
        items={fancyBoxItems}
        selectedValues={selectedValues}
        onSelectionChange={handleSelectionChange}
        placeholder="Filter by event kinds..."
        searchPlaceholder="Search event kinds..."
        maxDisplay={2}
        allowCustomValues={true}
        customValuePlaceholder="Add custom kind number..."
        groupByCategory={true}
        className="w-full"
      />

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1 mt-2">
        {PRESET_FILTERS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset)}
            className="h-6 px-2 text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Active filters display */}
      {hasFilters && (
        <div className="mt-2 text-xs text-muted-foreground">
          Filtering {selectedKinds.length} event kind{selectedKinds.length !== 1 ? 's' : ''}:
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedKinds.slice(0, 10).map((kind) => {
              const eventKind = eventKinds.find((k) => k.kind === kind)
              return (
                <Badge
                  key={kind}
                  variant="outline"
                  className={`text-xs ${eventKind?.deprecated ? 'opacity-60' : ''}`}
                >
                  {kind}
                </Badge>
              )
            })}
            {selectedKinds.length > 10 && (
              <Badge variant="outline" className="text-xs">
                +{selectedKinds.length - 10} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}