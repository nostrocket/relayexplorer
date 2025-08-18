import { useState, useEffect, useCallback, useRef } from 'react';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/hooks/useNostr';

export interface ProfileData {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
}

export interface CachedProfile {
  pubkey: string;
  profile: ProfileData;
  lastUpdated: number;
}

export const useProfiles = () => {
  const { ndk, isConnected, subscribe } = useNostr();
  const [profiles, setProfiles] = useState<Map<string, CachedProfile>>(new Map());
  const [subscription, setSubscription] = useState<NDKSubscription | null>(null);
  const [requestedPubkeys, setRequestedPubkeys] = useState<Set<string>>(new Set());
  const [pendingPubkeys, setPendingPubkeys] = useState<Set<string>>(new Set());
  
  // Use refs to track debounce state
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  
  const DEBOUNCE_DELAY = 5000; // 5 seconds
  
  // Parse kind 0 event content
  const parseProfileData = useCallback((content: string): ProfileData | null => {
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

  // Update subscription with current pending pubkeys
  const updateSubscription = useCallback(() => {
    if (!isConnected || !ndk || pendingPubkeys.size === 0) {
      return;
    }

    // Close existing subscription
    if (subscription) {
      subscription.stop();
      setSubscription(null);
    }

    const pubkeysArray = Array.from(pendingPubkeys);
    console.log('Creating profile subscription for pubkeys:', pubkeysArray.length);

    const filter: NDKFilter = {
      kinds: [0],
      authors: pubkeysArray
    };

    const newSubscription = subscribe(filter, (event: NDKEvent) => {
      console.log('Received kind 0 event for pubkey:', event.pubkey);
      
      if (event.kind === 0 && event.pubkey) {
        const profileData = parseProfileData(event.content || '');
        if (profileData) {
          const cachedProfile: CachedProfile = {
            pubkey: event.pubkey,
            profile: profileData,
            lastUpdated: Date.now()
          };

          setProfiles(prev => new Map(prev).set(event.pubkey, cachedProfile));
          
          // Remove this pubkey from pending requests
          setPendingPubkeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(event.pubkey);
            return newSet;
          });
        }
      }
    });

    if (newSubscription) {
      setSubscription(newSubscription);
      // Mark these pubkeys as requested
      setRequestedPubkeys(prev => new Set([...prev, ...pubkeysArray]));
      lastUpdateTimeRef.current = Date.now();
    }
  }, [isConnected, ndk, subscribe, pendingPubkeys, subscription, parseProfileData]);

  // Debounced subscription update
  const scheduleSubscriptionUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
    const delay = Math.max(0, DEBOUNCE_DELAY - timeSinceLastUpdate);

    debounceTimeoutRef.current = setTimeout(() => {
      updateSubscription();
    }, delay);
  }, [updateSubscription]);

  // Request profiles for new pubkeys
  const requestProfiles = useCallback((pubkeys: string[]) => {
    const newPubkeys = pubkeys.filter(pubkey => 
      !profiles.has(pubkey) && !requestedPubkeys.has(pubkey)
    );

    if (newPubkeys.length > 0) {
      console.log('Requesting profiles for new pubkeys:', newPubkeys.length);
      setPendingPubkeys(prev => {
        const newSet = new Set(prev);
        newPubkeys.forEach(pubkey => newSet.add(pubkey));
        return newSet;
      });
    }
  }, [profiles, requestedPubkeys]);

  // Effect to trigger subscription updates when pending pubkeys change
  useEffect(() => {
    if (pendingPubkeys.size > 0) {
      scheduleSubscriptionUpdate();
    }
  }, [pendingPubkeys, scheduleSubscriptionUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.stop();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [subscription]);

  // Get profile for a specific pubkey
  const getProfile = useCallback((pubkey: string): ProfileData | null => {
    const cached = profiles.get(pubkey);
    return cached ? cached.profile : null;
  }, [profiles]);

  // Get display name for a pubkey
  const getDisplayName = useCallback((pubkey: string): string => {
    const profile = getProfile(pubkey);
    return profile?.name || `${pubkey.substring(0, 8)}...`;
  }, [getProfile]);

  // Get avatar URL for a pubkey
  const getAvatarUrl = useCallback((pubkey: string): string | null => {
    const profile = getProfile(pubkey);
    return profile?.picture || null;
  }, [getProfile]);

  return {
    profiles: profiles,
    requestProfiles,
    getProfile,
    getDisplayName,
    getAvatarUrl,
    isLoading: pendingPubkeys.size > 0
  };
};