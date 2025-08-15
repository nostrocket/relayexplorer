"use client"

import * as React from "react"
import { Command } from "lucide-react"
import type { NDKEvent } from '@nostr-dev-kit/ndk'

import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { RelayConnector } from "@/components/relay-connector"
import { RelayStatus } from "@/components/relay-status"
import { useEvents } from "@/hooks/useEvents"
import { useProfiles } from "@/hooks/useProfiles"
import { useNostr } from "@/contexts/NostrContext"
import { mockData } from "@/mock/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EventKindFilter } from "@/components/event-kind-filter"

interface AuthorInfo {
  pubkey: string;
  displayName: string;
  shortPubkey: string;
  avatarUrl?: string;
  hasProfile: boolean;
}

// Utility function to extract unique pubkeys from events with profile data
const extractUniquePubkeys = (
  events: NDKEvent[], 
  getDisplayName: (pubkey: string) => string,
  getAvatarUrl: (pubkey: string) => string | null,
  getProfile: (pubkey: string) => any
): AuthorInfo[] => {
  const pubkeySet = new Set<string>();
  
  events.forEach(event => {
    if (event.pubkey) {
      pubkeySet.add(event.pubkey);
    }
  });
  
  return Array.from(pubkeySet).map(pubkey => ({
    pubkey,
    displayName: getDisplayName(pubkey),
    shortPubkey: pubkey.substring(0, 8),
    avatarUrl: getAvatarUrl(pubkey) || undefined,
    hasProfile: !!getProfile(pubkey)
  })).sort((a, b) => {
    // Prioritize profiles with usernames (hasProfile = true) over truncated pubkeys
    if (a.hasProfile && !b.hasProfile) return -1;
    if (!a.hasProfile && b.hasProfile) return 1;
    
    // Within each group, sort alphabetically by display name
    return a.displayName.localeCompare(b.displayName);
  });
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onEventSelect?: (event: NDKEvent) => void
}

export function AppSidebar({ onEventSelect, ...props }: AppSidebarProps) {
  const [activePubkey, setActivePubkey] = React.useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<NDKEvent | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedKinds, setSelectedKinds] = React.useState<number[]>([])
  const { setOpen } = useSidebar()
  const { isConnected } = useNostr()
  
  // Get all events first
  const { events: allEvents, updateFilter } = useEvents({})
  
  // Get profile management hooks
  const { requestProfiles, getDisplayName, getAvatarUrl, getProfile } = useProfiles()
  
  // Extract unique pubkeys with profile data
  const uniquePubkeys = React.useMemo(() => 
    extractUniquePubkeys(allEvents, getDisplayName, getAvatarUrl, getProfile), 
    [allEvents, getDisplayName, getAvatarUrl, getProfile]
  )
  
  // Request profiles for discovered pubkeys
  React.useEffect(() => {
    const pubkeys = uniquePubkeys.map(author => author.pubkey);
    if (pubkeys.length > 0) {
      requestProfiles(pubkeys);
    }
  }, [uniquePubkeys, requestProfiles]);
  
  // Note: No auto-selection of pubkey - "All Profiles" is default
  
  // Filter events locally by active pubkey
  const events = React.useMemo(() => {
    if (!activePubkey) return allEvents;
    return allEvents.filter(event => event.pubkey === activePubkey);
  }, [allEvents, activePubkey])

  // Update filter when search term or kinds change
  React.useEffect(() => {
    updateFilter({ 
      search: searchTerm,
      kinds: selectedKinds.length > 0 ? selectedKinds : []
    });
  }, [searchTerm, selectedKinds, updateFilter]);

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Nostr Relay</span>
                    <span className="truncate text-xs">Explorer</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="scrollbar-hide">
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {/* Show All Profiles Button */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{
                      children: "Show events from all profiles",
                      hidden: false,
                    }}
                    onClick={() => {
                      setActivePubkey(null)
                      setOpen(true)
                    }}
                    isActive={activePubkey === null}
                    className="px-2.5 md:px-2 flex items-center gap-2 font-medium"
                  >
                    <div className="h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      All
                    </div>
                    <span className="truncate">All Profiles</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {uniquePubkeys.map((authorInfo) => (
                  <SidebarMenuItem key={authorInfo.pubkey}>
                    <SidebarMenuButton
                      tooltip={{
                        children: authorInfo.displayName,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActivePubkey(authorInfo.pubkey)
                        setOpen(true)
                      }}
                      isActive={activePubkey === authorInfo.pubkey}
                      className="px-2.5 md:px-2 flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage 
                          src={authorInfo.avatarUrl || `https://robohash.org/${authorInfo.pubkey}`} 
                        />
                        <AvatarFallback className="text-xs">
                          {authorInfo.pubkey.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{authorInfo.displayName}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={mockData.user} />
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <RelayConnector />
          <RelayStatus />
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activePubkey ? getDisplayName(activePubkey) : 'All Profiles'}
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Real-time</span>
              <Switch className="shadow-none" defaultChecked />
            </Label>
          </div>
          <SidebarInput 
            placeholder="Search events..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <EventKindFilter
            selectedKinds={selectedKinds}
            onKindsChange={setSelectedKinds}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {!isConnected ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Connect to a relay to view events
                </div>
              ) : events.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No events found
                </div>
              ) : (
                <>
                  {/* Profile Preview */}
                  <div className="border-b p-4 bg-sidebar-accent/50">
                    <div className="flex items-start gap-3">
                      {activePubkey ? (
                        <>
                          <Avatar className="h-12 w-12">
                            <AvatarImage 
                              src={getAvatarUrl(activePubkey) || `https://robohash.org/${activePubkey}`} 
                            />
                            <AvatarFallback className="text-sm">
                              {activePubkey.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {getDisplayName(activePubkey)}
                            </div>
                            {getProfile(activePubkey)?.about && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {getProfile(activePubkey)?.about}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1 font-mono">
                              {activePubkey.substring(0, 16)}...
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-12 w-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            All
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              All Profiles
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Showing events from all {uniquePubkeys.length} profile{uniquePubkeys.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Events List */}
                  {events.map((event) => {
                  const isSelected = selectedEvent?.id === event.id
                  const createdAt = event.created_at ? new Date(event.created_at * 1000) : new Date()
                  const content = event.content || 'No content'
                  const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content
                  const authorShort = event.pubkey ? event.pubkey.substring(0, 8) + '...' : 'Unknown'
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event)
                        onEventSelect?.(event)
                      }}
                      className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 w-full text-left transition-colors ${
                        isSelected 
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                          : ''
                      }`}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span className="font-mono text-xs">{authorShort}</span>
                        <span className="ml-auto text-xs">
                          {createdAt.toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="font-medium">Kind {event.kind}</span>
                      <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
                        {shortContent}
                      </span>
                    </button>
                  )
                  })}
                </>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}