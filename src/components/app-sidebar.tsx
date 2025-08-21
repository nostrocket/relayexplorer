"use client"

// Component imports for building the dual-sidebar relay explorer interface
// This component creates either a tabbed mobile interface or dual-sidebar desktop layout
import * as React from "react"
import { GitBranchIcon } from "lucide-react"
import type { NDKEvent } from '@nostr-dev-kit/ndk'

// UI component imports for building the sidebar structure
import { NavUser } from "@/components/nav-user"        // User profile display at bottom of sidebar
import { Label } from "@/components/ui/label"         // Labels for form controls
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
import { Switch } from "@/components/ui/switch"       // Toggle switch for real-time updates
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
}

// Main component: Creates responsive dual-sidebar layout for relay exploration
// UI Result: On desktop = two side-by-side panels, on mobile = single panel with tabs
export const AppSidebar = React.memo(({ onEventSelect, ...props }: AppSidebarProps) => {
  // State management for UI interactions and data filtering
  const [activePubkey, setActivePubkey] = React.useState<string | null>(null)     // UI: Highlighted profile in left sidebar
  const [selectedEvent, setSelectedEvent] = React.useState<NDKEvent | null>(null)  // UI: Highlighted event in right sidebar  
  const [searchTerm, setSearchTerm] = React.useState('')                          // UI: Search input value in right sidebar header
  const [selectedKinds, setSelectedKinds] = React.useState<number[]>([])          // UI: Selected filter chips in right sidebar
  const [activeTab, setActiveTab] = React.useState('profiles')                    // UI: Active tab in mobile layout
  const { setOpen } = useSidebar()      // UI: Controls sidebar open/close state
  const { isConnected } = useNostr()    // UI: Shows connection status and enables/disables content
  const isMobile = useIsMobile()        // UI: Determines layout strategy (tabs vs dual sidebars)
  
  // Data fetching and management
  const { events: allEvents, profileEvents, updateFilter } = useEvents({})  // Fetches events for right sidebar display
  
  // Profile data processing for left sidebar display
  const { getDisplayName, getAvatarUrl, getProfile } = useProfiles(profileEvents)
  
  // UI Data: Transform raw events into clickable profile list for left sidebar
  const uniquePubkeys = React.useMemo(() => 
    extractUniquePubkeys(allEvents, getDisplayName, getAvatarUrl, getProfile), 
    [allEvents, getDisplayName, getAvatarUrl, getProfile]
  )
  
  // Note: No auto-selection of pubkey - "All Profiles" is default selection
  
  // UI Data: Filter events based on selected profile (affects right sidebar content)
  const events = React.useMemo(() => {
    if (!activePubkey) return allEvents;  // Show all events when "All Profiles" selected
    return allEvents.filter(event => event.pubkey === activePubkey);  // Show only selected author's events
  }, [allEvents, activePubkey])

  // Debounced search functionality - prevents excessive API calls while user types
  // UI Result: Search input in right sidebar header triggers filtered event display after 300ms pause
  const debouncedUpdateFilter = React.useCallback(
    React.useMemo(
      () => {
        let timeoutId: NodeJS.Timeout;
        return (search: string, kinds: number[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            updateFilter({ 
              search: search || undefined,      // Applied to event content/author filtering
              kinds: kinds.length > 0 ? kinds : undefined  // Applied to event type filtering
            });
          }, 300); // 300ms debounce prevents excessive filtering
        };
      },
      [updateFilter]
    ),
    [updateFilter]
  );

  // Auto-apply search and filter changes to event display
  React.useEffect(() => {
    debouncedUpdateFilter(searchTerm, selectedKinds);
  }, [searchTerm, selectedKinds, debouncedUpdateFilter]);

  // Profile selection handler - manages left sidebar interactions
  // UI Result: Highlights selected profile, filters right sidebar events, handles mobile navigation
  const handleProfileSelect = React.useCallback((pubkey: string | null) => {
    setActivePubkey(pubkey)      // Highlights the clicked profile in left sidebar
    setOpen(true)                // Ensures sidebar stays open after selection
    if (isMobile) {
      setActiveTab('events')     // Auto-switches to events tab on mobile for better UX
    }
  }, [setOpen, isMobile]);

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

  // Filter selection handler - manages event kind filter chips
  // UI Result: Updates selected filter chips and triggers event filtering
  const handleKindsChange = React.useCallback((kinds: number[]) => {
    setSelectedKinds(kinds);     // Updates filter chip selection and triggers filtering
  }, []);

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
        
        {/* Profile Selection Summary and Real-time Toggle */}
        {/* UI Result: Shows current selection (e.g. "All Profiles (512 events)") with toggle switch */}
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-foreground text-sm md:text-base font-medium">
            {/* Current selection display - updates based on left sidebar selection */}
            {activePubkey ? getDisplayName(activePubkey) : 'All Profiles'}
            {/* Event count badge - updates when events are filtered */}
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({events.length} event{events.length !== 1 ? 's' : ''})
            </span>
          </div>
          {/* Real-time updates toggle */}
          {/* UI Result: "Real-time" label with toggle switch (on desktop) or just switch (mobile) */}
          <Label className="flex items-center gap-2 text-sm">
            <span className="hidden md:inline">Real-time</span>  {/* Label hidden on mobile */}
            <Switch className="shadow-none" defaultChecked />   {/* Toggle switch, defaults to on */}
          </Label>
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
        <SidebarGroup className="px-0 flex flex-col min-h-0">                       {/* Container for event content */}
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
                {/* PROFILE PREVIEW SECTION: Shows selected author info at top of event list */}
                {/* UI Result: Highlighted card showing avatar, name, bio, and pubkey of selected author */}
                <div className="border-b p-2 md:p-4 bg-sidebar-accent/50">          {/* Light background highlight */}
                  <div className="flex items-start gap-2 md:gap-3">                {/* Horizontal layout with spacing */}
                    {activePubkey ? (
                      // Individual Profile Preview - Shows when specific author selected
                      // UI Result: Large avatar, name, bio snippet, and partial pubkey
                      <>
                        <Avatar className="h-10 w-10 md:h-12 md:w-12">            {/* Larger profile picture */}
                          <AvatarImage 
                            src={getAvatarUrl(activePubkey) || `https://robohash.org/${activePubkey}`}
                          />
                          <AvatarFallback className="text-xs md:text-sm">         {/* Fallback initials */}
                            {activePubkey.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">                          {/* Text content area */}
                          {/* Author display name */}
                          <div className="font-medium text-sm truncate">
                            {getDisplayName(activePubkey)}
                          </div>
                          {/* Author bio/about section (if available) */}
                          {getProfile(activePubkey)?.about && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">  {/* Max 2 lines */}
                              {getProfile(activePubkey)?.about}
                            </div>
                          )}
                          {/* Partial public key display */}
                          <div className="text-xs text-muted-foreground mt-1 font-mono">     {/* Monospace for key */}
                            {activePubkey.substring(0, 16)}...
                          </div>
                        </div>
                      </>
                    ) : (
                      // "All Profiles" Preview - Shows when viewing all events
                      // UI Result: "All" badge with summary of total profiles being shown
                      <>
                        <div className="h-10 w-10 md:h-12 md:w-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                          All                                                       {/* "All" badge matches left sidebar */}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            All Profiles                                           {/* Title matches left sidebar selection */}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Showing events from all {uniquePubkeys.length} profile{uniquePubkeys.length !== 1 ? 's' : ''}  {/* Dynamic count */}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* EVENT LIST: Main scrollable list of events matching current filters */}
                {/* UI Result: Scrollable list of clickable event cards below the profile preview */}
                {events.length > 50 ? (
                  // Performance optimization: Use virtualization for large event lists
                  // UI Result: Smooth scrolling through hundreds of events without performance issues
                  <VirtualizedEventList
                    events={events}                     // Data source for event items
                    selectedEventId={selectedEvent?.id} // Highlights selected event
                    onEventSelect={handleEventSelect}   // Handles click interactions
                    height={400}                        // Fixed height for virtualization
                  />
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
                  {/* Real-time toggle (mobile layout) */}
                  <Label className="flex items-center gap-2 text-sm">
                    <Switch className="shadow-none" defaultChecked />     {/* Switch comes first on mobile */}
                    <span>Real-time</span>                                {/* Label always visible on mobile */}
                  </Label>
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
                <SidebarGroup className="px-0 flex flex-col min-h-0">
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
                        {/* MOBILE PROFILE PREVIEW: Compact version with smaller avatar */}
                        {/* UI Result: Similar to desktop but with mobile-optimized spacing */}
                        <div className="border-b p-2 bg-sidebar-accent/50">        {/* Smaller padding than desktop */}
                          <div className="flex items-start gap-2">               {/* Smaller gap than desktop */}
                            {activePubkey ? (
                              // Individual profile preview (mobile size)
                              <>
                                <Avatar className="h-10 w-10">                   {/* Smaller than desktop (h-12 w-12) */}
                                  <AvatarImage 
                                    src={getAvatarUrl(activePubkey) || `https://robohash.org/${activePubkey}`} 
                                  />
                                  <AvatarFallback className="text-xs">          {/* Smaller text than desktop */}
                                    {activePubkey.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {getDisplayName(activePubkey)}
                                  </div>
                                  {/* About section (same as desktop) */}
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
                              // "All Profiles" preview (mobile size)
                              <>
                                <div className="h-10 w-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                  All                                             {/* Smaller than desktop */}
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
                        
                        {/* MOBILE EVENT LIST: Smaller height for virtualization */}
                        {/* UI Result: Same event cards as desktop but optimized for mobile screen */}
                        {events.length > 50 ? (
                          // Virtualized list with smaller height for mobile
                          <VirtualizedEventList
                            events={events}
                            selectedEventId={selectedEvent?.id}
                            onEventSelect={handleEventSelect}
                            height={300}
                          />
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
            <NavUser user={mockData.user} />    {/* User avatar and name */}
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
                <GitBranchIcon className="size-4" />                   {/* Git branch icon for relay explorer */}
              </div>
              {/* App title */}
              <span className="font-semibold">Relay Explorer</span>     {/* Clickable title links to GitHub */}
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
        <div className="flex-shrink-0 p-2">                           {/* Fixed footer, doesn't scroll */}
          <NavUser user={mockData.user} />                           {/* User avatar, name, and settings */}
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