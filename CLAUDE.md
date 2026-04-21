# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (binds to network via `--host`, default port 5173)
- `npm run build` — typecheck (`tsc -b`) then Vite production build to `dist/`
- `npm run lint` — ESLint across the repo
- `npm run preview` — serve the built `dist/` locally

There is no test runner configured. Deployment is GitHub Pages via `.github/workflows/pages.yml` on push to `main`.

## Architecture

Client-side-only Nostr relay browser built on **React 19 + Vite 7 + TypeScript**, styled with **Tailwind v4** and **shadcn/ui** (new-york style, neutral base, aliases in `components.json`). Path alias `@` → `src`. State flows through React context; there is no backend.

### Connection and subscription lifecycle

`NostrContext` (`src/contexts/NostrContext.tsx`) owns the single active `NDK` instance and is the only place that connects, disconnects, or subscribes. It exposes `connect(url, kinds?, timeFilter?)`, `disconnect()`, and `subscribe(filter, callback)`.

Rules enforced here that consumers rely on:
- Only one relay at a time — calling `connect` tears down the previous NDK pool and active subscriptions before building a new one.
- `MAX_SUBSCRIPTIONS = 10`: a new `subscribe()` call past the cap stops the oldest subscription rather than rejecting.
- 30s connection timeout; metadata fetch runs in parallel with an `AbortController` so a new `connect()` cancels an in-flight metadata fetch.
- NIP-11 metadata is fetched by rewriting `wss://` → `https://` (and `ws://` → `http://`) with `Accept: application/nostr+json`. Same pattern in `useRelay.fetchRelayInfo`.
- EOSE counts and timestamps are tracked on the context so UI can show "end of stored events."

Don't spin up additional `NDK` instances for foreground work — the one exception in-repo is `NIP66RelayDiscovery` (`src/lib/nip66-relay-discovery.ts`), which uses its own dedicated NDK pool across bootstrap relays purely for relay discovery, never for user-facing event display.

### Data flow

`useEvents` (`src/hooks/useEvents.ts`) builds the subscription filter from `subscriptionKinds` and `subscriptionTimeFilter` on the context — **the UI filter (`EventFilter`) is applied client-side after events arrive**, it is not pushed to the relay. Two Maps are kept:
- `eventsMap` keyed by event id — all events.
- `profileEventsMap` keyed by pubkey — latest kind-0 per author (compares `created_at` before replacing).

`useProfiles` turns `profileEventsMap` into `getDisplayName`/`getAvatarUrl`/`getProfile`. `app-sidebar.tsx` derives a unique pubkey list from events, sorts profiles-with-names above truncated-pubkey fallbacks, and uses robohash URLs as avatar fallback.

### UI layout

`AppSidebar` (`src/components/app-sidebar.tsx`) is the core layout and is responsive by branching on `useIsMobile`:
- **Desktop**: hand-rolled two-column layout (`w-80` profiles + `w-96` events) — it does *not* use the shadcn `Sidebar` primitive on desktop. The outer resize handle in `page.tsx` drives a CSS var on `SidebarProvider` for the actual shadcn sidebar (width persisted to `localStorage['sidebar-width']`).
- **Mobile**: single shadcn `Sidebar` with `Tabs` switching between Profiles and Events.

Lists switch to `react-window` virtualization (`VirtualizedEventList`, `VirtualizedProfileList`) above 50 items; below that the non-virtualized branch is kept for easier DOM inspection.

Event kind metadata (labels, categories, deprecation, NIP references) lives in `src/lib/event-kinds.ts` and drives the filter chips in `event-kind-filter.tsx`.

### Relay discovery

Two discovery paths exist:
- `src/lib/nostr-watch-relay-discovery.ts` — the one actually wired into `useNIP66RelayDiscovery` (the hook's filename is historical; it uses nostr.watch now).
- `src/lib/nip66-relay-discovery.ts` + `relay-monitors.ts` — NIP-66 on-network discovery, kept but not the primary path.

`src/lib/relay-data.ts` holds the hardcoded popular-relay fallback list.

## Conventions

- Commits use a `"Problem: <description>"` style for problem statements and conventional prefixes (`refactor:`, `fix:`) for resolutions — see `git log`.
- `src/mock/data.ts` supplies the placeholder user shown in `NavUser`; it is not real auth.
- Reference material in the repo root (`nips.txt`, `relaybrowser.md`, `IMPLEMENTATION_PLAN.md`, `codebase_export.txt`) is for human reading — don't edit these in response to code changes.
