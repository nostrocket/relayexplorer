import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import type { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk';
import type { RelayMonitor } from '@/types/app';

export class RelayMonitorManager {
  private ndk: NDK;
  private monitors: Map<string, RelayMonitor> = new Map();
  private readonly MONITOR_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  constructor(ndk: NDK) {
    this.ndk = ndk;
  }

  async discoverMonitors(): Promise<RelayMonitor[]> {
    try {
      // Check if we have any connected relays
      const connectedRelays = Array.from(this.ndk.pool?.relays?.values() || [])
        .filter(relay => relay.status === 1); // 1 = connected
      
      if (connectedRelays.length === 0) {
        console.warn('No relays connected, cannot discover monitors');
        return Array.from(this.monitors.values()); // Return cached monitors if any
      }

      // Query for kind 10166 events (Monitor Info)
      const filter: NDKFilter = {
        kinds: [10166 as NDKKind],
        limit: 100,
        since: Math.floor((Date.now() - this.MONITOR_CACHE_DURATION) / 1000)
      };

      const events = await this.ndk.fetchEvents(filter);
      const newMonitors: RelayMonitor[] = [];

      for (const event of events) {
        const monitor = this.parseMonitorEvent(event);
        if (monitor) {
          this.monitors.set(monitor.pubkey, monitor);
          newMonitors.push(monitor);
        }
      }

      return Array.from(this.monitors.values());
    } catch (error) {
      console.warn('Failed to discover relay monitors:', error);
      return Array.from(this.monitors.values()); // Return cached monitors as fallback
    }
  }

  private parseMonitorEvent(event: NDKEvent): RelayMonitor | null {
    try {
      const frequency = this.extractTagValue(event, 'frequency');
      const timeout = this.extractTagValue(event, 'timeout');
      
      const monitor: RelayMonitor = {
        pubkey: event.pubkey,
        frequency: frequency ? parseInt(frequency) : undefined,
        timeout: timeout ? parseInt(timeout) : undefined,
        lastSeen: new Date(event.created_at! * 1000),
        reliability: this.calculateReliability(event.pubkey)
      };

      return monitor;
    } catch (error) {
      console.warn('Failed to parse monitor event:', error);
      return null;
    }
  }

  private extractTagValue(event: NDKEvent, tagName: string): string | null {
    const tag = event.tags.find(tag => tag[0] === tagName);
    return tag && tag[1] ? tag[1] : null;
  }

  private calculateReliability(pubkey: string): number {
    // Simple reliability calculation based on monitor activity
    // In a more sophisticated implementation, this would consider:
    // - Historical accuracy of reports
    // - Consistency of reporting
    // - Web of trust scores
    // - Community reputation
    
    const existingMonitor = this.monitors.get(pubkey);
    if (existingMonitor) {
      // Existing monitors start with higher reliability
      return Math.min(existingMonitor.reliability + 0.1, 1.0);
    }
    
    // New monitors start with baseline reliability
    return 0.5;
  }

  getTrustedMonitors(minReliability: number = 0.6): RelayMonitor[] {
    return Array.from(this.monitors.values())
      .filter(monitor => monitor.reliability >= minReliability)
      .sort((a, b) => b.reliability - a.reliability);
  }

  getMonitorPubkeys(): string[] {
    return Array.from(this.monitors.keys());
  }

  updateMonitorReliability(pubkey: string, delta: number): void {
    const monitor = this.monitors.get(pubkey);
    if (monitor) {
      monitor.reliability = Math.max(0, Math.min(1, monitor.reliability + delta));
    }
  }

  isMonitorTrusted(pubkey: string, minReliability: number = 0.6): boolean {
    const monitor = this.monitors.get(pubkey);
    return monitor ? monitor.reliability >= minReliability : false;
  }
}