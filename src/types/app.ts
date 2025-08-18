export interface EventFilter {
  kinds?: number[];
  authors?: string[];
  search?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface RelayConnection {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  metadata?: RelayMetadata;
}

export interface RelayMetadata {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: {
    max_message_length?: number;
    max_subscriptions?: number;
    max_filters?: number;
    max_limit?: number;
    max_subid_length?: number;
    min_prefix?: number;
    max_event_tags?: number;
    max_content_length?: number;
    payment_required?: boolean;
  };
}

export interface RelayMonitor {
  pubkey: string;
  frequency?: number;
  timeout?: number;
  lastSeen: Date;
  reliability: number; // 0-1 score based on consistency
}

export interface NIP66Relay {
  url: string;
  name?: string;
  description?: string;
  status: 'online' | 'offline' | 'unknown';
  lastChecked: Date;
  nips?: number[];
  monitors: RelayMonitor[];
  confidence: number; // 0-1 based on monitor consensus
  metadata?: RelayMetadata;
  geographic?: {
    country?: string;
    city?: string;
  };
}

export interface RelayDiscoveryState {
  relays: NIP66Relay[];
  monitors: RelayMonitor[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}