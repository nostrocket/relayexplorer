import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/hooks/useNostr';
import type { EventFilter } from '@/types/app';


export const useEvents = (initialFilter?: EventFilter) => {
  const { ndk, isConnected, subscribe, subscriptionKinds } = useNostr();
  const [eventsMap, setEventsMap] = useState<Map<string, NDKEvent>>(new Map());
  const [profileEventsMap, setProfileEventsMap] = useState<Map<string, NDKEvent>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>(initialFilter || {});
  const subscriptionRef = useRef<NDKSubscription | null>(null);

  // Subscription filter using the configured event kinds
  const ndkFilter = useMemo((): NDKFilter => {
    const ndkFilter: NDKFilter = {};
    
    // Use subscription kinds from context
    if (subscriptionKinds && subscriptionKinds.length > 0) {
      ndkFilter.kinds = subscriptionKinds;
    }
    
    return ndkFilter;
  }, [subscriptionKinds]);

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
      // Handle profile events (kind 0) separately
      if (event.kind === 0 && event.pubkey) {
        setProfileEventsMap(prevMap => {
          // For profile events, use pubkey as key to keep only the latest profile per user
          const existing = prevMap.get(event.pubkey);
          
          // Only update if this event is newer than the existing one
          if (!existing || (event.created_at || 0) > (existing.created_at || 0)) {
            const newMap = new Map(prevMap);
            newMap.set(event.pubkey, event);
            return newMap;
          }
          
          return prevMap;
        });
      }
      
      // Handle all events (including profiles for general event listing)
      setEventsMap(prevMap => {
        // Skip if event already exists
        if (prevMap.has(event.id || '')) {
          return prevMap;
        }
        
        // Optimize: Create new Map only when adding new event
        const newMap = new Map(prevMap);
        newMap.set(event.id || '', event);
        
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
        console.log('🔚 EOSE received - End of stored events for subscription:', {
          timestamp: new Date().toISOString(),
          filter: ndkFilter,
          eventCount: eventsMap.size
        });
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
    setProfileEventsMap(new Map());
  }, []);

  // Parse profile data from kind 0 event content
  const parseProfileData = useCallback((content: string) => {
    try {
      const parsed = JSON.parse(content);
      return {
        name: parsed.name,
        about: parsed.about,
        picture: parsed.picture,
        nip05: parsed.nip05
      };
    } catch (error) {
      console.warn('Failed to parse profile data:', error);
      return null;
    }
  }, []);

  // Get profile data for a specific pubkey
  const getProfileData = useCallback((pubkey: string) => {
    const profileEvent = profileEventsMap.get(pubkey);
    if (!profileEvent || !profileEvent.content) {
      return null;
    }
    return parseProfileData(profileEvent.content);
  }, [profileEventsMap, parseProfileData]);

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

  // Subscribe when connection is established or subscription kinds change
  useEffect(() => {
    if (isConnected) {
      // Start subscription immediately when connected or when kinds change
      subscribeToEvents();
    } else {
      // Clear events when disconnected
      setEventsMap(new Map());
      setProfileEventsMap(new Map());
      setLoading(false);
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
    }
  }, [isConnected, subscribeToEvents]); // Include subscribeToEvents since it depends on ndkFilter which now depends on subscriptionKinds

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
    profileEvents: profileEventsMap,
    getProfileData,
    loading,
    error,
    filter,
    updateFilter,
    clearEvents,
    exportEvents,
    refetch: subscribeToEvents
  };
};