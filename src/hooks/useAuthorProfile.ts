import { useEffect, useMemo, useRef } from 'react';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/hooks/useNostr';
import type { ProfileData } from '@/hooks/useProfiles';

const parseProfile = (content: string): ProfileData | null => {
  try {
    const parsed = JSON.parse(content);
    return {
      name: parsed.name,
      about: parsed.about,
      picture: parsed.picture,
      nip05: parsed.nip05,
    };
  } catch (err) {
    console.warn('Failed to parse profile data:', err);
    return null;
  }
};

export const useAuthorProfile = (pubkey: string | null | undefined): ProfileData | null => {
  const { ndk, isConnected, subscribe, profileEventsMap, recordProfileEvent } = useNostr();
  const subRef = useRef<NDKSubscription | null>(null);

  useEffect(() => {
    if (subRef.current) {
      subRef.current.stop();
      subRef.current = null;
    }

    if (!isConnected || !ndk || !pubkey) {
      return;
    }

    const sub = subscribe(
      { kinds: [0], authors: [pubkey], limit: 1 },
      (event: NDKEvent) => {
        if (event.pubkey !== pubkey) return;
        recordProfileEvent(event);
      }
    );

    if (sub) {
      subRef.current = sub;
    }

    return () => {
      if (subRef.current) {
        subRef.current.stop();
        subRef.current = null;
      }
    };
  }, [pubkey, isConnected, ndk, subscribe, recordProfileEvent]);

  return useMemo(() => {
    if (!pubkey) return null;
    const event = profileEventsMap.get(pubkey);
    if (!event?.content) return null;
    return parseProfile(event.content);
  }, [pubkey, profileEventsMap]);
};
