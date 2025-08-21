import { useState, useEffect, useCallback } from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';

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


export const useProfiles = (profileEventsMap: Map<string, NDKEvent>) => {
  const [profiles, setProfiles] = useState<Map<string, CachedProfile>>(new Map());
  
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

  // Process profile events from the provided Map
  useEffect(() => {
    const newProfiles = new Map<string, CachedProfile>();
    
    profileEventsMap.forEach((event) => {
      if (event.kind === 0 && event.content && event.pubkey) {
        const profileData = parseProfileData(event.content);
        if (profileData) {
          const cachedProfile: CachedProfile = {
            pubkey: event.pubkey,
            profile: profileData,
            lastUpdated: (event.created_at || 0) * 1000 // Convert to milliseconds
          };
          newProfiles.set(event.pubkey, cachedProfile);
        }
      }
    });
    
    setProfiles(newProfiles);
  }, [profileEventsMap, parseProfileData]);


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
    getProfile,
    getDisplayName,
    getAvatarUrl
  };
};