export interface RelayInfo {
  value: string;
  label: string;
  description?: string;
}

export const popularRelays: RelayInfo[] = [
  {
    value: "wss://relay.damus.io",
    label: "Damus Relay",
    description: "Popular general-purpose relay"
  },
  {
    value: "wss://nos.lol",
    label: "nos.lol",
    description: "High-performance relay"
  },
  {
    value: "wss://relay.primal.net",
    label: "Primal",
    description: "Primal's relay service"
  },
  {
    value: "wss://nostr.mom",
    label: "nostr.mom",
    description: "Community relay"
  },
  {
    value: "wss://relay.snort.social",
    label: "Snort Social",
    description: "Snort client relay"
  },
  {
    value: "wss://offchain.pub",
    label: "Offchain Pub",
    description: "Bitcoin-focused relay"
  },
  {
    value: "wss://nostr.bitcoiner.social",
    label: "Bitcoiner Social",
    description: "Bitcoin community relay"
  },
  {
    value: "wss://nostr.oxtr.dev",
    label: "OXTR Dev",
    description: "Development-focused relay"
  },
  {
    value: "wss://relay.nostr.net",
    label: "nostr.net",
    description: "General-purpose relay"
  },
  {
    value: "wss://purplepag.es",
    label: "Purple Pages",
    description: "Community relay"
  }
];