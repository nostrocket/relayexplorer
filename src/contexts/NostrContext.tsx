import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import NDK, { NDKEvent, NDKSubscription, NDKRelay } from '@nostr-dev-kit/ndk';
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

const NostrContext = createContext<NostrContextType | undefined>(undefined);

export const NostrProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [relayUrl, setRelayUrl] = useState<string | null>(null);
  const [relayMetadata, setRelayMetadata] = useState<RelayMetadata | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  const fetchRelayMetadata = useCallback(async (url: string): Promise<RelayMetadata | null> => {
    try {
      // Convert ws:// to http:// or wss:// to https://
      const httpUrl = url
        .replace('wss://', 'https://')
        .replace('ws://', 'http://');

      const response = await fetch(httpUrl, {
        headers: {
          'Accept': 'application/nostr+json'
        }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch relay metadata: HTTP ${response.status}`);
        return null;
      }

      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.warn('Failed to fetch relay metadata:', error);
      return null;
    }
  }, []);

  const connect = useCallback(async (url: string) => {
    try {
      setConnectionStatus('connecting');
      setConnectionError(null);
      setRelayUrl(url);

      // Disconnect existing connection first
      if (ndk) {
        ndk.pool.relays.forEach((relay: NDKRelay) => {
          relay.disconnect();
        });
      }

      // Fetch relay metadata first (non-blocking)
      fetchRelayMetadata(url).then(metadata => {
        setRelayMetadata(metadata);
      });

      // Create new NDK instance
      const newNdk = new NDK({
        explicitRelayUrls: [url]
      });

      // Set up connection event listeners
      newNdk.pool.on('relay:connect', (relay: NDKRelay) => {
        console.log('Relay connected:', relay.url);
        setIsConnected(true);
        setConnectionStatus('connected');
        setConnectionError(null);
      });

      newNdk.pool.on('relay:disconnect', (relay: NDKRelay) => {
        console.log('Relay disconnected:', relay.url);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });

      setNdk(newNdk);

      // Connect to the relay with timeout
      const connectPromise = newNdk.connect(10000);
      
      // Set up a timer to check connection status
      const connectionCheckTimer = setTimeout(() => {
        const connectedRelays = Array.from(newNdk.pool.relays.values()).filter(
          relay => relay.status === 1 // Connected status
        );
        
        if (connectedRelays.length === 0) {
          console.warn('Connection timeout - no relays connected');
          setConnectionError('Connection timeout');
          setConnectionStatus('error');
          setIsConnected(false);
        }
      }, 15000);
      
      // Don't await here to avoid blocking the UI
      connectPromise.catch(error => {
        clearTimeout(connectionCheckTimer);
        console.error('Failed to connect to relay:', error);
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        setConnectionStatus('error');
        setIsConnected(false);
      });

      console.log('Attempting to connect to relay:', url);
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setConnectionStatus('error');
      setIsConnected(false);
      setNdk(null);
    }
  }, [fetchRelayMetadata, ndk]);

  const disconnect = useCallback(() => {
    if (ndk) {
      console.log('Disconnecting from relay...');
      ndk.pool.relays.forEach((relay: NDKRelay) => {
        relay.disconnect();
      });
    }
    
    setNdk(null);
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setConnectionError(null);
    setRelayUrl(null);
    setRelayMetadata(null);
  }, [ndk]);

  const subscribe = useCallback((filter: NDKFilter, callback: (event: NDKEvent) => void): NDKSubscription | null => {
    if (!ndk) {
      console.warn('Cannot subscribe: NDK not initialized');
      return null;
    }

    try {
      console.log('Creating subscription with filter:', filter);
      const subscription = ndk.subscribe(filter);
      
      subscription.on('event', (event: NDKEvent) => {
        console.log('Received event:', event.kind, event.id);
        callback(event);
      });
      
      subscription.on('eose', () => {
        console.log('End of stored events');
      });

      subscription.start();
      
      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      return null;
    }
  }, [ndk]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ndk) {
        ndk.pool.relays.forEach((relay: NDKRelay) => {
          relay.disconnect();
        });
      }
    };
  }, []);

  return (
    <NostrContext.Provider value={{
      ndk,
      isConnected,
      connectionError,
      relayUrl,
      relayMetadata,
      connect,
      disconnect,
      subscribe,
      connectionStatus
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