import { useState, useCallback } from 'react';
import type { RelayMetadata } from '@/types/app';

export const useRelay = () => {
  const [relayInfo, setRelayInfo] = useState<RelayMetadata | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const fetchRelayInfo = useCallback(async (relayUrl: string): Promise<RelayMetadata | null> => {
    setInfoLoading(true);
    setInfoError(null);

    try {
      // Convert ws:// to http:// or wss:// to https://
      const httpUrl = relayUrl
        .replace('wss://', 'https://')
        .replace('ws://', 'http://');

      const response = await fetch(httpUrl, {
        headers: {
          'Accept': 'application/nostr+json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const info = await response.json();
      setRelayInfo(info);
      return info;
    } catch (error) {
      console.warn('Failed to fetch relay info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not fetch relay information';
      setInfoError(errorMessage);
      return null;
    } finally {
      setInfoLoading(false);
    }
  }, []);

  const validateRelayUrl = useCallback((url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }, []);

  return {
    relayInfo,
    infoLoading,
    infoError,
    fetchRelayInfo,
    validateRelayUrl
  };
};