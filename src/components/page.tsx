import { useState, useRef, useCallback, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { EventViewer } from "@/components/event-viewer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useNostr } from "@/hooks/useNostr"
import { useIsMobile } from "@/hooks/use-mobile"
import type { NDKEvent } from '@nostr-dev-kit/ndk'

const SIDEBAR_WIDTH_KEY = 'sidebar-width'

export default function Page() {
  const [selectedEvent, setSelectedEvent] = useState<NDKEvent | null>(null)
  const [activePubkey, setActivePubkey] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY)
      return saved ? parseInt(saved, 10) : 700 // Increased default to accommodate dual sidebars
    }
    return 700
  })
  const { fetchEventById } = useNostr()

  const handleSelectEvent = useCallback(async (id: string) => {
    const event = await fetchEventById(id)
    if (event) setSelectedEvent(event)
  }, [fetchEventById])
  const isMobile = useIsMobile()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  // Save sidebar width to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString())
  }, [sidebarWidth])

  const startResize = useCallback(() => {
    isResizing.current = true
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      
      const newWidth = Math.max(400, Math.min(1200, e.clientX)) // Increased min/max for dual sidebars
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
      className="h-svh overflow-hidden"
      style={
        {
          "--sidebar-width": isMobile ? "100%" : `${sidebarWidth}px`,
        } as React.CSSProperties
      }
    >
      <div ref={sidebarRef} className="relative">
        <AppSidebar
          onEventSelect={setSelectedEvent}
          activePubkey={activePubkey}
          onActivePubkeyChange={setActivePubkey}
        />
        <div
          className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-border transition-colors z-50 hidden md:block"
          onMouseDown={startResize}
        />
      </div>
      <SidebarInset>
        <EventViewer
          event={selectedEvent}
          onSelectPubkey={setActivePubkey}
          onSelectEvent={handleSelectEvent}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}