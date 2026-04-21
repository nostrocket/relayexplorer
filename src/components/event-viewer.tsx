import { useState, useRef, useEffect, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, Copy, Download, Eye, EyeOff, ExternalLink, ImageOff, Loader2, X } from "lucide-react"
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { getRelativeTime } from "@/lib/utils"
import { useAuthorProfile } from "@/hooks/useAuthorProfile"
import { useNostr } from "@/hooks/useNostr"
import { parseContent, hexToNpub, hexToNote, truncateBech32, getEventTagMarker } from "@/lib/nostr-refs"

interface EventViewerProps {
  event: NDKEvent | null
  onSelectPubkey?: (pubkey: string) => void
  onSelectEvent?: (id: string) => void
}

function PubkeyRef({ pubkey, onSelect }: { pubkey: string; onSelect?: (pubkey: string) => void }) {
  const { profileEventsMap } = useNostr()
  let label: string | null = null
  const profileEvent = profileEventsMap.get(pubkey)
  if (profileEvent?.content) {
    try {
      const parsed = JSON.parse(profileEvent.content)
      label = parsed.name || parsed.display_name || null
    } catch { /* noop */ }
  }
  const text = label ? `@${label}` : `@${truncateBech32(hexToNpub(pubkey))}`
  return (
    <button
      type="button"
      onClick={() => onSelect?.(pubkey)}
      className="text-primary hover:underline font-medium"
    >
      {text}
    </button>
  )
}

function InlineImage({ src, onOpen }: { src: string; onOpen?: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

  // On src change: reset to loading so a stale image from the previous src
  // doesn't linger while the new one is fetched. Then promote to "loaded"
  // if the browser already has the new URL cached and no `load` event fires.
  useEffect(() => {
    setStatus("loading")
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0 && img.currentSrc) {
      setStatus("loaded")
    }
  }, [src])

  return (
    <span className="my-2 block">
      {status === "loading" && (
        <span className="flex h-32 w-full max-w-sm items-center justify-center rounded-md bg-muted/30">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </span>
      )}
      {status === "error" && (
        <span className="flex max-w-sm items-center gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
          <ImageOff className="h-4 w-4" />
          Failed to load image
        </span>
      )}
      <img
        ref={imgRef}
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        onClick={onOpen}
        className={`block max-h-96 max-w-full rounded-md ${status === "loaded" ? "cursor-zoom-in" : "hidden"}`}
      />
    </span>
  )
}

function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[]
  index: number
  onClose: () => void
  onNavigate: (next: number) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowLeft" && index > 0) {
        onNavigate(index - 1)
      } else if (e.key === "ArrowRight" && index < images.length - 1) {
        onNavigate(index + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, images.length, onClose, onNavigate])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 rounded-full p-2 text-white hover:bg-white/10"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (hasPrev) onNavigate(index - 1) }}
            disabled={!hasPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (hasNext) onNavigate(index + 1) }}
            disabled={!hasNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next image"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-black/50 px-3 py-1 text-sm text-white">
            {index + 1} / {images.length}
          </div>
        </>
      )}
      <img
        key={images[index]}
        src={images[index]}
        alt=""
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[95vh] max-w-[95vw] object-contain"
      />
    </div>,
    document.body
  )
}

function EventRef({ id, onSelect }: { id: string; onSelect?: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(id)}
      className="text-primary hover:underline font-mono text-xs"
    >
      {truncateBech32(hexToNote(id))}
    </button>
  )
}

export function EventViewer({ event, onSelectPubkey, onSelectEvent }: EventViewerProps) {
  const [showRawJson, setShowRawJson] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const authorProfile = useAuthorProfile(event?.pubkey)

  // Reset lightbox when navigating to a different event.
  useEffect(() => {
    setLightboxIndex(null)
  }, [event?.id])

  const contentParts = useMemo(
    () => (event?.content ? parseContent(event.content, event.tags) : []),
    [event?.content, event?.tags]
  )
  const imageUrls = useMemo(
    () => contentParts.flatMap(p => (p.type === "image" ? [p.value] : [])),
    [contentParts]
  )

  if (!event) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">
            No event selected
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose an event from the sidebar to view its content
          </p>
        </div>
      </div>
    )
  }

  const createdAt = event.created_at ? new Date(event.created_at * 1000) : new Date()
  const authorShort = event.pubkey ? event.pubkey.substring(0, 16) + '...' : 'Unknown'
  const authorInitials = event.pubkey ? event.pubkey.substring(0, 2).toUpperCase() : 'UN'
  const authorAvatar = authorProfile?.picture || (event.pubkey ? `https://robohash.org/${event.pubkey}` : undefined)
  const authorDisplayName = authorProfile?.name || authorShort

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const downloadAsJson = () => {
    const eventData = {
      id: event.id,
      pubkey: event.pubkey,
      created_at: event.created_at,
      kind: event.kind,
      content: event.content,
      tags: event.tags,
      sig: event.sig
    }
    
    const blob = new Blob([JSON.stringify(eventData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nostr-event-${event.id?.substring(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-6">
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => event.id && copyToClipboard(event.id)}
      >
        <Copy className="h-4 w-4 mr-1 md:mr-2" />
        <span className="hidden sm:inline">Copy </span>ID
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => event.pubkey && copyToClipboard(event.pubkey)}
      >
        <Copy className="h-4 w-4 mr-1 md:mr-2" />
        <span className="hidden sm:inline">Copy </span>Pubkey
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={downloadAsJson}
      >
        <Download className="h-4 w-4 mr-1 md:mr-2" />
        <span className="hidden sm:inline">Download </span>JSON
      </Button>
      <Separator orientation="vertical" className="h-6 hidden md:block" />
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => setShowRawJson(!showRawJson)}
      >
        {showRawJson ? <EyeOff className="h-4 w-4 mr-1 md:mr-2" /> : <Eye className="h-4 w-4 mr-1 md:mr-2" />}
        {showRawJson ? 'Hide' : 'Show'} Raw
      </Button>
      {event.pubkey && (
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => window.open(`https://njump.me/${event.pubkey}`, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-1 md:mr-2" />
          Profile
        </Button>
      )}
    </div>
  )

  const lightbox = lightboxIndex !== null && imageUrls[lightboxIndex] ? (
    <ImageLightbox
      images={imageUrls}
      index={lightboxIndex}
      onClose={() => setLightboxIndex(null)}
      onNavigate={setLightboxIndex}
    />
  ) : null

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {lightbox}
      {/* Event Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 md:p-6 border-b">
        <button
          type="button"
          onClick={() => event.pubkey && onSelectPubkey?.(event.pubkey)}
          disabled={!event.pubkey || !onSelectPubkey}
          className="flex items-center gap-3 md:gap-4 text-left rounded-md -m-1 p-1 transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent min-w-0 flex-1"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback className="font-mono text-xs">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2 md:mb-1">
              <h2 className="text-lg md:text-xl font-semibold truncate">{authorDisplayName}</h2>
              <Badge variant="outline">Kind {event.kind}</Badge>
            </div>
            {authorProfile?.nip05 && (
              <p className="text-xs text-muted-foreground truncate">{authorProfile.nip05}</p>
            )}
            <p className="text-sm text-muted-foreground font-mono truncate">
              {authorShort}
            </p>
            {event.id && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                ID: {event.id.substring(0, 16)}...
              </p>
            )}
          </div>
        </button>
        <div className="text-sm text-muted-foreground text-right">
          <div>{getRelativeTime(createdAt)}</div>
        </div>
      </div>

      {/* Event Content */}
      <div className="flex-1 p-4 md:p-6 overflow-auto min-h-0">
        {showRawJson ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Raw Event Data</h3>
            <pre className="bg-muted p-2 md:p-4 rounded-lg text-xs font-mono overflow-auto whitespace-pre-wrap break-words">
              {JSON.stringify({
                id: event.id,
                pubkey: event.pubkey,
                created_at: event.created_at,
                kind: event.kind,
                content: event.content,
                tags: event.tags,
                sig: event.sig
              }, null, 2)}
            </pre>
            {actionButtons}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Content */}
            {event.content && (
              <div>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-3 md:p-4 rounded-lg break-words">
                    {(() => {
                      let imgCursor = 0
                      return contentParts.map((part, i) => {
                        if (part.type === "image") {
                          const myIdx = imgCursor++
                          return (
                            <InlineImage
                              key={`img-${i}-${part.value}`}
                              src={part.value}
                              onOpen={() => setLightboxIndex(myIdx)}
                            />
                          )
                        }
                        if (part.type === "video") {
                          return (
                            <video
                              key={`vid-${i}-${part.value}`}
                              src={part.value}
                              controls
                              preload="metadata"
                              className="my-2 block max-h-96 max-w-full rounded-md"
                            />
                          )
                        }
                        if (part.type === "pubkey") {
                          return <PubkeyRef key={i} pubkey={part.pubkey} onSelect={onSelectPubkey} />
                        }
                        if (part.type === "event") {
                          return <EventRef key={i} id={part.id} onSelect={onSelectEvent} />
                        }
                        return <span key={i}>{part.value}</span>
                      })
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tags</h3>
                <div className="space-y-2">
                  {event.tags.map((tag, index) => {
                    const isPubkeyTag = tag[0] === "p" && tag[1]
                    const isEventTag = tag[0] === "e" && tag[1]
                    const marker = isEventTag ? getEventTagMarker(event.tags, index) : null
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {tag[0]}
                        </Badge>
                        {marker && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {marker}
                          </Badge>
                        )}
                        {isPubkeyTag ? (
                          <PubkeyRef pubkey={tag[1]} onSelect={onSelectPubkey} />
                        ) : isEventTag ? (
                          <EventRef id={tag[1]} onSelect={onSelectEvent} />
                        ) : (
                          <span className="text-sm font-mono text-muted-foreground">
                            {tag.slice(1).join(", ")}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Event ID:</span>
                  <div className="font-mono text-xs text-muted-foreground break-all">
                    {event.id || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Public Key:</span>
                  <div className="font-mono text-xs text-muted-foreground break-all">
                    {event.pubkey || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <div className="text-xs text-muted-foreground">
                    {createdAt.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Kind:</span>
                  <div className="text-xs text-muted-foreground">
                    {event.kind}
                  </div>
                </div>
                {event.sig && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Signature:</span>
                    <div className="font-mono text-xs text-muted-foreground break-all">
                      {event.sig}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  )
}