import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import type { NIP66Relay, RelayMetadata, RelayDiscoveryState, RelayMonitor } from '@/types/app';
import { RelayMonitorManager } from './relay-monitors';
import { popularRelays } from './relay-data';

// Bootstrap relays for NIP-66 discovery - well-known relays that likely have monitor data
const BOOTSTRAP_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
  'wss://relay.snort.social',
  'wss://offchain.pub'
];

export class NIP66RelayDiscovery {
  private discoveryNdk: NDK | null = null;
  private monitorManager: RelayMonitorManager | null = null;
  private relayCache: Map<string, NIP66Relay> = new Map();
  private readonly MAX_RELAY_AGE = 1000 * 60 * 60 * 24; // 24 hours
  private isInitialized = false;

  constructor() {
    // We'll create our own NDK instance for discovery
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing NIP-66 discovery with bootstrap relays:', BOOTSTRAP_RELAYS);
      
      // Create a dedicated NDK instance for relay discovery
      this.discoveryNdk = new NDK({
        explicitRelayUrls: BOOTSTRAP_RELAYS
      });

      // Start connecting to bootstrap relays (don't wait for all)
      this.discoveryNdk.connect(5000).catch(error => {
        console.warn('Some bootstrap relays failed to connect:', error);
      });
      
      this.monitorManager = new RelayMonitorManager(this.discoveryNdk);
      this.isInitialized = true;
      
      console.log('NIP-66 discovery initialized - will discover progressively');
    } catch (error) {
      console.error('Failed to initialize NIP-66 discovery:', error);
      // Continue without discovery - will fall back to hardcoded relays
    }
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
      // Initialize discovery if not already done
      await this.initialize();

      if (!this.discoveryNdk || !this.monitorManager) {
        console.warn('NIP-66 discovery not available, using hardcoded relays');
        state.loading = false;
        return state;
      }

      // Start progressive discovery
      this.startProgressiveDiscovery(state, onProgressUpdate);
      
    } catch (error) {
      console.error('Failed to start relay discovery:', error);
      state.error = error instanceof Error ? error.message : 'Unknown error';
      state.loading = false;
    }

    return state;
  }

  private async startProgressiveDiscovery(
    initialState: RelayDiscoveryState, 
    onProgressUpdate?: (state: RelayDiscoveryState) => void
  ): Promise<void> {
    if (!this.discoveryNdk || !this.monitorManager) return;

    const relayReports = new Map<string, NDKEvent[]>();
    const state = { ...initialState };

    try {
      // First, quickly discover available monitors
      console.log('Discovering relay monitors...');
      state.monitors = await this.monitorManager.discoverMonitors();
      console.log(`Found ${state.monitors.length} relay monitors`);

      // Get trusted monitors for filtering
      const trustedMonitors = this.monitorManager.getTrustedMonitors();
      const monitorPubkeys = trustedMonitors.length > 0 ? trustedMonitors.map(m => m.pubkey) : undefined;

      console.log(`Starting progressive discovery${monitorPubkeys ? ` from ${monitorPubkeys.length} trusted monitors` : ' from any monitors'}`);
      
      // Create filter for relay discovery events
      const filter: NDKFilter = {
        kinds: [30166] as any,
        ...(monitorPubkeys && { authors: monitorPubkeys }),
        since: Math.floor((Date.now() - this.MAX_RELAY_AGE) / 1000)
      };

      // Use subscription for progressive updates
      const subscription = this.discoveryNdk.subscribe(filter);
      let eventCount = 0;
      let lastUpdate = Date.now();

      subscription.on('event', async (event: NDKEvent) => {
        eventCount++;
        const relayUrl = this.extractRelayUrl(event);
        
        if (relayUrl && this.isValidRelayUrl(relayUrl)) {
          if (!relayReports.has(relayUrl)) {
            relayReports.set(relayUrl, []);
          }
          relayReports.get(relayUrl)!.push(event);

          // Update UI every 5 events or every 2 seconds, whichever comes first
          const now = Date.now();
          if (eventCount % 5 === 0 || (now - lastUpdate) > 2000) {
            await this.updateDiscoveredRelays(relayReports, state, onProgressUpdate);
            lastUpdate = now;
          }
        }
      });

      subscription.on('eose', async () => {
        console.log(`Progressive discovery complete. Found ${eventCount} relay events.`);
        await this.updateDiscoveredRelays(relayReports, state, onProgressUpdate);
        
        state.loading = false;
        state.lastUpdated = new Date();
        
        if (onProgressUpdate) {
          onProgressUpdate({ ...state });
        }
        
        subscription.stop();
      });

      // Set a timeout to stop loading state even if we don't get EOSE
      setTimeout(() => {
        if (state.loading) {
          console.log('Discovery timeout reached, showing current results');
          state.loading = false;
          if (onProgressUpdate) {
            onProgressUpdate({ ...state });
          }
          subscription.stop();
        }
      }, 15000); // 15 second timeout

    } catch (error) {
      console.error('Progressive discovery failed:', error);
      state.error = error instanceof Error ? error.message : 'Discovery failed';
      state.loading = false;
      if (onProgressUpdate) {
        onProgressUpdate({ ...state });
      }
    }
  }

  private async updateDiscoveredRelays(
    relayReports: Map<string, NDKEvent[]>,
    state: RelayDiscoveryState,
    onProgressUpdate?: (state: RelayDiscoveryState) => void
  ): Promise<void> {
    const discoveredRelays: NIP66Relay[] = [];
    
    // Keep hardcoded relays and add discovered ones
    const hardcodedRelays = this.convertPopularRelaysToNIP66();
    const hardcodedUrls = new Set(hardcodedRelays.map(r => r.url));
    
    // Process discovered relays
    for (const [relayUrl, reports] of relayReports) {
      if (!hardcodedUrls.has(relayUrl)) { // Don't duplicate hardcoded relays
        const relay = await this.aggregateRelayReports(relayUrl, reports);
        if (relay && relay.confidence > 0.2) { // Lower threshold for progressive discovery
          discoveredRelays.push(relay);
          this.relayCache.set(relayUrl, relay);
        }
      }
    }

    // Sort discovered relays by confidence
    discoveredRelays.sort((a, b) => b.confidence - a.confidence);

    // Combine hardcoded (high priority) with discovered relays
    state.relays = [...hardcodedRelays, ...discoveredRelays];
    state.lastUpdated = new Date();

    if (onProgressUpdate) {
      onProgressUpdate({ ...state });
    }

    console.log(`Updated relay list: ${state.relays.length} total (${discoveredRelays.length} discovered)`);
  }

  private async aggregateRelayReports(relayUrl: string, reports: NDKEvent[]): Promise<NIP66Relay | null> {
    if (reports.length === 0) return null;

    // Sort reports by recency
    const sortedReports = reports.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    const latestReport = sortedReports[0];
    
    // Calculate status based on recent reports
    const recentReports = sortedReports.filter(r => 
      (Date.now() / 1000) - (r.created_at || 0) < 24 * 60 * 60 // Last 24 hours
    );
    
    const onlineReports = recentReports.length;
    const totalMonitors = new Set(reports.map(r => r.pubkey)).size;
    
    // Calculate confidence based on monitor consensus
    const confidence = totalMonitors > 0 ? onlineReports / Math.max(totalMonitors, 3) : 0;
    
    // Parse relay metadata from latest report
    let metadata: RelayMetadata | undefined;
    try {
      if (latestReport.content) {
        const parsed = JSON.parse(latestReport.content);
        if (parsed && typeof parsed === 'object') {
          metadata = parsed as RelayMetadata;
        }
      }
    } catch (error) {
      console.warn(`Failed to parse metadata for ${relayUrl}:`, error);
    }

    // Get monitor information
    const monitors: RelayMonitor[] = [];
    const uniquePubkeys = new Set(reports.map(r => r.pubkey));
    
    for (const pubkey of uniquePubkeys) {
      const monitorReports = reports.filter(r => r.pubkey === pubkey);
      const lastReport = monitorReports[0];
      
      monitors.push({
        pubkey,
        lastSeen: new Date((lastReport.created_at || 0) * 1000),
        reliability: this.monitorManager?.isMonitorTrusted(pubkey) ? 0.8 : 0.5,
        frequency: undefined,
        timeout: undefined
      });
    }

    const relay: NIP66Relay = {
      url: relayUrl,
      name: metadata?.name,
      description: metadata?.description,
      status: confidence > 0.5 ? 'online' : (confidence > 0.2 ? 'unknown' : 'offline'),
      lastChecked: new Date((latestReport.created_at || 0) * 1000),
      nips: metadata?.supported_nips,
      monitors,
      confidence,
      metadata,
      geographic: undefined // Could be extracted from monitor data or NIP-11
    };

    return relay;
  }

  private extractRelayUrl(event: NDKEvent): string | null {
    // NIP-66: relay URL should be in 'd' tag
    const dTag = event.tags.find(tag => tag[0] === 'd');
    return dTag && dTag[1] ? dTag[1] : null;
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
      confidence: 0.5, // Moderate confidence for hardcoded relays
      metadata: undefined,
      geographic: undefined
    }));
  }

  getCachedRelays(): NIP66Relay[] {
    return Array.from(this.relayCache.values());
  }

  clearCache(): void {
    this.relayCache.clear();
  }
}