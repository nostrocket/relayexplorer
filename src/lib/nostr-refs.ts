import { decode, npubEncode, noteEncode } from "nostr-tools/nip19"

export type ContentPart =
  | { type: "text"; value: string }
  | { type: "image"; value: string }
  | { type: "video"; value: string }
  | { type: "pubkey"; pubkey: string }
  | { type: "event"; id: string }

const NOSTR_URI_RE = /nostr:(n(?:pub1|profile1|ote1|event1)[a-z0-9]+)/gi
const TAG_REF_RE = /#\[(\d+)\]/g
const URL_RE = /https?:\/\/[^\s]+/g
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|svg|bmp)([?#].*)?$/i
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv)([?#].*)?$/i
const TRAILING_PUNCT_RE = /[.,!?;:)\]]+$/

interface Match {
  start: number
  end: number
  part: ContentPart
}

export function parseContent(content: string, tags: string[][] = []): ContentPart[] {
  const matches: Match[] = []
  let m: RegExpExecArray | null

  NOSTR_URI_RE.lastIndex = 0
  while ((m = NOSTR_URI_RE.exec(content)) !== null) {
    const [raw, code] = m
    try {
      const decoded = decode(code.toLowerCase())
      const start = m.index
      const end = m.index + raw.length
      if (decoded.type === "npub") {
        matches.push({ start, end, part: { type: "pubkey", pubkey: decoded.data } })
      } else if (decoded.type === "nprofile") {
        matches.push({ start, end, part: { type: "pubkey", pubkey: decoded.data.pubkey } })
      } else if (decoded.type === "note") {
        matches.push({ start, end, part: { type: "event", id: decoded.data } })
      } else if (decoded.type === "nevent") {
        matches.push({ start, end, part: { type: "event", id: decoded.data.id } })
      }
    } catch {
      // invalid bech32, leave as text
    }
  }

  TAG_REF_RE.lastIndex = 0
  while ((m = TAG_REF_RE.exec(content)) !== null) {
    const idx = parseInt(m[1], 10)
    const tag = tags[idx]
    if (!tag || !tag[1]) continue
    const start = m.index
    const end = m.index + m[0].length
    if (tag[0] === "p") {
      matches.push({ start, end, part: { type: "pubkey", pubkey: tag[1] } })
    } else if (tag[0] === "e") {
      matches.push({ start, end, part: { type: "event", id: tag[1] } })
    }
  }

  URL_RE.lastIndex = 0
  while ((m = URL_RE.exec(content)) !== null) {
    const rawUrl = m[0]
    const trimmed = rawUrl.replace(TRAILING_PUNCT_RE, "")
    if (IMAGE_EXT_RE.test(trimmed)) {
      matches.push({
        start: m.index,
        end: m.index + trimmed.length,
        part: { type: "image", value: trimmed },
      })
    } else if (VIDEO_EXT_RE.test(trimmed)) {
      matches.push({
        start: m.index,
        end: m.index + trimmed.length,
        part: { type: "video", value: trimmed },
      })
    }
  }

  matches.sort((a, b) => a.start - b.start)

  const nonOverlapping: Match[] = []
  let lastEnd = 0
  for (const match of matches) {
    if (match.start >= lastEnd) {
      nonOverlapping.push(match)
      lastEnd = match.end
    }
  }

  const parts: ContentPart[] = []
  let cursor = 0
  for (const match of nonOverlapping) {
    if (match.start > cursor) {
      parts.push({ type: "text", value: content.slice(cursor, match.start) })
    }
    parts.push(match.part)
    cursor = match.end
  }
  if (cursor < content.length) {
    parts.push({ type: "text", value: content.slice(cursor) })
  }

  return parts
}

export function hexToNpub(hex: string): string {
  try {
    return npubEncode(hex)
  } catch {
    return hex
  }
}

export function hexToNote(hex: string): string {
  try {
    return noteEncode(hex)
  } catch {
    return hex
  }
}

export function truncateBech32(s: string, head = 10, tail = 4): string {
  if (s.length <= head + tail + 3) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

export type EventTagMarker = "root" | "reply" | "mention"
const MARKER_VALUES: readonly string[] = ["root", "reply", "mention"]

/**
 * Resolve NIP-10 marker for the `e` tag at `index`.
 *
 * Why: `e` tags carry three different semantics (reply target, thread root,
 * loose mention) and the UI otherwise shows them identically. Newer clients
 * set tag[3] explicitly; older clients rely on positional order (first = root,
 * last = reply). Mix-and-match between the two is not allowed by NIP-10, so
 * positional inference only kicks in when NO e tag in the event is marked.
 */
export function getEventTagMarker(tags: string[][], index: number): EventTagMarker | null {
  const tag = tags[index]
  if (!tag || tag[0] !== "e") return null

  if (tag[3] && MARKER_VALUES.includes(tag[3])) {
    return tag[3] as EventTagMarker
  }

  const eIndices: number[] = []
  let anyMarked = false
  for (let i = 0; i < tags.length; i++) {
    if (tags[i][0] === "e") {
      eIndices.push(i)
      if (tags[i][3] && MARKER_VALUES.includes(tags[i][3])) anyMarked = true
    }
  }
  if (anyMarked) return null
  if (eIndices.length === 0) return null
  if (eIndices.length === 1) return "reply"
  if (index === eIndices[0]) return "root"
  if (index === eIndices[eIndices.length - 1]) return "reply"
  return "mention"
}
