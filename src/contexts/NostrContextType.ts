import { createContext } from 'react';
import type { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import type NDK from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import type { RelayMetadata } from '@/types/app';

interface NostrContextType {
  ndk: NDK | null;
  isConnected: boolean;
  connectionError: string | null;
  relayUrl: string | null;
  relayMetadata: RelayMetadata | null;
  connect: (relayUrl: string) => Promise<void>;
  disconnect: () => void;
  subscribe: (filter: NDKFilter, callback: (event: NDKEvent) => void) => NDKSubscription | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const NostrContext = createContext<NostrContextType | undefined>(undefined);
export type { NostrContextType };