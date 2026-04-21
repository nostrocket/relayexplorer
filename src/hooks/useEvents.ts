import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/hooks/useNostr';
import type { EventFilter } from '@/types/app';


const AUTHOR_SUBSCRIPTION_LIMIT = 500;
const PROFILE_BATCH_SIZE = 20;
const PROFILE_BATCH_TIMEOUT_MS = 8000;

export const useEvents = (initialFilter?: EventFilter, authorPubkey?: string | null) => {
  const {
    ndk,
    isConnected,
    subscribe,
    subscriptionKinds,
    subscriptionTimeFilter,
    profileEventsMap,
    recordProfileEvent,
  } = useNostr();
  const [eventsMap, setEventsMap] = useState<Map<string, NDKEvent>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>(initialFilter || {});
  const [batchTick, setBatchTick] = useState(0);
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const authorSubscriptionRef = useRef<NDKSubscription | null>(null);
  const batchSubRef = useRef<NDKSubscription | null>(null);
  const attemptedPubkeysRef = useRef<Set<string>>(new Set());
  const eventsMapRef = useRef(eventsMap);
  const profileEventsMapRef = useRef(profileEventsMap);

  useEffect(() => { eventsMapRef.current = eventsMap; }, [eventsMap]);
  useEffect(() => { profileEventsMapRef.current = profileEventsMap; }, [profileEventsMap]);

  // Nudge the batch processor whenever new events or new profiles arrive.
  // The processor itself reads from refs, so it does not tear down on these changes.
  useEffect(() => {
    setBatchTick(t => t + 1);
  }, [eventsMap, profileEventsMap]);

  const handleIncomingEvent = useCallback((event: NDKEvent) => {
    if (event.kind === 0 && event.pubkey) {
      recordProfileEvent(event);
    }

    setEventsMap(prevMap => {
      if (prevMap.has(event.id || '')) {
        return prevMap;
      }
      const newMap = new Map(prevMap);
      newMap.set(event.id || '', event);
      return newMap;
    });
  }, [recordProfileEvent]);

  // Subscription filter using the configured event kinds and time filter
  const ndkFilter = useMemo((): NDKFilter => {
    const ndkFilter: NDKFilter = {};
    
    // Use subscription kinds from context
    if (subscriptionKinds && subscriptionKinds.length > 0) {
      ndkFilter.kinds = subscriptionKinds;
    }
    
    // Apply time filter from context
    if (subscriptionTimeFilter?.since) {
      ndkFilter.since = subscriptionTimeFilter.since;
    }
    
    if (subscriptionTimeFilter?.until) {
      ndkFilter.until = subscriptionTimeFilter.until;
    }
    
    // Apply limit filter from context
    if (subscriptionTimeFilter?.limit) {
      ndkFilter.limit = subscriptionTimeFilter.limit;
    }
    
    return ndkFilter;
  }, [subscriptionKinds, subscriptionTimeFilter]);

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
    
    const newSubscription = subscribe(ndkFilter, handleIncomingEvent);

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
  }, [isConnected, ndk, subscribe, ndkFilter, handleIncomingEvent]);

  const updateFilter = useCallback((newFilter: Partial<EventFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearEvents = useCallback(() => {
    setEventsMap(new Map());
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
      // Clear events when disconnected (profileEventsMap is reset in NostrContext)
      setEventsMap(new Map());
      setLoading(false);
      attemptedPubkeysRef.current = new Set();
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
      if (authorSubscriptionRef.current) {
        authorSubscriptionRef.current.stop();
        authorSubscriptionRef.current = null;
      }
      if (batchSubRef.current) {
        batchSubRef.current.stop();
        batchSubRef.current = null;
      }
    }
  }, [isConnected, subscribeToEvents]); // Include subscribeToEvents since it depends on ndkFilter which now depends on subscriptionKinds

  // Per-author kind-1 subscription: opens when a profile is selected, closes on switch
  useEffect(() => {
    if (authorSubscriptionRef.current) {
      authorSubscriptionRef.current.stop();
      authorSubscriptionRef.current = null;
    }

    if (!isConnected || !ndk || !authorPubkey) {
      return;
    }

    const authorFilter: NDKFilter = {
      kinds: [1],
      authors: [authorPubkey],
      limit: AUTHOR_SUBSCRIPTION_LIMIT,
    };

    const sub = subscribe(authorFilter, handleIncomingEvent);
    if (sub) {
      authorSubscriptionRef.current = sub;
    }

    return () => {
      if (authorSubscriptionRef.current) {
        authorSubscriptionRef.current.stop();
        authorSubscriptionRef.current = null;
      }
    };
  }, [authorPubkey, isConnected, ndk, subscribe, handleIncomingEvent]);

  // Batch-fetch kind-0 profiles for every pubkey we've seen that doesn't have one.
  // One REQ at a time with up to PROFILE_BATCH_SIZE authors; sequential so we never
  // stack multiple batches against the subscription cap.
  useEffect(() => {
    if (!isConnected || !ndk || batchSubRef.current) return;

    const events = eventsMapRef.current;
    const profiles = profileEventsMapRef.current;
    const attempted = attemptedPubkeysRef.current;

    const missing: string[] = [];
    const seen = new Set<string>();
    for (const event of events.values()) {
      const pk = event.pubkey;
      if (!pk || seen.has(pk)) continue;
      seen.add(pk);
      if (profiles.has(pk) || attempted.has(pk)) continue;
      missing.push(pk);
      if (missing.length >= PROFILE_BATCH_SIZE) break;
    }

    if (missing.length === 0) return;

    missing.forEach(pk => attempted.add(pk));

    const sub = subscribe(
      { kinds: [0], authors: missing, limit: missing.length },
      handleIncomingEvent
    );
    if (!sub) return;

    batchSubRef.current = sub;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (batchSubRef.current === sub) {
        try { sub.stop(); } catch { /* noop */ }
        batchSubRef.current = null;
        setBatchTick(t => t + 1);
      }
    };

    sub.on('eose', finish);
    sub.on('close', finish);
    setTimeout(finish, PROFILE_BATCH_TIMEOUT_MS);
    // No effect cleanup — the batch must survive re-renders triggered by
    // unrelated eventsMap/profileEventsMap changes. Disconnect and unmount
    // handlers elsewhere in this file tear down batchSubRef directly.
  }, [batchTick, isConnected, ndk, subscribe, handleIncomingEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
      }
      if (authorSubscriptionRef.current) {
        authorSubscriptionRef.current.stop();
      }
      if (batchSubRef.current) {
        batchSubRef.current.stop();
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