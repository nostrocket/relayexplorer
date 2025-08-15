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