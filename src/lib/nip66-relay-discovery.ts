import NDK, { NDKEvent, NDKRelayStatus } from '@nostr-dev-kit/ndk';
import type { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk';
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
  'wss://offchain.pub',
  'wss://nostr.bitcoiner.social',
  'wss://relay.nostr.net',
  'wss://purplepag.es'
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

      // Start connecting to bootstrap relays - continue regardless of failures
      console.log(`Connecting to ${BOOTSTRAP_RELAYS.length} bootstrap relays...`);
      
      // Start connection process but don't fail if some relays don't connect
      this.discoveryNdk.connect(8000).catch(error => {
        console.warn('Some bootstrap relays failed to connect:', error);
      });
      
      // Wait a reasonable time for connections to establish
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Check how many relays connected
      const connectedRelays = Array.from(this.discoveryNdk.pool?.relays?.values() || [])
        .filter(relay => relay.status === NDKRelayStatus.CONNECTED);
      
      console.log(`Connected to ${connectedRelays.length}/${BOOTSTRAP_RELAYS.length} bootstrap relays`);
      
      // Continue regardless of how many connected (even if zero)
      // The discovery methods will handle the case of no connections gracefully
      
      this.monitorManager = new RelayMonitorManager(this.discoveryNdk);
      this.isInitialized = true;
      
      console.log('NIP-66 discovery initialized - will discover progressively');
    } catch (error) {
      console.warn('NIP-66 discovery initialization encountered issues:', error);
      console.log('Continuing with hardcoded relays only');
      // Don't null out the instances - let them continue working with whatever they have
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
      console.warn('Relay discovery encountered issues, continuing with hardcoded relays:', error);
      // Don't set error state - this is expected behavior when relays are unavailable
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
        kinds: [30166 as NDKKind],
        ...(monitorPubkeys && { authors: monitorPubkeys }),
        since: Math.floor((Date.now() - this.MAX_RELAY_AGE) / 1000)
      };

      // Check connected relays before starting subscription
      const connectedRelays = Array.from(this.discoveryNdk.pool?.relays?.values() || [])
        .filter(relay => relay.status === NDKRelayStatus.CONNECTED);
      
      if (connectedRelays.length === 0) {
        console.warn('No relays connected yet; subscribing and waiting for connections...');
        // Do NOT return; proceed to subscribe so we receive events as soon as relays connect
      } else {
        console.log(`Starting subscription with ${connectedRelays.length} connected relays`);
      }

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

      // Handle subscription close/errors via the close event
      subscription.on('close', () => {
        if (state.loading) {
          console.warn('Subscription closed unexpectedly during discovery');
          state.loading = false;
          if (onProgressUpdate) {
            onProgressUpdate({ ...state });
          }
        }
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
      console.warn('Progressive discovery encountered issues, using available data:', error);
      // Don't set error state - we still have hardcoded relays available
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