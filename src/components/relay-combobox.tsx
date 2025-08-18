"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { popularRelays } from "@/lib/relay-data"

interface RelayComboboxProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function RelayCombobox({ 
  value, 
  onValueChange, 
  disabled = false,
  placeholder = "Enter relay URL or select from popular relays..." 
}: RelayComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const selectedRelay = popularRelays.find(relay => relay.value === value)

  React.useEffect(() => {
    if (!open) {
      setInputValue(value)
    }
  }, [value, open])

  React.useEffect(() => {
    if (open) {
      setInputValue("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full"
          disabled={disabled}
        >
          <span className="truncate text-left">
            {selectedRelay ? selectedRelay.label : value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Type relay URL or search..."
            value={inputValue}
            onValueChange={(search) => {
              setInputValue(search)
              if (search.startsWith('wss://') || search.startsWith('ws://')) {
                onValueChange(search)
              } else if (search === "") {
                // Don't change the actual value when clearing the search
                // This allows users to see all relays while keeping their selection
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (inputValue.startsWith('wss://') || inputValue.startsWith('ws://'))) {
                onValueChange(inputValue)
                setOpen(false)
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue.startsWith('wss://') || inputValue.startsWith('ws://') 
                ? "Press Enter to use custom relay" 
                : "No relays found. Type a WebSocket URL (wss:// or ws://)"}
            </CommandEmpty>
            <CommandGroup heading="Popular Relays">
              {popularRelays
                .filter(relay => 
                  !inputValue || 
                  relay.label.toLowerCase().includes(inputValue.toLowerCase()) ||
                  relay.value.toLowerCase().includes(inputValue.toLowerCase()) ||
                  (relay.description && relay.description.toLowerCase().includes(inputValue.toLowerCase()))
                )
                .map((relay) => (
                  <CommandItem
                    key={relay.value}
                    value={relay.value}
                    onSelect={() => {
                      onValueChange(relay.value)
                      setInputValue(relay.value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === relay.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{relay.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {relay.value}
                      </span>
                      {relay.description && (
                        <span className="text-xs text-muted-foreground opacity-70">
                          {relay.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}