"use client"

// Component imports for building the dual-sidebar relay explorer interface
// This component creates either a tabbed mobile interface or dual-sidebar desktop layout
import * as React from "react"
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { BullLogo } from "@/components/bull-logo"
import { ThemeToggle } from "@/components/theme-toggle"

// UI component imports for building the sidebar structure
import { NavUser } from "@/components/nav-user"        // User profile display at bottom of sidebar
import {
  Sidebar,                                            // Main sidebar container (used only in mobile)
  SidebarContent,                                     // Scrollable content area
  SidebarFooter,                                      // Fixed footer area
  SidebarGroup,                                       // Logical grouping of sidebar items
  SidebarGroupContent,                                // Content within a sidebar group
  SidebarHeader,                                      // Fixed header area with controls
  SidebarInput,                                       // Search input field
  SidebarMenu,                                        // List container for menu items
  SidebarMenuButton,                                  // Interactive menu item button
  SidebarMenuItem,                                    // Individual menu item wrapper
  useSidebar,                                         // Hook for sidebar state management
} from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"  // Mobile tab navigation
import { RelayConnector } from "@/components/relay-connector"  // Relay connection interface
import { RelayStatus } from "@/components/relay-status"        // Connection status indicator
import { useEvents } from "@/hooks/useEvents"         // Event data management
import { useProfiles, type ProfileData } from "@/hooks/useProfiles"  // Profile data management
import { useNostr } from "@/hooks/useNostr"           // Nostr connection state
import { useIsMobile } from "@/hooks/use-mobile"      // Mobile detection for responsive design
import { mockData } from "@/mock/data"                // Demo user data
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"  // Profile pictures
import { getRelativeTime } from "@/lib/utils"         // Time formatting utility
import { EventKindFilter } from "@/components/event-kind-filter"       // Filter controls for event types
import { VirtualizedEventList } from "@/components/virtualized-event-list"    // Performance-optimized event list
import { VirtualizedProfileList } from "@/components/virtualized-profile-list" // Performance-optimized profile list

// Data structure for user profile information displayed in the left sidebar profile list
interface AuthorInfo {
  pubkey: string;        // Full public key identifier
  displayName: string;   // Either username from profile or truncated pubkey
  shortPubkey: string;   // First 8 characters of pubkey for fallback display
  avatarUrl?: string;    // Profile picture URL if available
  hasProfile: boolean;   // Whether user has a complete Nostr profile (affects sorting)
}

// Utility function to extract unique pubkeys from events with profile data
// Creates the data structure for the profile list in the left sidebar
// UI Result: Generates the list of clickable profile items with avatars and names
const extractUniquePubkeys = (
  events: NDKEvent[], 
  getDisplayName: (pubkey: string) => string,
  getAvatarUrl: (pubkey: string) => string | null,
  getProfile: (pubkey: string) => ProfileData | null
): AuthorInfo[] => {
  const pubkeySet = new Set<string>();
  
  // Extract all unique authors from the event list
  events.forEach(event => {
    if (event.pubkey) {
      pubkeySet.add(event.pubkey);
    }
  });
  
  // Transform pubkeys into rich profile objects with display data
  return Array.from(pubkeySet).map(pubkey => ({
    pubkey,
    displayName: getDisplayName(pubkey),        // Shows as main text in profile list
    shortPubkey: pubkey.substring(0, 8),        // Fallback if no profile name
    avatarUrl: getAvatarUrl(pubkey) || undefined, // Shows as avatar image
    hasProfile: !!getProfile(pubkey)            // Affects sorting priority
  })).sort((a, b) => {
    // UI Result: Profiles with complete names appear at top of list
    // Prioritize profiles with usernames (hasProfile = true) over truncated pubkeys
    if (a.hasProfile && !b.hasProfile) return -1;
    if (!a.hasProfile && b.hasProfile) return 1;
    
    // Within each group, prioritize profiles with pictures over those without
    const aHasPicture = !!a.avatarUrl;
    const bHasPicture = !!b.avatarUrl;
    if (aHasPicture && !bHasPicture) return -1;
    if (!aHasPicture && bHasPicture) return 1;
    
    // Within each subgroup, sort alphabetically by display name
    return a.displayName.localeCompare(b.displayName);
  });
};

// Component props - extends Sidebar props and adds event selection callback
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onEventSelect?: (event: NDKEvent) => void  // Called when user clicks an event in the right sidebar
  activePubkey: string | null
  onActivePubkeyChange: (pubkey: string | null) => void
}

// Main component: Creates responsive dual-sidebar layout for relay exploration
// UI Result: On desktop = two side-by-side panels, on mobile = single panel with tabs
export const AppSidebar = React.memo(({ onEventSelect, activePubkey, onActivePubkeyChange, ...props }: AppSidebarProps) => {
  // State management for UI interactions and data filtering
  const [selectedEvent, setSelectedEvent] = React.useState<NDKEvent | null>(null)  // UI: Highlighted event in right sidebar
  const [searchTerm, setSearchTerm] = React.useState('')                          // UI: Search input value in right sidebar header
  const [activeTab, setActiveTab] = React.useState('profiles')                    // UI: Active tab in mobile layout
  const { setOpen } = useSidebar()      // UI: Controls sidebar open/close state
  const { isConnected, subscriptionKinds, setSubscriptionKinds } = useNostr()
  const selectedKinds = React.useMemo(() => subscriptionKinds ?? [], [subscriptionKinds])
  const isMobile = useIsMobile()        // UI: Determines layout strategy (tabs vs dual sidebars)
  
  // Data fetching and management
  const { events: allEvents, profileEvents, updateFilter } = useEvents({}, activePubkey)  // Fetches events; opens a scoped kind-1 sub when a profile is selected
  
  // Profile data processing for left sidebar display
  const { getDisplayName, getAvatarUrl, getProfile } = useProfiles(profileEvents)
  
  // UI Data: Transform raw events into clickable profile list for left sidebar
  const uniquePubkeys = React.useMemo(() => 
    extractUniquePubkeys(allEvents, getDisplayName, getAvatarUrl, getProfile), 
    [allEvents, getDisplayName, getAvatarUrl, getProfile]
  )
  
  // Note: No auto-selection of pubkey - "All Profiles" is default selection
  
  // UI Data: Filter events for display. Kinds filter matches the current subscription
  // so switching kinds narrows the displayed list immediately (events fetched under
  // a previous subscription stay in eventsMap but aren't shown).
  const events = React.useMemo(() => {
    let filtered = allEvents
    if (selectedKinds.length > 0) {
      const kindSet = new Set(selectedKinds)
      filtered = filtered.filter(e => kindSet.has(e.kind ?? -1))
    }
    if (activePubkey) {
      filtered = filtered.filter(e => e.pubkey === activePubkey)
    }
    return filtered
  }, [allEvents, selectedKinds, activePubkey])

  // Debounced search filter (client-side content/author matching)
  const debouncedUpdateSearch = React.useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (search: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateFilter({ search: search || undefined });
      }, 300);
    };
  }, [updateFilter]);

  React.useEffect(() => {
    debouncedUpdateSearch(searchTerm);
  }, [searchTerm, debouncedUpdateSearch]);

  // Debounced kind-filter: drives the relay subscription, so empty input means
  // "no kinds restriction" and everything the relay carries flows in.
  const debouncedSetKinds = React.useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (kinds: number[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSubscriptionKinds(kinds);
      }, 300);
    };
  }, [setSubscriptionKinds]);

  // Profile selection handler - manages left sidebar interactions
  // UI Result: Highlights selected profile, filters right sidebar events, handles mobile navigation
  const handleProfileSelect = React.useCallback((pubkey: string | null) => {
    onActivePubkeyChange(pubkey)  // Highlights the clicked profile in left sidebar
    setOpen(true)                 // Ensures sidebar stays open after selection
    if (isMobile) {
      setActiveTab('events')      // Auto-switches to events tab on mobile for better UX
    }
  }, [onActivePubkeyChange, setOpen, isMobile]);

  // Event selection handler - manages right sidebar event interactions  
  // UI Result: Highlights selected event and notifies parent component
  const handleEventSelect = React.useCallback((event: NDKEvent) => {
    setSelectedEvent(event);     // Highlights the clicked event in right sidebar
    onEventSelect?.(event);      // Notifies parent component (typically updates main content area)
  }, [onEventSelect]);

  // Search input handler - captures user typing in search box
  // UI Result: Updates search input value and triggers debounced filtering
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);  // Updates search box display and triggers filtering
  }, []);

  // Kinds input handler: pushes kinds to the subscription (debounced).
  const handleKindsChange = React.useCallback((kinds: number[]) => {
    debouncedSetKinds(kinds);
  }, [debouncedSetKinds]);

  // Add ref and state for profile list container height
  const profileContainerRef = React.useRef<HTMLDivElement>(null);
  const [profileListHeight, setProfileListHeight] = React.useState(600);

  // Calculate available height for profile list
  React.useEffect(() => {
    const updateHeight = () => {
      if (profileContainerRef.current) {
        const rect = profileContainerRef.current.getBoundingClientRect();
        // Account for padding and ensure minimum height
        const availableHeight = Math.max(400, rect.height - 20);
        setProfileListHeight(availableHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (profileContainerRef.current) {
      resizeObserver.observe(profileContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Event list container height (drives the VirtualizedEventList `height` prop).
  // Uses a callback ref so the observer re-initializes whenever the wrapping div
  // mounts or unmounts (e.g. on events.length crossing the 50-item threshold, or
  // switching between the mobile/desktop layouts).
  const [eventListNode, setEventListNode] = React.useState<HTMLDivElement | null>(null);
  const [eventListHeight, setEventListHeight] = React.useState(400);

  React.useEffect(() => {
    if (!eventListNode) return;
    const updateHeight = () => {
      const rect = eventListNode.getBoundingClientRect();
      setEventListHeight(Math.max(200, rect.height));
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(eventListNode);
    return () => observer.disconnect();
  }, [eventListNode]);

  // LEFT SIDEBAR CONTENT: Profile list with "All Profiles" option and individual authors
  // UI Result: Scrollable list of clickable profile items with avatars and names in left sidebar
  const profilesContent = React.useMemo(() => (
    <SidebarGroup className="flex-1 min-h-0">        {/* Fills available height in left sidebar */}
      <SidebarGroupContent className="px-1.5 md:px-0 flex-1 min-h-0">  {/* Responsive padding, fills height */}
        <SidebarMenu className="flex-1 min-h-0">     {/* Container for profile list items */}
          {uniquePubkeys.length > 50 ? (
            // Performance optimization: Use virtualization for large profile lists (50+ items)
            // UI Result: Smooth scrolling through hundreds of profiles without performance issues
            <VirtualizedProfileList
              profiles={uniquePubkeys}              // Data source for profile items
              activePubkey={activePubkey}           // Highlights selected profile
              onProfileSelect={handleProfileSelect} // Handles click interactions
              height={profileListHeight}            // Dynamic height based on available space
              showAllProfilesButton={true}          // Includes "All Profiles" option at top
            />
          ) : (
            // Regular rendering for smaller lists (under 50 items)
            // UI Result: Standard scrollable list with better DOM structure for small lists
            <>
              {/* "All Profiles" Button - Always appears first in the list */}
              {/* UI Result: Blue "ALL" badge with "All Profiles" text, highlighted when selected */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: "Show events from all profiles",  // Hover tooltip text
                    hidden: false,
                  }}
                  onClick={() => handleProfileSelect(null)}     // null = show all profiles
                  isActive={activePubkey === null}              // Highlighted when "All" is selected
                  className="px-2.5 md:px-2 flex items-center gap-2 font-medium min-h-[44px]"
                >
                  {/* Blue "ALL" badge icon */}
                  <div className="h-6 w-6 bg-primary text-primary-foreground rounded flex items-center justify-center text-xs font-bold">
                    ALL
                  </div>
                  <span className="truncate">All Profiles</span>  {/* Main text, truncated if too long */}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Individual Profile Items - One for each unique author */}
              {/* UI Result: List of clickable items with circular avatars and author names */}
              {uniquePubkeys.map((authorInfo) => (
                <SidebarMenuItem key={authorInfo.pubkey}>
                  <SidebarMenuButton
                    tooltip={{
                      children: authorInfo.displayName,        // Hover tooltip shows full name
                      hidden: false,
                    }}
                    onClick={() => handleProfileSelect(authorInfo.pubkey)}  // Select this author
                    isActive={activePubkey === authorInfo.pubkey}           // Highlighted when selected
                    className="px-2.5 md:px-2 flex items-center gap-2 min-h-[44px]"
                  >
                    {/* Profile Avatar - Circular image or fallback */}
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={authorInfo.avatarUrl || `https://robohash.org/${authorInfo.pubkey}`}  // Profile pic or generated avatar
                      />
                      <AvatarFallback className="text-xs">
                        {authorInfo.pubkey.substring(0, 2).toUpperCase()}  {/* Fallback: First 2 chars of pubkey */}
                      </AvatarFallback>
                    </Avatar>
                    {/* Author Display Name - Username or truncated pubkey */}
                    <span className="truncate">{authorInfo.displayName}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ), [uniquePubkeys, activePubkey, handleProfileSelect, profileListHeight]);

  // RIGHT SIDEBAR CONTENT: Event list with header controls and search functionality
  // UI Result: Full-height right sidebar with header controls and scrollable event list
  const eventsContent = (
    <>
      {/* RIGHT SIDEBAR HEADER: Controls, search, and filters */}
      {/* UI Result: Fixed header area with relay controls, search box, and filter chips */}
      <SidebarHeader className="gap-3.5 border-b p-2 md:p-4 flex-shrink-0">  {/* Fixed header, doesn't scroll */}
        {!isMobile && (
          // Desktop-only: Relay connection controls at top of right sidebar
          // UI Result: Relay selector dropdown and connection status indicator
          <>
            <RelayConnector />      {/* Dropdown to select/connect to different relays */}
            <RelayStatus />         {/* Green "Connected" indicator or connection status */}
          </>
        )}
        
        {/* Profile Selection Summary */}
        <div className="text-foreground text-sm font-medium">
          {activePubkey ? getDisplayName(activePubkey) : 'All Profiles'}
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            ({events.length} event{events.length !== 1 ? 's' : ''})
          </span>
        </div>
        
        {/* Search Input */}
        {/* UI Result: Search box that filters events as user types (debounced) */}
        <SidebarInput 
          placeholder="Search events..."     // Placeholder text in search box
          value={searchTerm}                 // Controlled input value
          onChange={handleSearchChange}     // Updates search state and triggers filtering
        />
        
        {/* Event Kind Filter Chips */}
        {/* UI Result: Row of clickable filter chips (Core, Social, Media, etc.) */}
        <EventKindFilter
          selectedKinds={selectedKinds}      // Currently selected filter chips
          onKindsChange={handleKindsChange}  // Updates filter selection and triggers filtering
        />
      </SidebarHeader>
      {/* RIGHT SIDEBAR CONTENT AREA: Scrollable event list with profile preview */}
      {/* UI Result: Full-height scrollable area below the fixed header */}
      <SidebarContent className="flex-1 min-h-0">                                    {/* Fills remaining height */}
        <SidebarGroup className="p-0 flex flex-1 flex-col min-h-0">                       {/* Container for event content */}
          <SidebarGroupContent className="flex-1 min-h-0 overflow-y-auto">          {/* Scrollable event list */}
            {!isConnected ? (
              // No Connection State
              // UI Result: Centered message when not connected to any relay
              <div className="p-4 text-center text-sm text-muted-foreground">
                Connect to a relay to view events
              </div>
            ) : events.length === 0 ? (
              // Empty State
              // UI Result: Centered message when no events match current filters/selection
              <div className="p-4 text-center text-sm text-muted-foreground">
                No events found
              </div>
            ) : (
              <>
                {/* EVENT LIST: Main scrollable list of events matching current filters */}
                {/* UI Result: Scrollable list of clickable event cards below the profile preview */}
                {events.length > 50 ? (
                  // Performance optimization: Use virtualization for large event lists
                  <div ref={setEventListNode} className="h-full">
                    <VirtualizedEventList
                      events={events}
                      selectedEventId={selectedEvent?.id}
                      onEventSelect={handleEventSelect}
                      height={eventListHeight}
                    />
                  </div>
                ) : (
                  // Regular rendering for smaller event lists (under 50 items)
                  // UI Result: Standard scrollable list with full DOM elements for better debugging
                  events.map((event) => {
                    // Data processing for each event card display
                    const isSelected = selectedEvent?.id === event.id                                    // Highlight state
                    const createdAt = event.created_at ? new Date(event.created_at * 1000) : new Date() // Convert timestamp
                    const content = event.content || 'No content'                                       // Event content with fallback
                    const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content // Truncate long content
                    const authorShort = event.pubkey ? event.pubkey.substring(0, 8) + '...' : 'Unknown'      // Short author ID
                    
                    return (
                      // Individual Event Card - Clickable button with event details
                      // UI Result: Rectangular card with author, timestamp, kind, and content preview
                      <button
                        key={event.id}                  // Unique key for React rendering
                        onClick={() => handleEventSelect(event)}  // Select this event and notify parent
                        className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-2 md:p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 w-full text-left transition-colors min-h-[60px] ${
                          isSelected 
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'  // Highlighted when selected
                            : ''
                        }`}
                      >
                        {/* Event Card Header: Author ID and timestamp */}
                        {/* UI Result: Small text line with truncated pubkey on left, relative time on right */}
                        <div className="flex w-full items-center gap-2">
                          <span className="font-mono text-xs">{authorShort}</span>  {/* Truncated author pubkey */}
                          <span className="ml-auto text-xs">                       {/* Right-aligned timestamp */}
                            {getRelativeTime(createdAt)}                           {/* "2 hours ago", "just now", etc. */}
                          </span>
                        </div>
                        
                        {/* Event Kind Label */}
                        {/* UI Result: Bold "Kind 1", "Kind 0", etc. indicating event type */}
                        <span className="font-medium">Kind {event.kind}</span>
                        
                        {/* Event Content Preview */}
                        {/* UI Result: Up to 2 lines of event content, truncated at 100 chars */}
                        <span className="line-clamp-2 w-full max-w-[260px] text-xs whitespace-break-spaces">
                          {shortContent}                                           {/* Truncated content with preserved whitespace */}
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

  // MOBILE LAYOUT: Single sidebar with tab-based navigation
  // UI Result: Full-screen sidebar that switches between "Profiles" and "Events" tabs
  if (isMobile) {
    return (
      <Sidebar
        collapsible="icon"              // Allows collapsing to icon-only view
        className="overflow-hidden"     // Prevents content overflow
        {...props}
      >
        <Sidebar collapsible="none" className="flex-1 flex">  {/* Inner sidebar container */}
          
          {/* MOBILE HEADER: Relay controls (always visible on mobile) */}
          {/* UI Result: Fixed header with relay connection controls */}
          <SidebarHeader className="gap-3.5 border-b p-2">
            <RelayConnector />  {/* Relay selector dropdown */}
            <RelayStatus />     {/* Connection status indicator */}
          </SidebarHeader>
          
          {/* MOBILE TAB NAVIGATION: Switches between Profiles and Events */}
          {/* UI Result: Full-width tabs with counters, content area below */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            
            {/* Tab Header Bar */}
            {/* UI Result: Two-column tab bar with "Profiles (N)" and "Events (N)" */}
            <div className="px-2 pt-2 flex-shrink-0">                    {/* Fixed tab bar */}
              <TabsList className="grid w-full grid-cols-2">             {/* Equal-width columns */}
                <TabsTrigger value="profiles" className="text-xs">
                  Profiles ({uniquePubkeys.length + 1})                  {/* Count includes "All Profiles" */}
                </TabsTrigger>
                <TabsTrigger value="events" className="text-xs">
                  Events ({events.length})                               {/* Current filtered event count */}
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* PROFILES TAB CONTENT: Profile list (reuses desktop content) */}
            {/* UI Result: Scrollable profile list identical to desktop left sidebar */}
            <TabsContent value="profiles" className="flex-1 mt-0 min-h-0 overflow-hidden">
              <SidebarContent className="scrollbar-hide overflow-y-auto h-full">    {/* Hidden scrollbar for cleaner mobile look */}
                {profilesContent}                                         {/* Same content as desktop left sidebar */}
              </SidebarContent>
            </TabsContent>
            
            {/* EVENTS TAB CONTENT: Event list with mobile-optimized header */}
            {/* UI Result: Condensed header controls plus scrollable event list */}
            <TabsContent value="events" className="flex-1 mt-0 min-h-0 overflow-hidden flex flex-col">
              
              {/* Mobile Events Header: Condensed version of desktop header */}
              {/* UI Result: Compact header with selection summary, search, and filters */}
              <div className="px-2 space-y-2 flex-shrink-0">             {/* Fixed header area */}
                <div className="flex w-full flex-col gap-2">
                  {/* Current selection summary */}
                  <div className="text-foreground text-sm font-medium">
                    {activePubkey ? getDisplayName(activePubkey) : 'All Profiles'}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      ({events.length} event{events.length !== 1 ? 's' : ''})   {/* Dynamic event count */}
                    </span>
                  </div>
                </div>
                {/* Search input (same as desktop) */}
                <SidebarInput 
                  placeholder="Search events..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {/* Filter chips (same as desktop) */}
                <EventKindFilter
                  selectedKinds={selectedKinds}
                  onKindsChange={handleKindsChange}
                />
              </div>
              
              {/* Mobile Events List: Scrollable area with smaller spacing */}
              {/* UI Result: Scrollable event cards with mobile-optimized sizing */}
              <SidebarContent className="flex-1 min-h-0">
                <SidebarGroup className="p-0 flex flex-1 flex-col min-h-0">
                  <SidebarGroupContent className="flex-1 min-h-0 overflow-y-auto">
                    {!isConnected ? (
                      // Mobile: No connection message (same as desktop)
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Connect to a relay to view events
                      </div>
                    ) : events.length === 0 ? (
                      // Mobile: Empty state message (same as desktop)
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No events found
                      </div>
                    ) : (
                      <>
                        {/* MOBILE EVENT LIST: Smaller height for virtualization */}
                        {/* UI Result: Same event cards as desktop but optimized for mobile screen */}
                        {events.length > 50 ? (
                          <div ref={setEventListNode} className="h-full">
                            <VirtualizedEventList
                              events={events}
                              selectedEventId={selectedEvent?.id}
                              onEventSelect={handleEventSelect}
                              height={eventListHeight}
                            />
                          </div>
                        ) : (
                          // Regular event list with mobile-optimized spacing
                          events.map((event) => {
                            const isSelected = selectedEvent?.id === event.id
                            const createdAt = event.created_at ? new Date(event.created_at * 1000) : new Date()
                            const content = event.content || 'No content'
                            const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content
                            const authorShort = event.pubkey ? event.pubkey.substring(0, 8) + '...' : 'Unknown'
                            
                            return (
                              // Mobile event card with tighter spacing
                              <button
                                key={event.id}
                                onClick={() => handleEventSelect(event)}
                                className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-2 text-sm leading-tight whitespace-nowrap last:border-b-0 w-full text-left transition-colors min-h-[60px] ${
                                  isSelected 
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                                    : ''
                                }`}
                              >
                                {/* Event header (same layout as desktop) */}
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
          
          {/* MOBILE FOOTER: User profile (always at bottom) */}
          {/* UI Result: Fixed footer with current user profile info */}
          <SidebarFooter>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <NavUser user={mockData.user} />
              </div>
              <ThemeToggle />
            </div>
          </SidebarFooter>
        </Sidebar>
      </Sidebar>
    )
  }

  // DESKTOP LAYOUT: Two side-by-side sidebars with fixed widths
  // UI Result: Left sidebar (320px) for profiles, right sidebar (384px) for events
  return (
    <div className="flex h-screen">                                   {/* Horizontal flexbox container, full height */}
      
      {/* LEFT SIDEBAR: Profile list with app header and user footer */}
      {/* UI Result: 320px wide column with Relay Explorer branding, profile list, and user info */}
      <div className="w-80 border-r flex flex-col h-screen bg-sidebar">  {/* Fixed width, full height, bordered */}
        
        {/* DESKTOP LEFT HEADER: App branding and navigation */}
        {/* UI Result: Header with GitHub icon, "Relay Explorer" title, and link */}
        <div className="gap-3.5 border-b p-2 md:p-4 flex-shrink-0">    {/* Fixed header, doesn't scroll */}
          <div className="flex items-center gap-3">
            <a href="https://github.com/nostrocket/relayexplorer" className="flex items-center gap-2">
              {/* App icon */}
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <BullLogo className="size-4" />
              </div>
              {/* App title */}
              <span className="font-semibold">Nostr Rodeo</span>     {/* Clickable title links to GitHub */}
            </a>
          </div>
        </div>
        
        {/* DESKTOP PROFILE LIST CONTENT: Scrollable profile list */}
        {/* UI Result: Fills remaining space between header and footer with scrollable profile list */}
        <div className="flex-1 min-h-0" ref={profileContainerRef}>     {/* Add ref here for height calculation */}
          <div className="h-full overflow-y-auto">                    {/* Full height with scroll */}
            {profilesContent}                                         {/* Reused profile list from above */}
          </div>
        </div>
        
        {/* DESKTOP LEFT FOOTER: Current user profile info */}
        {/* UI Result: Fixed footer at bottom of left sidebar with user avatar and info */}
        <div className="flex flex-shrink-0 items-center gap-2 p-2">
          <div className="flex-1 min-w-0">
            <NavUser user={mockData.user} />
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* RIGHT SIDEBAR: Event list with full header controls */}
      {/* UI Result: 384px wide column with comprehensive event filtering and list */}
      <div className="w-96 border-r flex flex-col h-screen bg-sidebar">  {/* Fixed width, full height */}
        {eventsContent}                                               {/* Reused events content from above */}
        {/* 
          eventsContent includes:
          - SidebarHeader with relay controls, search, and filters
          - SidebarContent with profile preview and scrollable event list
          - Support for both virtualized and regular event rendering
        */}
      </div>
    </div>
  )
});

AppSidebar.displayName = 'AppSidebar';