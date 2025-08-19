import { useState, useEffect, useCallback, useRef } from 'react';
import { NostrWatchRelayDiscovery } from '@/lib/nostr-watch-relay-discovery';
import type { RelayDiscoveryState, NIP66Relay } from '@/types/app';

export const useNIP66RelayDiscovery = () => {
  const [state, setState] = useState<RelayDiscoveryState>({
    relays: [],
    monitors: [],
    loading: false,
    error: null,
    lastUpdated: null
  });
  
  const discoveryRef = useRef<NostrWatchRelayDiscovery | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize discovery service immediately
  useEffect(() => {
    if (!discoveryRef.current) {
      discoveryRef.current = new NostrWatchRelayDiscovery();
    }
  }, []);

  const discoverRelays = useCallback(async (): Promise<void> => {
    if (!discoveryRef.current) {
      console.warn('nostr.watch discovery service not initialized');
      return;
    }

    // The NostrWatchRelayDiscovery service handles all errors internally
    // and never throws - it always returns valid state with fallbacks
    await discoveryRef.current.discoverRelays((progressState) => {
      setState(progressState);
    });
  }, []);

  // Auto-discover relays when discovery service is initialized
  useEffect(() => {
    if (discoveryRef.current && state.relays.length === 0 && !state.loading) {
      discoverRelays();
    }
  }, [discoverRelays, state.relays.length, state.loading]);

  // Set up periodic refresh
  useEffect(() => {
    const startPeriodicRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Refresh every 30 minutes
      refreshIntervalRef.current = setInterval(() => {
        if (discoveryRef.current && !state.loading) {
          discoverRelays();
        }
      }, 30 * 60 * 1000);
    };

    if (discoveryRef.current && state.relays.length > 0) {
      startPeriodicRefresh();
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [discoverRelays, state.relays.length, state.loading]);

  const getRelaysForCombobox = useCallback(() => {
    return state.relays.map(relay => ({
      value: relay.url,
      label: relay.name || relay.url.replace(/^wss?:\/\//, ''),
      description: relay.description || `Confidence: ${Math.round(relay.confidence * 100)}%`,
      status: relay.status,
      confidence: relay.confidence
    }));
  }, [state.relays]);

  const getOnlineRelays = useCallback(() => {
    return state.relays
      .filter(relay => relay.status === 'online' && relay.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
  }, [state.relays]);

  const getRelayByUrl = useCallback((url: string): NIP66Relay | undefined => {
    return state.relays.find(relay => relay.url === url);
  }, [state.relays]);

  const refreshRelays = useCallback(async (): Promise<void> => {
    if (discoveryRef.current) {
      discoveryRef.current.clearCache();
      await discoverRelays();
    }
  }, [discoverRelays]);

  return {
    ...state,
    discoverRelays,
    refreshRelays,
    getRelaysForCombobox,
    getOnlineRelays,
    getRelayByUrl,
    isInitialized: !!discoveryRef.current
  };
};