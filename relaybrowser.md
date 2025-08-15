# Software Requirements Specification (SRS) for Nostr Relay Explorer App

## Table of Contents

1. Introduction  
   1.1 Purpose  
   1.2 Scope  
   1.3 Definitions, Acronyms, and Abbreviations  
   1.4 References  
   1.5 Overview  

2. Overall Description  
   2.1 Product Perspective  
   2.2 Product Functions  
   2.3 User Classes and Characteristics  
   2.4 Operating Environment  
   2.5 Design and Implementation Constraints  
   2.6 Assumptions and Dependencies  

3. Specific Requirements  
   3.1 External Interfaces  
   3.2 Functional Requirements  
   3.3 Non-Functional Requirements  
   3.4 Table of Requirements  

4. Supporting Information  
   Appendix A: Glossary  

5. Implementation Notes  
   5.1 Project Structure  
   5.2 Implementation Instructions for Engineers
   5.3 Key Implementation Examples  

## 1. Introduction

### 1.1 Purpose
The purpose of this Software Requirements Specification (SRS) is to provide a comprehensive and detailed description of the requirements for the Nostr Relay Explorer App, a client-side web application for browsing content on a user-specified Nostr relay. This document outlines the functional and non-functional requirements to guide development, testing, and validation, ensuring the app meets user needs for exploring Nostr events in an email-client-inspired interface. It serves as a contract between stakeholders, developers, and testers, based on established standards for SRS documents.

### 1.2 Scope
The Nostr Relay Explorer App allows users to input a single relay URL, connect via WebSocket, fetch and subscribe to events (e.g., notes of kind:1), and display them in an intuitive, email-like UI with filtering, sorting, and real-time updates. The app is read-only, operates in the browser, and focuses on usability inspired by email clients like Gmail or Outlook. Key features include relay metadata display, event timelines, and previews. Out-of-scope items include relay discovery, multi-relay support, event publishing, and server-side components.

### 1.3 Definitions, Acronyms, and Abbreviations
- **Nostr**: Notes and Other Stuff Transmitted by Relays – A decentralized protocol for social networking.
- **Relay**: A server that stores and distributes Nostr events.
- **Event**: Data packets in Nostr (e.g., kind:1 for text notes).
- **NIP**: Nostr Implementation Possibility – Standards for protocol features (e.g., NIP-11 for relay info).
- **NDK**: Nostr Development Kit – A TypeScript library for building Nostr applications.
- **SRS**: Software Requirements Specification.
- **UI**: User Interface.
- **WS**: WebSocket.
- **JSON**: JavaScript Object Notation.
- **shadcn/ui**: A customizable React UI component library based on Tailwind CSS and Radix UI for building design systems.

### 1.4 References
- IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications.
- ISO/IEC/IEEE 29148:2018: Systems and software engineering — Life cycle processes — Requirements engineering.
- Nostr Protocol NIPs: https://github.com/nostr-protocol/nips.
- NDK Documentation: https://github.com/nostr-dev-kit/ndk.
- nostr-tools Library Documentation: https://github.com/nbd-wtf/nostr-tools.
- shadcn/ui Documentation: https://ui.shadcn.com/.

### 1.5 Overview
This SRS is organized as follows: Section 2 provides an overall description of the product; Section 3 details specific requirements, including a table summarizing all requirements; Section 4 includes supporting information; Section 5 provides implementation notes based on the existing codebase structure.

## 2. Overall Description

### 2.1 Product Perspective
The Nostr Relay Explorer App is a standalone, browser-based tool for exploring Nostr relays, addressing the need for simple, decentralized content browsing without full client integration. It builds on the Nostr protocol's event-based architecture, providing an accessible interface for users to view relay content, similar to how email clients manage messages. The application leverages the existing email-client UI pattern established in the current codebase, adapting it for Nostr event browsing.

### 2.2 Product Functions
- Connect to a user-provided relay URL via WebSocket
- Fetch and display relay metadata (NIP-11)
- Subscribe to and fetch events with filters (kinds, authors, timestamps)
- Display events in a three-pane UI: sidebar (navigation and filters), list (event timeline), preview (event details)
- Support real-time updates via WebSocket subscriptions
- Provide search, sorting, and filtering capabilities
- Export events as JSON
- Persist user preferences (theme, relay URL) in localStorage

### 2.3 User Classes and Characteristics
- **End Users**: Nostr enthusiasts or developers with basic protocol knowledge; frequent users needing intuitive browsing.
- **Developers**: Technical users exploring relay content for debugging or analysis.
- **Testers/Reviewers**: Technical users verifying functionality; require debugging tools.

### 2.4 Operating Environment
- **Browser**: Latest Chrome, Firefox, Safari, or Edge on desktop/mobile
- **Framework**: React 19+ with TypeScript
- **Build Tool**: Vite 7+
- **UI Library**: shadcn/ui components with Tailwind CSS v4
- **State Management**: React hooks and context
- **Hosting**: Static hosting (e.g., GitHub Pages, Vercel)
- **Dependencies**: NDK or nostr-tools for Nostr protocol, Radix UI primitives

### 2.5 Design and Implementation Constraints
- Use existing React + TypeScript + Vite project structure
- Leverage existing shadcn/ui components (Sidebar, Button, Input, Card, etc.)
- Maintain the established three-pane layout pattern from the email client
- Read-only operations; no private key handling
- Responsive design using Tailwind CSS v4
- Follow existing code patterns for hooks and components
- Adhere to Nostr NIPs (e.g., NIP-01 for events, NIP-11 for metadata)

### 2.6 Assumptions and Dependencies
- Users provide valid relay URLs (ws:// or wss://)
- Relays support standard NIPs
- Browser supports WebSockets and localStorage
- Dependencies on NDK/nostr-tools for protocol compliance
- Existing shadcn/ui components provide base UI functionality
- Theme system (light/dark) already implemented

## 3. Specific Requirements

### 3.1 External Interfaces
- **User Interfaces**: 
  - Three-pane layout using existing `SidebarProvider`, `AppSidebar`, and content area patterns
  - Relay connection input in sidebar header using `SidebarInput` component
  - Event list in sidebar content area
  - Event preview in main content area (`SidebarInset`)
  - Theme toggle using existing `ThemeToggle` component
- **Software Interfaces**: 
  - WebSocket connection to Nostr relay
  - HTTP request for NIP-11 relay metadata
  - localStorage for preferences persistence
- **Communications Interfaces**: WS/WSS protocols for real-time event streaming

### 3.2 Functional Requirements
Organized by feature:

- **Relay Connection (REQ-FUNC-1)**: 
  - Input relay URL in sidebar header
  - Validate URL format (ws:// or wss://)
  - Establish WebSocket connection
  - Display connection status using badges
  - Handle connection errors gracefully

- **Metadata Display (REQ-FUNC-2)**: 
  - Fetch relay information via NIP-11
  - Display relay name, description, and supported NIPs
  - Show connection limitations

- **Event Handling (REQ-FUNC-3)**: 
  - Subscribe to events with configurable filters
  - Default to kind:1 (text notes)
  - Support filtering by author, time range, and event kinds
  - Handle real-time event updates

- **UI Display (REQ-FUNC-4)**: 
  - Adapt existing email list pattern for event timeline
  - Show event preview in main content area
  - Display author, content, timestamp for each event
  - Support event selection and navigation

- **Enhancements (REQ-FUNC-5)**: 
  - Search events locally
  - Sort by date, author, or relevance
  - Export selected events as JSON
  - Persist filters and preferences

### 3.3 Non-Functional Requirements
- **Performance (REQ-NF-1)**: 
  - Connection establishment <5 seconds
  - Handle 1000+ events without UI lag
  - Smooth scrolling in event list
  - Efficient re-renders using React optimization

- **Security (REQ-NF-2)**: 
  - Read-only operations only
  - Prefer wss:// over ws:// connections
  - Display privacy warnings for sensitive content
  - No private key operations

- **Usability (REQ-NF-3)**: 
  - Responsive design (mobile and desktop)
  - Accessible components (ARIA labels via Radix UI)
  - Keyboard navigation support
  - Theme persistence (light/dark mode)

- **Reliability (REQ-NF-4)**: 
  - Graceful error handling with user feedback
  - Automatic reconnection on connection loss
  - Event caching for offline viewing
  - State persistence across sessions

### 3.4 Table of Requirements

| ID          | Requirement Description                                                               | Type        | Priority | Component/File              |
|-------------|--------------------------------------------------------------------------------------|-------------|----------|----------------------------|
| REQ-FUNC-1  | App shall allow user to input relay URL and establish WebSocket connection          | Functional  | High     | AppSidebar, NostrContext   |
| REQ-FUNC-2  | Fetch and display relay metadata via NIP-11 upon connection                         | Functional  | Medium   | useRelay hook              |
| REQ-FUNC-3  | Subscribe to events (default kind:1) with filters for kinds, authors, timestamps    | Functional  | High     | useEvents, useSubscription |
| REQ-FUNC-4  | Display events in three-pane UI using existing sidebar and content components       | Functional  | High     | AppSidebar, EventViewer    |
| REQ-FUNC-5  | Support local search, sorting (date/author), and JSON export                        | Functional  | Medium   | useEvents, EventViewer     |
| REQ-NF-1    | Connection time <5s; handle up to 1000 events efficiently                           | Performance | High     | NostrContext               |
| REQ-NF-2    | Read-only mode; use wss://; display privacy warnings                                | Security    | High     | NostrContext               |
| REQ-NF-3    | Responsive UI; ARIA labels for accessibility; theme persistence                     | Usability   | High     | All UI components          |
| REQ-NF-4    | Handle errors gracefully; cache events for offline viewing                          | Reliability | Medium   | NostrContext, useEvents    |
| REQ-NF-5    | Limit subscriptions to avoid overload; support light/dark theme                     | Usability   | Low      | ThemeProvider, useEvents   |

## 4. Supporting Information

### Appendix A: Glossary
- **Event Kind**: Numeric identifier for event types in Nostr (e.g., 0 = metadata, 1 = text note)
- **Subscription**: WebSocket connection filter for receiving specific events
- **EOSE**: End of Stored Events - signal from relay when historical events are sent
- **Hex Key**: 64-character hexadecimal public key identifier
- **NIP-11**: Relay Information Document specification
- **Three-pane UI**: Interface pattern with navigation, list, and detail views

## 5. Implementation Notes

### 5.1 Project Structure
The existing codebase follows this structure:
```
/src
  /components
    /ui          # shadcn/ui components (Button, Sidebar, Input, etc.)
    app-sidebar.tsx    # Main sidebar component with dual-sidebar pattern
    email-viewer.tsx   # Content viewer (to be adapted for events)
    nav-user.tsx       # User navigation component
    page.tsx          # Main page layout
    theme-provider.tsx # Theme management
    theme-toggle.tsx   # Theme switcher
  /hooks
    use-mobile.ts     # Mobile detection hook
  /lib
    utils.ts         # Utility functions (cn for className merging)
  /mock
    data.ts          # Mock data (to be replaced with Nostr events)
  App.tsx           # Root application component
  main.tsx          # Application entry point
  index.css         # Global styles with Tailwind CSS v4
```

### 5.2 Implementation Instructions for Engineers

#### Engineer A: Core Nostr Infrastructure

**1. Create NostrContext Provider**
File: `/src/contexts/NostrContext.tsx` (NEW)
```typescript
// Create a new context that manages:
// - NDK instance
// - WebSocket connection state
// - Relay URL management
// - Event subscriptions
```

**2. Install Dependencies**
```bash
npm install @nostr-dev-kit/ndk
# or
npm install nostr-tools
```

**3. Modify App.tsx**
- Wrap the existing ThemeProvider with NostrProvider
- Import NostrContext from the new file

**4. Create Profile Management Hook**
File: `/src/hooks/useProfiles.ts` (NEW)
```typescript
// Implement:
// - fetchProfile(pubkey: string): Promise<ProfileMetadata>
// - subscribeToProfiles(pubkeys: string[]): Subscription
// - Profile caching logic
```

#### Engineer B: UI Adaptations

**1. Create ProfileSidebar Component**
File: `/src/components/app-sidebar.tsx` (SidebarMenu component)
- Use existing Sidebar component patterns
- Replace the mockdata with profile events

**2. Modify app-sidebar.tsx**
Replace mock data with Nostr events:
- Line 23: Replace `mockData.navMain` with event kinds
- Line 24: Replace `mockData.mails` with Nostr events
- Line 38-55: Update the first sidebar to show event kinds instead of email folders
- Line 87-125: Update the second sidebar to display Nostr events

**3. Transform email-viewer.tsx to event-viewer.tsx**
File: Rename to `/src/components/event-viewer.tsx`
- Line 8: Change interface from `MailItem` to `NDKEvent`
- Line 14-22: Update empty state text for events
- Line 28-42: Replace email header with event metadata
- Line 45-70: Replace email actions with event actions (Raw JSON, Copy ID, etc.)
- Line 73-81: Display event content and tags

**4. Update page.tsx**
- Line 3: Import EventViewer instead of EmailViewer
- Line 18: Update state type to `NDKEvent | null`
- Line 26: Add ProfileSidebar before AppSidebar
- Line 27: Pass relay connection UI to AppSidebar header

**5. Create RelayConnector Component**
File: `/src/components/relay-connector.tsx` (NEW)
- Use SidebarInput component for relay URL input
- Add connection button using Button component
- Display ConnectionStatus component

#### Engineer C: Event Management & Data Flow

**1. Replace Mock Data**
File: `/src/mock/data.ts`
- Remove email-related mock data
- Add mock Nostr events for development
- Create event type definitions

**2. Create useEvents Hook**
File: `/src/hooks/useEvents.ts` (NEW)
```typescript
// Implement:
// - Event fetching from relay
// - Event filtering (kinds, authors, time)
// - Real-time subscription management
// - Local search functionality
```

**3. Create useRelay Hook**
File: `/src/hooks/useRelay.ts` (NEW)
```typescript
// Implement:
// - Relay connection management
// - NIP-11 metadata fetching
// - Connection status tracking
// - Error handling
```

**4. Update Navigation Structure**
File: `/src/mock/navigation.json`
Replace email folders with event kinds:
```json
[
  { "title": "Text Notes", "url": "#", "icon": "FileText", "kind": 1 },
  { "title": "Profiles", "url": "#", "icon": "User", "kind": 0 },
  { "title": "Reactions", "url": "#", "icon": "Heart", "kind": 7 },
  // etc.
]
```

### 5.3 Key Implementation Examples

#### NostrContext Provider
```typescript
// src/contexts/NostrContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NDK, { NDKEvent, NDKSubscription, NDKFilter } from '@nostr-dev-kit/ndk';

interface NostrContextType {
  ndk: NDK | null;
  isConnected: boolean;
  connectionError: string | null;
  relayUrl: string | null;
  connect: (relayUrl: string) => Promise<void>;
  disconnect: () => void;
  subscribe: (filter: NDKFilter, callback: (event: NDKEvent) => void) => NDKSubscription | null;
}

const NostrContext = createContext<NostrContextType | undefined>(undefined);

export const NostrProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [relayUrl, setRelayUrl] = useState<string | null>(null);

  const connect = async (url: string) => {
    setRelayUrl(url);
    // ...existing connection logic...
  };

  const disconnect = () => {
    // ...existing disconnection logic...
  };

  const subscribe = (filter: NDKFilter, callback: (event: NDKEvent) => void) => {
    // ...existing subscription logic...
  };

  return (
    <NostrContext.Provider value={{
      ndk,
      isConnected,
      connectionError,
      relayUrl,
      connect,
      disconnect,
      subscribe
    }}>
      {children}
    </NostrContext.Provider>
  );
};

export const useNostr = () => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error('useNostr must be used within NostrProvider');
  }
  return context;
};
```

#### Adapting AppSidebar for Nostr
```typescript
// src/components/app-sidebar.tsx
// Modify existing AppSidebar to handle Nostr events
export function AppSidebar({ onEventSelect, ...props }: AppSidebarProps) {
  const { events, loading } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<NDKEvent | null>(null);
  
  // First sidebar: Event kinds/filters
  // Second sidebar: Event list
  // ...adapt existing structure...
}
```

#### EventViewer Component (adapted from EmailViewer)
```typescript
// src/components/event-viewer.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { NDKEvent } from '@nostr-dev-kit/ndk';

interface EventViewerProps {
  event: NDKEvent | null;
}

export function EventViewer({ event }: EventViewerProps) {
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
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Event header, content, and raw JSON view */}
      {/* ...implementation using existing UI components... */}
    </div>
  );
}
```

#### Custom Hooks for Nostr
```typescript
// src/hooks/useEvents.ts
import { useState, useEffect, useCallback } from 'react';
import { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/contexts/NostrContext';

export const useEvents = (filter?: NDKFilter) => {
  const { ndk, isConnected, subscribe } = useNostr();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ...implementation...
  
  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    setEvents
  };
};
```

### Relay Management Tasks (Engineer C)

#### Task Checklist
- [ ] **Implement Relay Connection Handler**
  - Create WebSocket connection management
  - Validate relay URLs (ws:// or wss:// protocols)
  - Implement connection retry logic with exponential backoff
  - Handle connection state transitions
  - Setup connection health monitoring
  
- [ ] **Build Relay Metadata Fetcher**
  - Implement NIP-11 metadata HTTP request
  - Parse and validate relay information document
  - Handle CORS and network errors gracefully
  - Cache metadata for session duration
  - Create fallback for relays without metadata
  
- [ ] **Create Connection Status Component**
  - Design status indicator badges (connected/disconnected/error)
  - Add animated loading state during connection
  - Implement error message display
  - Create connection statistics display (optional)
  - Add reconnect button for error states
  
- [ ] **Setup Relay Information Display**
  - Format and display relay name and description
  - Show supported NIPs as badges
  - Display relay limitations (max subscriptions, etc.)
  - Create collapsible details section
  - Add copy-to-clipboard for relay URL

#### Relay Connection Handler
```typescript
// src/hooks/useRelay.ts
import { useState, useCallback } from 'react';
import { nip11 } from 'nostr-tools';

interface RelayInfo {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: {
    max_message_length?: number;
    max_subscriptions?: number;
    max_filters?: number;
    max_limit?: number;
    max_subid_length?: number;
    min_prefix?: number;
    max_event_tags?: number;
    max_content_length?: number;
    payment_required?: boolean;
  };
}

export const useRelay = () => {
  const [relayInfo, setRelayInfo] = useState<RelayInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const fetchRelayInfo = useCallback(async (relayUrl: string) => {
    setInfoLoading(true);
    setInfoError(null);

    try {
      // Convert ws:// to http:// or wss:// to https://
      const httpUrl = relayUrl
        .replace('wss://', 'https://')
        .replace('ws://', 'http://');

      const response = await fetch(httpUrl, {
        headers: {
          'Accept': 'application/nostr+json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const info = await response.json();
      setRelayInfo(info);
    } catch (error) {
      console.warn('Failed to fetch relay info:', error);
      setInfoError('Could not fetch relay information');
      // Don't fail the connection if info fetch fails
    } finally {
      setInfoLoading(false);
    }
  }, []);

  return {
    relayInfo,
    infoLoading,
    infoError,
    fetchRelayInfo
  };
};
```

#### Connection Status Component
```typescript
// src/components/relay/ConnectionStatus.tsx
import { useNostr } from '@/contexts/NostrContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionError } = useNostr();

  if (connectionError) {
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="h-3 w-3" />
        Error
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge variant="success" className="gap-1">
        <Wifi className="h-3 w-3" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <WifiOff className="h-3 w-3" />
      Disconnected
    </Badge>
  );
};
```

### Type Definitions
```typescript
// src/types/app.ts
export interface EventFilter {
  kinds?: number[];
  authors?: string[];
  search?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface RelayConnection {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  metadata?: RelayMetadata;
}

export interface RelayMetadata {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
}
```
  return (
    <Badge variant="secondary" className="gap-1">
      <WifiOff className="h-3 w-3" />
      Disconnected
    </Badge>
  );
};
```

### Type Definitions
```typescript
// src/types/app.ts
export interface EventFilter {
  kinds?: number[];
  authors?: string[];
  search?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface RelayConnection {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  metadata?: RelayMetadata;
}

export interface RelayMetadata {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
}
```

