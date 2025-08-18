import { useState, useEffect, useCallback, useRef } from 'react';
import { NIP66RelayDiscovery } from '@/lib/nip66-relay-discovery';
import type { RelayDiscoveryState, NIP66Relay } from '@/types/app';

export const useNIP66RelayDiscovery = () => {
  const [state, setState] = useState<RelayDiscoveryState>({
    relays: [],
    monitors: [],
    loading: false,
    error: null,
    lastUpdated: null
  });
  
  const discoveryRef = useRef<NIP66RelayDiscovery | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize discovery service immediately
  useEffect(() => {
    if (!discoveryRef.current) {
      discoveryRef.current = new NIP66RelayDiscovery();
    }
  }, []);

  const discoverRelays = useCallback(async (): Promise<void> => {
    if (!discoveryRef.current) {
      console.warn('NIP-66 discovery service not initialized');
      return;
    }

    try {
      // Use progressive discovery with real-time updates
      // Don't override the state here - let the progress callback handle it
      await discoveryRef.current.discoverRelays((progressState) => {
        setState(progressState);
      });
    } catch (error) {
      console.error('Failed to discover relays:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
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
          console.log('Performing periodic relay discovery refresh');
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