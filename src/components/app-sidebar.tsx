"use client"

import * as React from "react"
import { Command, FileText, User, Heart, Repeat, Zap, MessageCircle } from "lucide-react"
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
import { useNostr } from "@/contexts/NostrContext"
import { mockData } from "@/mock/data"

interface EventKind {
  kind: number;
  title: string;
  icon: React.ComponentType;
}

const eventKinds: EventKind[] = [
  { kind: 1, title: "Text Notes", icon: FileText },
  { kind: 0, title: "Profiles", icon: User },
  { kind: 7, title: "Reactions", icon: Heart },
  { kind: 6, title: "Reposts", icon: Repeat },
  { kind: 4, title: "DMs", icon: MessageCircle },
  { kind: 9735, title: "Zaps", icon: Zap },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onEventSelect?: (event: NDKEvent) => void
}

export function AppSidebar({ onEventSelect, ...props }: AppSidebarProps) {
  const [activeKind, setActiveKind] = React.useState<EventKind>(eventKinds[0])
  const [selectedEvent, setSelectedEvent] = React.useState<NDKEvent | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const { setOpen } = useSidebar()
  const { isConnected } = useNostr()
  const { events, updateFilter } = useEvents({ kinds: [activeKind.kind] })

  // Update filter when active kind changes
  React.useEffect(() => {
    updateFilter({ kinds: [activeKind.kind], search: searchTerm });
  }, [activeKind, searchTerm, updateFilter]);

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
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {eventKinds.map((eventKind) => (
                  <SidebarMenuItem key={eventKind.kind}>
                    <SidebarMenuButton
                      tooltip={{
                        children: eventKind.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveKind(eventKind)
                        setOpen(true)
                      }}
                      isActive={activeKind?.kind === eventKind.kind}
                      className="px-2.5 md:px-2"
                    >
                      <eventKind.icon />
                      <span>{eventKind.title}</span>
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
              {activeKind?.title}
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
                events.map((event) => {
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
                })
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}