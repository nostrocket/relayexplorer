import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Copy, Download, Eye, EyeOff, ExternalLink } from "lucide-react"
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { getRelativeTime } from "@/lib/utils"

interface EventViewerProps {
  event: NDKEvent | null
}

export function EventViewer({ event }: EventViewerProps) {
  const [showRawJson, setShowRawJson] = useState(false)

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

  return (
    <div className="flex flex-1 flex-col">
      {/* Event Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 md:p-6 border-b">
        <div className="flex items-center gap-3 md:gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://robohash.org/${event.pubkey}`} />
            <AvatarFallback className="font-mono text-xs">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2 md:mb-1">
              <h2 className="text-lg md:text-xl font-semibold">Event Kind {event.kind}</h2>
              <Badge variant="outline">{event.kind}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono truncate">
              {authorShort}
            </p>
            {event.id && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                ID: {event.id.substring(0, 16)}...
              </p>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground text-right">
          <div>{getRelativeTime(createdAt)}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 p-2 md:p-4 border-b bg-muted/30">
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

      {/* Event Content */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
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
          </div>
        ) : (
          <div className="space-y-4">
            {/* Content */}
            {event.content && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Content</h3>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-3 md:p-4 rounded-lg break-words">
                    {event.content}
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tags</h3>
                <div className="space-y-2">
                  {event.tags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {tag[0]}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {tag.slice(1).join(', ')}
                      </span>
                    </div>
                  ))}
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
          </div>
        )}
      </div>
    </div>
  )
}