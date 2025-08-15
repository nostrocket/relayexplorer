import { useState, useEffect, useCallback, useMemo } from 'react';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/contexts/NostrContext';
import type { EventFilter } from '@/types/app';

export const useEvents = (initialFilter?: EventFilter) => {
  const { ndk, isConnected, subscribe } = useNostr();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<NDKSubscription | null>(null);
  const [filter, setFilter] = useState<EventFilter>(initialFilter || {});

  // Static subscription filter - gets ALL events, no server-side filtering
  const ndkFilter = useMemo((): NDKFilter => {
    const ndkFilter: NDKFilter = {};
    
    // No filters - get everything and filter client-side only
    // Optionally add a limit to prevent overwhelming the UI
    //ndkFilter.limit = 1000;
    
    return ndkFilter;
  }, []); // No dependencies - filter never changes

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    // Apply authors filter locally (client-side only)
    if (filter.authors && filter.authors.length > 0) {
      filtered = filtered.filter(event => 
        filter.authors!.includes(event.pubkey || '')
      );
    }
    
    // Apply kinds filter locally (client-side only)
    if (filter.kinds && filter.kinds.length > 0) {
      filtered = filtered.filter(event => 
        filter.kinds!.includes(event.kind || 0)
      );
    }
    
    // Apply date range filter locally (client-side only)
    if (filter.dateRange?.from) {
      const fromTimestamp = Math.floor(filter.dateRange.from.getTime() / 1000);
      filtered = filtered.filter(event => 
        (event.created_at || 0) >= fromTimestamp
      );
    }
    
    if (filter.dateRange?.to) {
      const toTimestamp = Math.floor(filter.dateRange.to.getTime() / 1000);
      filtered = filtered.filter(event => 
        (event.created_at || 0) <= toTimestamp
      );
    }
    
    // Apply search filter locally
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filtered = filtered.filter(event => 
        event.content?.toLowerCase().includes(searchTerm) ||
        event.pubkey?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort by created_at descending (newest first)
    filtered.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    
    return filtered;
  }, [events, filter.authors, filter.kinds, filter.dateRange, filter.search]);

  const subscribeToEvents = useCallback(() => {
    console.log('subscribeToEvents called', { isConnected, ndk: !!ndk, filter: ndkFilter });
    
    if (!isConnected || !ndk) {
      console.log('Not subscribing: not connected or no NDK');
      setLoading(false);
      return;
    }

    // Close existing subscription
    if (subscription) {
      console.log('Stopping existing subscription');
      subscription.stop();
      setSubscription(null);
    }

    setLoading(true);
    setError(null);
    
    console.log('Creating new subscription with filter:', ndkFilter);
    const newSubscription = subscribe(ndkFilter, (event: NDKEvent) => {
      console.log('Event received in useEvents:', event.kind, event.id);
      setEvents(prevEvents => {
        // Avoid duplicates
        const exists = prevEvents.some(e => e.id === event.id);
        if (exists) {
          console.log('Duplicate event, skipping:', event.id);
          return prevEvents;
        }
        
        // Add new event and keep sorted by created_at
        const updated = [...prevEvents, event];
        const sorted = updated.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        console.log('Added event, total events:', sorted.length);
        return sorted;
      });
    });

    if (newSubscription) {
      setSubscription(newSubscription);
      console.log('Subscription created successfully');
      
      // Set a timeout to stop loading if no EOSE is received
      const timeout = setTimeout(() => {
        setLoading(false);
        console.log('Subscription loading timeout reached');
      }, 10000);

      // Handle subscription end
      newSubscription.on('eose', () => {
        clearTimeout(timeout);
        setLoading(false);
        console.log('End of stored events received');
      });

      newSubscription.on('close', () => {
        clearTimeout(timeout);
        setLoading(false);
        console.log('Subscription closed');
      });
    } else {
      setLoading(false);
      setError('Failed to create subscription');
      console.error('Failed to create subscription');
    }
  }, [isConnected, ndk, subscribe, ndkFilter]);

  const updateFilter = useCallback((newFilter: Partial<EventFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const exportEvents = useCallback(() => {
    const exportData = filteredEvents.map(event => ({
      id: event.id,
      pubkey: event.pubkey,
      created_at: event.created_at,
      kind: event.kind,
      content: event.content,
      tags: event.tags,
      sig: event.sig
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nostr-events-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  // Subscribe when filter changes or connection is established
  useEffect(() => {
    console.log('useEvents effect triggered', { isConnected });
    if (isConnected) {
      // Add a small delay to ensure connection is fully established
      const timer = setTimeout(() => {
        console.log('Starting subscription after connection delay');
        subscribeToEvents();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      // Clear events when disconnected
      setEvents([]);
      setLoading(false);
      if (subscription) {
        subscription.stop();
        setSubscription(null);
      }
    }
  }, [isConnected, subscribeToEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.stop();
      }
    };
  }, [subscription]);

  return {
    events: filteredEvents,
    loading,
    error,
    filter,
    updateFilter,
    clearEvents,
    exportEvents,
    refetch: subscribeToEvents
  };
};