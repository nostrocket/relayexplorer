import { useState, useRef, useCallback, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { EventViewer } from "@/components/event-viewer"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useNostr } from "@/contexts/NostrContext"
import type { NDKEvent } from '@nostr-dev-kit/ndk'

const SIDEBAR_WIDTH_KEY = 'sidebar-width'

export default function Page() {
  const [selectedEvent, setSelectedEvent] = useState<NDKEvent | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY)
      return saved ? parseInt(saved, 10) : 350
    }
    return 350
  })
  const { relayUrl, relayMetadata } = useNostr()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  // Save sidebar width to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString())
  }, [sidebarWidth])

  const startResize = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      
      const newWidth = Math.max(200, Math.min(800, e.clientX))
      setSidebarWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as React.CSSProperties
      }
    >
      <div ref={sidebarRef} className="relative">
        <AppSidebar onEventSelect={setSelectedEvent} />
        <div
          className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-border transition-colors z-50"
          onMouseDown={startResize}
        />
      </div>
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Nostr Relays</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {relayMetadata?.name || (relayUrl ? 'Relay Explorer' : 'Not Connected')}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <EventViewer event={selectedEvent} />
      </SidebarInset>
    </SidebarProvider>
  )
}