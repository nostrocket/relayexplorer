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

const PROFILE_CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const MAX_BATCH_SIZE = 50; // Maximum pubkeys per batch request
const MIN_BATCH_DELAY = 2000; // Minimum time between batch requests

export const useProfiles = () => {
  const { ndk, isConnected, subscribe } = useNostr();
  const [profiles, setProfiles] = useState<Map<string, CachedProfile>>(new Map());
  const [subscription, setSubscription] = useState<NDKSubscription | null>(null);
  const [requestedPubkeys, setRequestedPubkeys] = useState<Set<string>>(new Set());
  const [pendingPubkeys, setPendingPubkeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // Use refs to track batching state
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBatchTimeRef = useRef<number>(0);
  const activeBatchesRef = useRef<Set<string>>(new Set());
  
  // Check if cached profile is still valid
  const isProfileCacheValid = useCallback((cachedProfile: CachedProfile): boolean => {
    return Date.now() - cachedProfile.lastUpdated < PROFILE_CACHE_TTL;
  }, []);

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

  // Create optimized batched subscription
  const createBatchSubscription = useCallback((pubkeysBatch: string[]) => {
    if (!isConnected || !ndk || pubkeysBatch.length === 0) {
      return;
    }

    // Close existing subscription
    if (subscription) {
      subscription.stop();
      setSubscription(null);
    }

    console.log('Creating profile subscription for batch:', pubkeysBatch.length, 'pubkeys');
    setIsLoading(true);

    const filter: NDKFilter = {
      kinds: [0],
      authors: pubkeysBatch,
      limit: Math.min(pubkeysBatch.length * 2, 200) // Reasonable limit
    };

    const newSubscription = subscribe(filter, (event: NDKEvent) => {
      if (event.kind === 0 && event.pubkey) {
        const profileData = parseProfileData(event.content || '');
        if (profileData) {
          const cachedProfile: CachedProfile = {
            pubkey: event.pubkey,
            profile: profileData,
            lastUpdated: Date.now()
          };

          setProfiles(prev => {
            const newMap = new Map(prev);
            newMap.set(event.pubkey, cachedProfile);
            return newMap;
          });
          
          // Remove from pending and active batches
          setPendingPubkeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(event.pubkey);
            return newSet;
          });
          
          activeBatchesRef.current.delete(event.pubkey);
        }
      }
    });

    if (newSubscription) {
      setSubscription(newSubscription);
      // Mark these pubkeys as requested
      setRequestedPubkeys(prev => new Set([...prev, ...pubkeysBatch]));
      lastBatchTimeRef.current = Date.now();
      
      // Handle subscription end
      newSubscription.on('eose', () => {
        setIsLoading(false);
        console.log('Profile batch subscription completed');
      });

      // Timeout fallback
      setTimeout(() => {
        setIsLoading(false);
      }, 10000);
    }
  }, [isConnected, ndk, subscribe, subscription, parseProfileData]);

  // Smart batching for profile requests
  const scheduleBatchUpdate = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    const timeSinceLastBatch = Date.now() - lastBatchTimeRef.current;
    const delay = Math.max(0, MIN_BATCH_DELAY - timeSinceLastBatch);

    batchTimeoutRef.current = setTimeout(() => {
      const pendingArray = Array.from(pendingPubkeys);
      if (pendingArray.length === 0) return;

      // Process in chunks if batch is too large
      const batches = [];
      for (let i = 0; i < pendingArray.length; i += MAX_BATCH_SIZE) {
        batches.push(pendingArray.slice(i, i + MAX_BATCH_SIZE));
      }

      // Process first batch immediately, queue others
      if (batches.length > 0) {
        createBatchSubscription(batches[0]);
        
        // Queue remaining batches with staggered timing
        batches.slice(1).forEach((batch, index) => {
          setTimeout(() => {
            createBatchSubscription(batch);
          }, (index + 1) * MIN_BATCH_DELAY);
        });
      }
    }, delay);
  }, [pendingPubkeys, createBatchSubscription]);

  // Request profiles for new pubkeys with cache validation
  const requestProfiles = useCallback((pubkeys: string[]) => {
    const newPubkeys = pubkeys.filter(pubkey => {
      // Skip if already pending or in active batch
      if (pendingPubkeys.has(pubkey) || activeBatchesRef.current.has(pubkey)) {
        return false;
      }
      
      // Skip if recently requested
      if (requestedPubkeys.has(pubkey)) {
        return false;
      }
      
      // Check if cached profile is still valid
      const cached = profiles.get(pubkey);
      if (cached && isProfileCacheValid(cached)) {
        return false;
      }
      
      return true;
    });

    if (newPubkeys.length > 0) {
      console.log('Requesting profiles for new/expired pubkeys:', newPubkeys.length);
      setPendingPubkeys(prev => {
        const newSet = new Set(prev);
        newPubkeys.forEach(pubkey => {
          newSet.add(pubkey);
          activeBatchesRef.current.add(pubkey);
        });
        return newSet;
      });
    }
  }, [profiles, requestedPubkeys, pendingPubkeys, isProfileCacheValid]);

  // Effect to trigger batched subscription updates when pending pubkeys change
  useEffect(() => {
    if (pendingPubkeys.size > 0) {
      scheduleBatchUpdate();
    }
  }, [pendingPubkeys, scheduleBatchUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.stop();
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
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
    isLoading: isLoading || pendingPubkeys.size > 0
  };
};