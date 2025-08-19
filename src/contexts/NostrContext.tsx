import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import NDK, { NDKEvent, NDKSubscription, NDKRelay } from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import type { RelayMetadata } from '@/types/app';
import { NostrContext } from '@/contexts/NostrContextType';

const MAX_SUBSCRIPTIONS = 10; // Limit active subscriptions
const CONNECTION_TIMEOUT = 30000; // 30 seconds
// const RECONNECT_DELAY = 5000; // 5 seconds (unused for now)

export const NostrProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [relayUrl, setRelayUrl] = useState<string | null>(null);
  const [relayMetadata, setRelayMetadata] = useState<RelayMetadata | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // Resource management
  const activeSubscriptions = useRef<Set<NDKSubscription>>(new Set());
  const connectionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const metadataAbortController = useRef<AbortController | undefined>(undefined);

  const fetchRelayMetadata = useCallback(async (url: string): Promise<RelayMetadata | null> => {
    try {
      // Cancel previous request
      if (metadataAbortController.current) {
        metadataAbortController.current.abort();
      }
      
      metadataAbortController.current = new AbortController();
      
      // Convert ws:// to http:// or wss:// to https://
      const httpUrl = url
        .replace('wss://', 'https://')
        .replace('ws://', 'http://');

      const response = await fetch(httpUrl, {
        headers: {
          'Accept': 'application/nostr+json'
        },
        signal: metadataAbortController.current.signal
      });

      if (!response.ok) {
        console.warn(`Failed to fetch relay metadata: HTTP ${response.status}`);
        return null;
      }

      const metadata = await response.json();
      return metadata;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Relay metadata fetch cancelled');
        return null;
      }
      console.warn('Failed to fetch relay metadata:', error);
      return null;
    }
  }, []);

  const connect = useCallback(async (url: string) => {
    try {
      // Clear existing timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      setConnectionStatus('connecting');
      setConnectionError(null);
      setRelayUrl(url);

      // Cleanup existing connections and subscriptions
      if (ndk) {
        // Stop all active subscriptions
        activeSubscriptions.current.forEach(sub => {
          try {
            sub.stop();
          } catch (e) {
            console.warn('Error stopping subscription:', e);
          }
        });
        activeSubscriptions.current.clear();

        // Disconnect relays
        ndk.pool.relays.forEach((relay: NDKRelay) => {
          try {
            relay.disconnect();
          } catch (e) {
            console.warn('Error disconnecting relay:', e);
          }
        });
      }

      // Fetch relay metadata first (non-blocking)
      fetchRelayMetadata(url).then(metadata => {
        setRelayMetadata(metadata);
      }).catch(e => {
        console.warn('Metadata fetch failed:', e);
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
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
      });

      newNdk.pool.on('relay:disconnect', (relay: NDKRelay) => {
        console.log('Relay disconnected:', relay.url);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });

      setNdk(newNdk);

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        console.warn('Connection timeout reached');
        setConnectionError('Connection timeout');
        setConnectionStatus('error');
        setIsConnected(false);
      }, CONNECTION_TIMEOUT);

      // Connect to the relay
      const connectPromise = newNdk.connect(CONNECTION_TIMEOUT);
      
      connectPromise.catch(error => {
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
    // Clear all timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Cancel metadata fetch
    if (metadataAbortController.current) {
      metadataAbortController.current.abort();
    }

    // Stop all active subscriptions
    activeSubscriptions.current.forEach(sub => {
      try {
        sub.stop();
      } catch (e) {
        console.warn('Error stopping subscription during disconnect:', e);
      }
    });
    activeSubscriptions.current.clear();

    if (ndk) {
      console.log('Disconnecting from relay...');
      ndk.pool.relays.forEach((relay: NDKRelay) => {
        try {
          relay.disconnect();
        } catch (e) {
          console.warn('Error disconnecting relay:', e);
        }
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

    // Enforce subscription limit to prevent memory leaks
    if (activeSubscriptions.current.size >= MAX_SUBSCRIPTIONS) {
      console.warn('Maximum subscriptions reached, stopping oldest subscription');
      const oldestSubscription = activeSubscriptions.current.values().next().value;
      if (oldestSubscription) {
        try {
          oldestSubscription.stop();
          activeSubscriptions.current.delete(oldestSubscription);
        } catch (e) {
          console.warn('Error stopping old subscription:', e);
        }
      }
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

      subscription.on('close', () => {
        console.log('Subscription closed');
        activeSubscriptions.current.delete(subscription);
      });

      // Track the subscription
      activeSubscriptions.current.add(subscription);

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
      // Clear all timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Cancel metadata fetch
      if (metadataAbortController.current) {
        metadataAbortController.current.abort();
      }

      // Stop all subscriptions
      activeSubscriptions.current.forEach(sub => {
        try {
          sub.stop();
        } catch (e) {
          console.warn('Error stopping subscription on unmount:', e);
        }
      });
      activeSubscriptions.current.clear();

      // Disconnect relays
      if (ndk) {
        ndk.pool.relays.forEach((relay: NDKRelay) => {
          try {
            relay.disconnect();
          } catch (e) {
            console.warn('Error disconnecting relay on unmount:', e);
          }
        });
      }
    };
  }, [ndk]);

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

