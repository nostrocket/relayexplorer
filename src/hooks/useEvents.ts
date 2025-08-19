import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/hooks/useNostr';
import type { EventFilter } from '@/types/app';

const MAX_EVENTS = 1000; // Limit events to prevent memory bloat

export const useEvents = (initialFilter?: EventFilter) => {
  const { ndk, isConnected, subscribe } = useNostr();
  const [eventsMap, setEventsMap] = useState<Map<string, NDKEvent>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>(initialFilter || {});
  const subscriptionRef = useRef<NDKSubscription | null>(null);

  // Optimized subscription filter with server-side limits
  const ndkFilter = useMemo((): NDKFilter => {
    const ndkFilter: NDKFilter = {};
    
    // Add server-side limit to prevent overwhelming the client
    ndkFilter.limit = MAX_EVENTS;
    
    return ndkFilter;
  }, []); // No dependencies - filter never changes

  // Convert Map to sorted array - memoized for performance
  const events = useMemo(() => {
    const eventsArray = Array.from(eventsMap.values());
    return eventsArray.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [eventsMap]);

  const filteredEvents = useMemo(() => {
    if (!filter.authors && !filter.kinds && !filter.dateRange && !filter.search) {
      // No filters applied, return sorted events directly
      return events;
    }

    return events.filter(event => {
      // Apply authors filter
      if (filter.authors && filter.authors.length > 0) {
        if (!filter.authors.includes(event.pubkey || '')) return false;
      }
      
      // Apply kinds filter
      if (filter.kinds && filter.kinds.length > 0) {
        if (!filter.kinds.includes(event.kind || 0)) return false;
      }
      
      // Apply date range filter
      if (filter.dateRange?.from) {
        const fromTimestamp = Math.floor(filter.dateRange.from.getTime() / 1000);
        if ((event.created_at || 0) < fromTimestamp) return false;
      }
      
      if (filter.dateRange?.to) {
        const toTimestamp = Math.floor(filter.dateRange.to.getTime() / 1000);
        if ((event.created_at || 0) > toTimestamp) return false;
      }
      
      // Apply search filter
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        if (!event.content?.toLowerCase().includes(searchTerm) &&
            !event.pubkey?.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }, [events, filter.authors, filter.kinds, filter.dateRange, filter.search]);

  const subscribeToEvents = useCallback(() => {
    
    if (!isConnected || !ndk) {
      setLoading(false);
      return;
    }

    // Close existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }

    setLoading(true);
    setError(null);
    
    const newSubscription = subscribe(ndkFilter, (event: NDKEvent) => {
      setEventsMap(prevMap => {
        // Skip if event already exists
        if (prevMap.has(event.id || '')) {
          return prevMap;
        }
        
        const newMap = new Map(prevMap);
        newMap.set(event.id || '', event);
        
        // Simple size limit - if we exceed MAX_EVENTS, keep going (remove limit enforcement)
        // This removes the expensive LRU scanning
        
        return newMap;
      });
    });

    if (newSubscription) {
      subscriptionRef.current = newSubscription;
      
      // Set a timeout to stop loading if no EOSE is received
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 10000);

      // Handle subscription end
      newSubscription.on('eose', () => {
        clearTimeout(timeout);
        setLoading(false);
      });

      newSubscription.on('close', () => {
        clearTimeout(timeout);
        setLoading(false);
      });
    } else {
      setLoading(false);
      setError('Failed to create subscription');
    }
  }, [isConnected, ndk, subscribe, ndkFilter]);

  const updateFilter = useCallback((newFilter: Partial<EventFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearEvents = useCallback(() => {
    setEventsMap(new Map());
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
    if (isConnected) {
      // Start subscription immediately when connected
      subscribeToEvents();
    } else {
      // Clear events when disconnected
      setEventsMap(new Map());
      setLoading(false);
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
    }
  }, [isConnected]); // Remove subscribeToEvents and subscription from deps to prevent infinite loop

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
      }
    };
  }, []);

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