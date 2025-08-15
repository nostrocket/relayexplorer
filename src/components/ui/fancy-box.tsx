"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CheckIcon, ChevronDownIcon, XIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FancyBoxItem {
  value: string
  label: string
  description?: string
  category?: string
  deprecated?: boolean
}

interface FancyBoxProps {
  items: FancyBoxItem[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  maxDisplay?: number
  allowCustomValues?: boolean
  customValuePlaceholder?: string
  groupByCategory?: boolean
}

export function FancyBox({
  items,
  selectedValues,
  onSelectionChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search items...",
  className,
  maxDisplay = 3,
  allowCustomValues = false,
  customValuePlaceholder = "Add custom value...",
  groupByCategory = false,
}: FancyBoxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [customValue, setCustomValue] = React.useState("")

  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedValues.includes(item.value)),
    [items, selectedValues]
  )

  const displayedItems = selectedItems.slice(0, maxDisplay)
  const extraCount = selectedItems.length - maxDisplay

  const handleSelect = React.useCallback(
    (value: string) => {
      const newSelection = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value]
      onSelectionChange(newSelection)
    },
    [selectedValues, onSelectionChange]
  )

  const handleRemove = React.useCallback(
    (value: string) => {
      const newSelection = selectedValues.filter((v) => v !== value)
      onSelectionChange(newSelection)
    },
    [selectedValues, onSelectionChange]
  )

  const handleAddCustom = React.useCallback(
    (value: string) => {
      if (value && !selectedValues.includes(value)) {
        onSelectionChange([...selectedValues, value])
        setCustomValue("")
      }
    },
    [selectedValues, onSelectionChange]
  )

  const filteredItems = React.useMemo(() => {
    return items.filter((item) =>
      item.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.value.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [items, searchValue])

  const groupedItems = React.useMemo(() => {
    if (!groupByCategory) return { ungrouped: filteredItems }
    
    return filteredItems.reduce((groups, item) => {
      const category = item.category || "Other"
      if (!groups[category]) groups[category] = []
      groups[category].push(item)
      return groups
    }, {} as Record<string, FancyBoxItem[]>)
  }, [filteredItems, groupByCategory])

  const clearAll = React.useCallback(() => {
    onSelectionChange([])
  }, [onSelectionChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between text-left font-normal", className)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {displayedItems.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {displayedItems.map((item) => (
                  <Badge
                    key={item.value}
                    variant="secondary"
                    className={cn(
                      "text-xs hover:bg-secondary",
                      item.deprecated && "opacity-60"
                    )}
                  >
                    {item.label}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRemove(item.value)
                      }}
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {extraCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    +{extraCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          {selectedValues.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {selectedValues.length} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
              <CommandSeparator />
            </>
          )}
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <CommandGroup key={category} heading={groupByCategory ? category : undefined}>
                {categoryItems.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => handleSelect(item.value)}
                    className={cn(
                      "flex items-center gap-2",
                      item.deprecated && "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedValues.includes(item.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}>
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          item.deprecated && "line-through"
                        )}>
                          {item.label}
                        </span>
                        {item.deprecated && (
                          <Badge variant="outline" className="text-xs">
                            deprecated
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {allowCustomValues && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Custom">
                  <div className="px-2 py-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={customValuePlaceholder}
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddCustom(customValue)
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddCustom(customValue)}
                        disabled={!customValue}
                        className="h-7 w-7 p-0"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}