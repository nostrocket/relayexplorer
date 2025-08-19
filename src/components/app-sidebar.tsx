"use client"

import * as React from "react"
import { GitBranchIcon } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RelayConnector } from "@/components/relay-connector"
import { RelayStatus } from "@/components/relay-status"
import { useEvents } from "@/hooks/useEvents"
import { useProfiles, type ProfileData } from "@/hooks/useProfiles"
import { useNostr } from "@/hooks/useNostr"
import { useIsMobile } from "@/hooks/use-mobile"
import { mockData } from "@/mock/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getRelativeTime } from "@/lib/utils"
import { EventKindFilter } from "@/components/event-kind-filter"
import { VirtualizedEventList } from "@/components/virtualized-event-list"
import { VirtualizedProfileList } from "@/components/virtualized-profile-list"

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
  getProfile: (pubkey: string) => ProfileData | null
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

export const AppSidebar = React.memo(({ onEventSelect, ...props }: AppSidebarProps) => {
  const [activePubkey, setActivePubkey] = React.useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<NDKEvent | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedKinds, setSelectedKinds] = React.useState<number[]>([])
  const [activeTab, setActiveTab] = React.useState('profiles')
  const { setOpen } = useSidebar()
  const { isConnected } = useNostr()
  const isMobile = useIsMobile()
  
  // Get all events and profile events
  const { events: allEvents, profileEvents, updateFilter } = useEvents({})
  
  // Get profile management hooks
  const { getDisplayName, getAvatarUrl, getProfile } = useProfiles(profileEvents)
  
  // Extract unique pubkeys with profile data - memoized
  const uniquePubkeys = React.useMemo(() => 
    extractUniquePubkeys(allEvents, getDisplayName, getAvatarUrl, getProfile), 
    [allEvents, getDisplayName, getAvatarUrl, getProfile]
  )
  
  // Note: No auto-selection of pubkey - "All Profiles" is default
  
  // Filter events locally by active pubkey
  const events = React.useMemo(() => {
    if (!activePubkey) return allEvents;
    return allEvents.filter(event => event.pubkey === activePubkey);
  }, [allEvents, activePubkey])

  // Update filter when search term or kinds change - memoized
  const debouncedUpdateFilter = React.useCallback(
    React.useMemo(
      () => {
        let timeoutId: NodeJS.Timeout;
        return (search: string, kinds: number[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            updateFilter({ 
              search: search || undefined,
              kinds: kinds.length > 0 ? kinds : undefined
            });
          }, 300); // 300ms debounce
        };
      },
      [updateFilter]
    ),
    [updateFilter]
  );

  React.useEffect(() => {
    debouncedUpdateFilter(searchTerm, selectedKinds);
  }, [searchTerm, selectedKinds, debouncedUpdateFilter]);

  // Handle profile selection with auto-switch to events tab on mobile
  const handleProfileSelect = React.useCallback((pubkey: string | null) => {
    setActivePubkey(pubkey)
    setOpen(true)
    if (isMobile) {
      setActiveTab('events')
    }
  }, [setOpen, isMobile]);

  // Handle event selection
  const handleEventSelect = React.useCallback((event: NDKEvent) => {
    setSelectedEvent(event);
    onEventSelect?.(event);
  }, [onEventSelect]);

  // Handle search input changes
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Handle kinds filter changes
  const handleKindsChange = React.useCallback((kinds: number[]) => {
    setSelectedKinds(kinds);
  }, []);

  // Profiles content (for tab or first sidebar) - memoized
  const profilesContent = React.useMemo(() => (
    <SidebarGroup>
      <SidebarGroupContent className="px-1.5 md:px-0">
        <SidebarMenu>
          {uniquePubkeys.length > 50 ? (
            // Use virtualization for large lists
            <VirtualizedProfileList
              profiles={uniquePubkeys}
              activePubkey={activePubkey}
              onProfileSelect={handleProfileSelect}
              height={400}
              showAllProfilesButton={true}
            />
          ) : (
            // Use regular rendering for small lists
            <>
              {/* Show All Profiles Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: "Show events from all profiles",
                    hidden: false,
                  }}
                  onClick={() => handleProfileSelect(null)}
                  isActive={activePubkey === null}
                  className="px-2.5 md:px-2 flex items-center gap-2 font-medium min-h-[44px]"
                >
                  <div className="h-6 w-6 bg-primary text-primary-foreground rounded flex items-center justify-center text-xs font-bold">
                    ALL
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
                    onClick={() => handleProfileSelect(authorInfo.pubkey)}
                    isActive={activePubkey === authorInfo.pubkey}
                    className="px-2.5 md:px-2 flex items-center gap-2 min-h-[44px]"
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
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ), [uniquePubkeys, activePubkey, handleProfileSelect]);

  // Events content (for tab or second sidebar)
  const eventsContent = (
    <>
      <SidebarHeader className="gap-3.5 border-b p-2 md:p-4 flex-shrink-0">
        {!isMobile && (
          <>
            <RelayConnector />
            <RelayStatus />
          </>
        )}
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-foreground text-sm md:text-base font-medium">
            {activePubkey ? getDisplayName(activePubkey) : 'All Profiles'}
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({events.length} event{events.length !== 1 ? 's' : ''})
            </span>
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <span className="hidden md:inline">Real-time</span>
            <Switch className="shadow-none" defaultChecked />
          </Label>
        </div>
        <SidebarInput 
          placeholder="Search events..." 
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <EventKindFilter
          selectedKinds={selectedKinds}
          onKindsChange={handleKindsChange}
        />
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
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
                <div className="border-b p-2 md:p-4 bg-sidebar-accent/50">
                  <div className="flex items-start gap-2 md:gap-3">
                    {activePubkey ? (
                      <>
                        <Avatar className="h-10 w-10 md:h-12 md:w-12">
                          <AvatarImage 
                            src={getAvatarUrl(activePubkey) || `https://robohash.org/${activePubkey}`} 
                          />
                          <AvatarFallback className="text-xs md:text-sm">
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
                        <div className="h-10 w-10 md:h-12 md:w-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
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
                
                {/* Events List - Virtualized for performance */}
                {events.length > 50 ? (
                  <VirtualizedEventList
                    events={events}
                    selectedEventId={selectedEvent?.id}
                    onEventSelect={handleEventSelect}
                    height={400}
                  />
                ) : (
                  events.map((event) => {
                    const isSelected = selectedEvent?.id === event.id
                    const createdAt = event.created_at ? new Date(event.created_at * 1000) : new Date()
                    const content = event.content || 'No content'
                    const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content
                    const authorShort = event.pubkey ? event.pubkey.substring(0, 8) + '...' : 'Unknown'
                    
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleEventSelect(event)}
                        className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-2 md:p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 w-full text-left transition-colors min-h-[60px] ${
                          isSelected 
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                            : ''
                        }`}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="font-mono text-xs">{authorShort}</span>
                          <span className="ml-auto text-xs">
                            {getRelativeTime(createdAt)}
                          </span>
                        </div>
                        <span className="font-medium">Kind {event.kind}</span>
                        <span className="line-clamp-2 w-full max-w-[260px] text-xs whitespace-break-spaces">
                          {shortContent}
                        </span>
                      </button>
                    )
                  })
                )}
              </>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );

  if (isMobile) {
    // Mobile: Single sidebar with tabs
    return (
      <Sidebar
        collapsible="icon"
        className="overflow-hidden"
        {...props}
      >
        <Sidebar collapsible="none" className="flex-1 flex">
          <SidebarHeader className="gap-3.5 border-b p-2">
            <RelayConnector />
            <RelayStatus />
          </SidebarHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-2 pt-2 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profiles" className="text-xs">
                  Profiles ({uniquePubkeys.length + 1})
                </TabsTrigger>
                <TabsTrigger value="events" className="text-xs">
                  Events ({events.length})
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="profiles" className="flex-1 mt-0 min-h-0 overflow-hidden">
              <SidebarContent className="scrollbar-hide overflow-y-auto h-full">
                {profilesContent}
              </SidebarContent>
            </TabsContent>
            
            <TabsContent value="events" className="flex-1 mt-0 min-h-0 overflow-hidden flex flex-col">
              <div className="px-2 space-y-2 flex-shrink-0">
                <div className="flex w-full flex-col gap-2">
                  <div className="text-foreground text-sm font-medium">
                    {activePubkey ? getDisplayName(activePubkey) : 'All Profiles'}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      ({events.length} event{events.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <Label className="flex items-center gap-2 text-sm">
                    <Switch className="shadow-none" defaultChecked />
                    <span>Real-time</span>
                  </Label>
                </div>
                <SidebarInput 
                  placeholder="Search events..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                <EventKindFilter
                  selectedKinds={selectedKinds}
                  onKindsChange={handleKindsChange}
                />
              </div>
              <SidebarContent className="flex-1 min-h-0 overflow-y-auto">
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
                        <div className="border-b p-2 bg-sidebar-accent/50">
                          <div className="flex items-start gap-2">
                            {activePubkey ? (
                              <>
                                <Avatar className="h-10 w-10">
                                  <AvatarImage 
                                    src={getAvatarUrl(activePubkey) || `https://robohash.org/${activePubkey}`} 
                                  />
                                  <AvatarFallback className="text-xs">
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
                                <div className="h-10 w-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
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
                        
                        {/* Events List - Virtualized for performance */}
                        {events.length > 50 ? (
                          <VirtualizedEventList
                            events={events}
                            selectedEventId={selectedEvent?.id}
                            onEventSelect={handleEventSelect}
                            height={300}
                          />
                        ) : (
                          events.map((event) => {
                            const isSelected = selectedEvent?.id === event.id
                            const createdAt = event.created_at ? new Date(event.created_at * 1000) : new Date()
                            const content = event.content || 'No content'
                            const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content
                            const authorShort = event.pubkey ? event.pubkey.substring(0, 8) + '...' : 'Unknown'
                            
                            return (
                              <button
                                key={event.id}
                                onClick={() => handleEventSelect(event)}
                                className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-2 text-sm leading-tight whitespace-nowrap last:border-b-0 w-full text-left transition-colors min-h-[60px] ${
                                  isSelected 
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                                    : ''
                                }`}
                              >
                                <div className="flex w-full items-center gap-2">
                                  <span className="font-mono text-xs">{authorShort}</span>
                                  <span className="ml-auto text-xs">
                                    {getRelativeTime(createdAt)}
                                  </span>
                                </div>
                                <span className="font-medium">Kind {event.kind}</span>
                                <span className="line-clamp-2 w-full max-w-[260px] text-xs whitespace-break-spaces">
                                  {shortContent}
                                </span>
                              </button>
                            )
                          })
                        )}
                      </>
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </TabsContent>
          </Tabs>
          <SidebarFooter>
            <NavUser user={mockData.user} />
          </SidebarFooter>
        </Sidebar>
      </Sidebar>
    )
  }

  // Desktop: Two full-width sidebars
  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* First sidebar: Profiles - Full width on desktop */}
      <Sidebar
        collapsible="none"
        className="w-80 border-r flex flex-col h-full"
      >
        <SidebarHeader className="gap-3.5 border-b p-2 md:p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <a href="https://github.com/nostrocket/relayexplorer" className="flex items-center gap-2">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GitBranchIcon className="size-4" />
              </div>
              <span className="font-semibold">Relay Explorer</span>
            </a>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-y-auto">
          {profilesContent}
        </SidebarContent>
        <SidebarFooter className="flex-shrink-0">
          <NavUser user={mockData.user} />
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar: Events - Full width on desktop */}
      <Sidebar collapsible="none" className="w-96 border-r flex flex-col h-full">
        {eventsContent}
      </Sidebar>
    </Sidebar>
  )
});

AppSidebar.displayName = 'AppSidebar';