import type { NIP66Relay, RelayDiscoveryState } from '@/types/app';
import { popularRelays } from './relay-data';

export class NostrWatchRelayDiscovery {
  private relayCache: Map<string, NIP66Relay> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
  private lastFetchTime = 0;

  constructor() {
    // Simple constructor - no complex initialization needed
  }

  async discoverRelays(onProgressUpdate?: (state: RelayDiscoveryState) => void): Promise<RelayDiscoveryState> {
    const state: RelayDiscoveryState = {
      relays: this.convertPopularRelaysToNIP66(), // Start with hardcoded relays immediately
      monitors: [],
      loading: true,
      error: null,
      lastUpdated: new Date()
    };

    // Immediately return hardcoded relays to show something
    if (onProgressUpdate) {
      onProgressUpdate({ ...state });
    }

    try {
      // Check if we can use cached data
      const now = Date.now();
      if (this.relayCache.size > 0 && (now - this.lastFetchTime) < this.CACHE_DURATION) {
        state.relays = this.mergeCachedRelays();
        state.loading = false;
        state.lastUpdated = new Date(this.lastFetchTime);
        
        if (onProgressUpdate) {
          onProgressUpdate({ ...state });
        }
        return state;
      }

      // Fetch fresh data from nostr.watch
      const response = await fetch('https://api.nostr.watch/v1/online', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`nostr.watch API error: ${response.status} ${response.statusText}`);
      }

      const relayUrls: string[] = await response.json();

      // Process and cache the relay data
      this.processRelayUrls(relayUrls);
      this.lastFetchTime = now;

      // Merge with hardcoded relays
      state.relays = this.mergeCachedRelays();
      state.loading = false;
      state.lastUpdated = new Date();

      if (onProgressUpdate) {
        onProgressUpdate({ ...state });
      }


    } catch (error) {
      console.warn('Failed to fetch from nostr.watch, using hardcoded relays:', error);
      // Don't set error state - graceful degradation to hardcoded relays
      state.loading = false;
      
      if (onProgressUpdate) {
        onProgressUpdate({ ...state });
      }
    }

    return state;
  }

  private processRelayUrls(relayUrls: string[]): void {
    this.relayCache.clear();

    for (const url of relayUrls) {
      if (this.isValidRelayUrl(url)) {
        const relay = this.createNIP66RelayFromUrl(url);
        this.relayCache.set(url, relay);
      }
    }

  }

  private createNIP66RelayFromUrl(url: string): NIP66Relay {
    // Extract a clean name from the URL
    const name = this.extractRelayName(url);
    
    return {
      url,
      name,
      description: `Online relay from nostr.watch`,
      status: 'online', // All relays from /v1/online endpoint are considered online
      lastChecked: new Date(),
      monitors: [], // nostr.watch doesn't provide monitor info
      confidence: 0.8, // High confidence since it's from nostr.watch online list
      metadata: undefined,
      geographic: undefined
    };
  }

  private extractRelayName(url: string): string {
    try {
      const parsed = new URL(url);
      let hostname = parsed.hostname;
      
      // Remove common prefixes
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      
      // Remove common relay subdomains to get cleaner names
      if (hostname.startsWith('relay.')) {
        hostname = hostname.substring(6);
      }
      
      // Capitalize first letter for display
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch {
      // Fallback if URL parsing fails
      return url.replace(/^wss?:\/\//, '').replace(/\/$/, '');
    }
  }

  private isValidRelayUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  private convertPopularRelaysToNIP66(): NIP66Relay[] {
    return popularRelays.map(relay => ({
      url: relay.value,
      name: relay.label,
      description: relay.description,
      status: 'unknown' as const,
      lastChecked: new Date(),
      monitors: [],
      confidence: 0.9, // High confidence for curated hardcoded relays
      metadata: undefined,
      geographic: undefined
    }));
  }

  private mergeCachedRelays(): NIP66Relay[] {
    const hardcodedRelays = this.convertPopularRelaysToNIP66();
    const hardcodedUrls = new Set(hardcodedRelays.map(r => r.url));
    
    // Get discovered relays that aren't already in hardcoded list
    const discoveredRelays = Array.from(this.relayCache.values())
      .filter(relay => !hardcodedUrls.has(relay.url))
      .sort((a, b) => b.confidence - a.confidence);

    // Return hardcoded relays first (high priority), then discovered
    return [...hardcodedRelays, ...discoveredRelays];
  }

  getCachedRelays(): NIP66Relay[] {
    return Array.from(this.relayCache.values());
  }

  clearCache(): void {
    this.relayCache.clear();
    this.lastFetchTime = 0;
  }
}