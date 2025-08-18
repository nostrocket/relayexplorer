"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Wifi, WifiOff, AlertCircle } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { useNIP66RelayDiscovery } from "@/hooks/useNIP66RelayDiscovery"

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
  placeholder = "Enter relay URL or select from discovered relays..." 
}: RelayComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  
  const { 
    loading, 
    error, 
    getRelaysForCombobox, 
    getRelayByUrl,
    refreshRelays,
    lastUpdated 
  } = useNIP66RelayDiscovery()

  const availableRelays = getRelaysForCombobox()
  const selectedRelay = availableRelays.find(relay => relay.value === value)
  const selectedNIP66Relay = getRelayByUrl(value)

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
          <div className="flex items-center gap-2 truncate">
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {selectedNIP66Relay && (
              <>
                {selectedNIP66Relay.status === 'online' && <Wifi className="h-3 w-3 text-green-500" />}
                {selectedNIP66Relay.status === 'offline' && <WifiOff className="h-3 w-3 text-red-500" />}
                {selectedNIP66Relay.status === 'unknown' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
              </>
            )}
            <span className="truncate text-left">
              {selectedRelay ? selectedRelay.label : value || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={loading ? "Type relay URL or search (discovering more relays...)" : "Type relay URL or search..."}
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
              {inputValue.startsWith('wss://') || inputValue.startsWith('ws://') ? (
                <div className="py-4 text-center">
                  <span>Press Enter to use: <code className="text-xs bg-muted px-1 rounded">{inputValue}</code></span>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Discovering more relays via NIP-66...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-500">Failed to discover relays</span>
                  <Button variant="outline" size="sm" onClick={refreshRelays}>
                    Retry
                  </Button>
                </div>
              ) : (
                "No relays found. Type a WebSocket URL (wss:// or ws://)"
              )}
            </CommandEmpty>
            
            {availableRelays.length > 0 && (
              <CommandGroup heading={loading ? `Relays (${availableRelays.length}, discovering more...)` : `Discovered Relays (${availableRelays.length})`}>
                {availableRelays
                  .filter(relay => 
                    !inputValue || 
                    relay.label.toLowerCase().includes(inputValue.toLowerCase()) ||
                    relay.value.toLowerCase().includes(inputValue.toLowerCase()) ||
                    (relay.description && relay.description.toLowerCase().includes(inputValue.toLowerCase()))
                  )
                  .map((relay) => {
                    const nip66Relay = getRelayByUrl(relay.value);
                    return (
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
                        <div className="flex items-center gap-2 flex-1">
                          {nip66Relay && (
                            <>
                              {nip66Relay.status === 'online' && <Wifi className="h-3 w-3 text-green-500" />}
                              {nip66Relay.status === 'offline' && <WifiOff className="h-3 w-3 text-red-500" />}
                              {nip66Relay.status === 'unknown' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                            </>
                          )}
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{relay.label}</span>
                              {nip66Relay && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(nip66Relay.confidence * 100)}%
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {relay.value}
                            </span>
                            {relay.description && (
                              <span className="text-xs text-muted-foreground opacity-70">
                                {relay.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            )}
            
            {lastUpdated && (
              <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}