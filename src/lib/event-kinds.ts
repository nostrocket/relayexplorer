export interface EventKind {
  kind: number;
  label: string;
  description: string;
  category: string;
  nip?: string;
  deprecated?: boolean;
}

export const eventKinds: EventKind[] = [
  // Core Event Kinds (0-99)
  { kind: 0, label: "User Metadata", description: "Profile info", category: "Core" },
  { kind: 1, label: "Short Text Note", description: "Text post", category: "Core" },
  { kind: 2, label: "Recommend Relay", description: "Relay recommendation", category: "Core", deprecated: true },
  { kind: 3, label: "Follows", description: "Contact list", category: "Core" },
  { kind: 4, label: "Encrypted Direct Messages", description: "Private message", category: "Core" },
  { kind: 5, label: "Event Deletion Request", description: "Delete event", category: "Core" },
  { kind: 6, label: "Repost", description: "Share note", category: "Core" },
  { kind: 7, label: "Reaction", description: "Like/react", category: "Core" },
  { kind: 8, label: "Badge Award", description: "Badge given", category: "Core" },
  { kind: 9, label: "Chat Message", description: "Chat message", category: "Core" },
  { kind: 10, label: "Group Chat Threaded Reply", description: "Group reply", category: "Core", deprecated: true },
  { kind: 11, label: "Thread", description: "Thread event", category: "Core" },
  { kind: 12, label: "Group Thread Reply", description: "Group thread", category: "Core", deprecated: true },
  { kind: 13, label: "Seal", description: "Message seal", category: "Core" },
  { kind: 14, label: "Direct Message", description: "Direct message", category: "Core" },
  { kind: 15, label: "File Message", description: "File share", category: "Core" },
  { kind: 16, label: "Generic Repost", description: "Generic repost", category: "Core" },
  { kind: 17, label: "Reaction to a website", description: "Website reaction", category: "Core" },
  
  // Media Event Kinds (20-29)
  { kind: 20, label: "Picture", description: "Image post", category: "Media" },
  { kind: 21, label: "Video Event", description: "Video content", category: "Media" },
  { kind: 22, label: "Short-form Portrait Video Event", description: "Short video", category: "Media" },
  
  // Reference Event Kinds (30-39)
  { kind: 30, label: "Internal reference", description: "Internal ref", category: "Reference" },
  { kind: 31, label: "External web reference", description: "Web ref", category: "Reference" },
  { kind: 32, label: "Hardcopy reference", description: "Print ref", category: "Reference" },
  { kind: 33, label: "Prompt reference", description: "Prompt ref", category: "Reference" },
  
  // Channel Event Kinds (40-49)
  { kind: 40, label: "Channel Creation", description: "Create channel", category: "Channel" },
  { kind: 41, label: "Channel Metadata", description: "Channel info", category: "Channel" },
  { kind: 42, label: "Channel Message", description: "Channel message", category: "Channel" },
  { kind: 43, label: "Channel Hide Message", description: "Hide message", category: "Channel" },
  { kind: 44, label: "Channel Mute User", description: "Mute user", category: "Channel" },
  
  // Miscellaneous (50-99)
  { kind: 62, label: "Request to Vanish", description: "Delete request", category: "Misc" },
  { kind: 64, label: "Chess (PGN)", description: "Chess game", category: "Misc" },
  
  // Application-specific (800-1999)
  { kind: 818, label: "Merge Requests", description: "Git merge", category: "Development" },
  { kind: 1018, label: "Poll Response", description: "Poll answer", category: "Interactive" },
  { kind: 1021, label: "Bid", description: "Marketplace bid", category: "Commerce" },
  { kind: 1022, label: "Bid confirmation", description: "Bid confirm", category: "Commerce" },
  { kind: 1040, label: "OpenTimestamps", description: "Timestamp proof", category: "Misc" },
  { kind: 1059, label: "Gift Wrap", description: "Message wrapper", category: "Core" },
  { kind: 1063, label: "File Metadata", description: "File info", category: "Media" },
  { kind: 1068, label: "Poll", description: "Poll question", category: "Interactive" },
  { kind: 1111, label: "Comment", description: "Comment", category: "Core" },
  { kind: 1222, label: "Voice Message", description: "Voice note", category: "Media" },
  { kind: 1244, label: "Voice Message Comment", description: "Voice comment", category: "Media" },
  { kind: 1311, label: "Live Chat Message", description: "Live chat", category: "Interactive" },
  { kind: 1337, label: "Code Snippet", description: "Code block", category: "Development" },
  { kind: 1617, label: "Patches", description: "Git patch", category: "Development" },
  { kind: 1621, label: "Issues", description: "Bug report", category: "Development" },
  { kind: 1622, label: "Git Replies", description: "Git comment", category: "Development", deprecated: true },
  { kind: 1971, label: "Problem Tracker", description: "Issue tracker", category: "Development" },
  { kind: 1984, label: "Reporting", description: "Report content", category: "Moderation" },
  { kind: 1985, label: "Label", description: "Content label", category: "Moderation" },
  { kind: 1986, label: "Relay reviews", description: "Relay review", category: "Network" },
  { kind: 1987, label: "AI Embeddings / Vector lists", description: "AI vectors", category: "AI" },
  
  // Social (2000-2999)
  { kind: 2003, label: "Torrent", description: "Torrent link", category: "Media" },
  { kind: 2004, label: "Torrent Comment", description: "Torrent comment", category: "Media" },
  { kind: 2022, label: "Coinjoin Pool", description: "Privacy pool", category: "Bitcoin" },
  
  // Community (4000-4999)
  { kind: 4550, label: "Community Post Approval", description: "Post approval", category: "Community" },
  
  // Jobs (5000-7999)
  { kind: 7000, label: "Job Feedback", description: "Job feedback", category: "Jobs" },
  { kind: 7374, label: "Reserved Cashu Wallet Tokens", description: "Cashu reserved", category: "Bitcoin" },
  { kind: 7375, label: "Cashu Wallet Tokens", description: "Cashu tokens", category: "Bitcoin" },
  { kind: 7376, label: "Cashu Wallet History", description: "Cashu history", category: "Bitcoin" },
  { kind: 7516, label: "Geocache log", description: "Geocache log", category: "Location" },
  { kind: 7517, label: "Geocache proof of find", description: "Geocache proof", category: "Location" },
  
  // Group Control (9000-9999)
  { kind: 9041, label: "Zap Goal", description: "Fundraising goal", category: "Bitcoin" },
  { kind: 9321, label: "Nutzap", description: "Cashu zap", category: "Bitcoin" },
  { kind: 9467, label: "Tidal login", description: "Tidal auth", category: "Auth" },
  { kind: 9734, label: "Zap Request", description: "Payment request", category: "Bitcoin" },
  { kind: 9735, label: "Zap", description: "Lightning payment", category: "Bitcoin" },
  { kind: 9802, label: "Highlights", description: "Text highlight", category: "Content" },
  
  // Lists (10000-10999)
  { kind: 10000, label: "Mute list", description: "Blocked users", category: "Lists" },
  { kind: 10001, label: "Pin list", description: "Pinned content", category: "Lists" },
  { kind: 10002, label: "Relay List Metadata", description: "Relay preferences", category: "Lists" },
  { kind: 10003, label: "Bookmark list", description: "Saved posts", category: "Lists" },
  { kind: 10004, label: "Communities list", description: "Joined communities", category: "Lists" },
  { kind: 10005, label: "Public chats list", description: "Chat rooms", category: "Lists" },
  { kind: 10006, label: "Blocked relays list", description: "Blocked relays", category: "Lists" },
  { kind: 10007, label: "Search relays list", description: "Search relays", category: "Lists" },
  { kind: 10009, label: "User groups", description: "Group membership", category: "Lists" },
  { kind: 10012, label: "Favorite relays list", description: "Favorite relays", category: "Lists" },
  { kind: 10013, label: "Private event relay list", description: "Private relays", category: "Lists" },
  { kind: 10015, label: "Interests list", description: "Interest topics", category: "Lists" },
  { kind: 10019, label: "Nutzap Mint Recommendation", description: "Cashu mint list", category: "Lists" },
  { kind: 10020, label: "Media follows", description: "Media follows", category: "Lists" },
  { kind: 10030, label: "User emoji list", description: "Custom emojis", category: "Lists" },
  { kind: 10050, label: "Relay list to receive DMs", description: "DM relay list", category: "Lists" },
  { kind: 10063, label: "User server list", description: "Server list", category: "Lists" },
  { kind: 10096, label: "File storage server list", description: "File servers", category: "Lists" },
  { kind: 10166, label: "Relay Monitor Announcement", description: "Relay monitor", category: "Network" },
  { kind: 10312, label: "Room Presence", description: "Room status", category: "Interactive" },
  
  // Wallet (13000-13999)
  { kind: 13194, label: "Wallet Info", description: "Wallet details", category: "Bitcoin" },
  { kind: 17375, label: "Cashu Wallet Event", description: "Cashu wallet", category: "Bitcoin" },
  
  // Services (20000-29999)
  { kind: 21000, label: "Lightning Pub RPC", description: "Lightning RPC", category: "Bitcoin" },
  { kind: 22242, label: "Client Authentication", description: "Client auth", category: "Auth" },
  { kind: 23194, label: "Wallet Request", description: "Wallet request", category: "Bitcoin" },
  { kind: 23195, label: "Wallet Response", description: "Wallet response", category: "Bitcoin" },
  { kind: 24133, label: "Nostr Connect", description: "Remote signing", category: "Auth" },
  { kind: 24242, label: "Blobs stored on mediaservers", description: "Media storage", category: "Media" },
  { kind: 27235, label: "HTTP Auth", description: "HTTP auth", category: "Auth" },
  
  // Addressable Events (30000-39999)
  { kind: 30000, label: "Follow sets", description: "Follow groups", category: "Sets" },
  { kind: 30001, label: "Generic lists", description: "Generic lists", category: "Sets", deprecated: true },
  { kind: 30002, label: "Relay sets", description: "Relay groups", category: "Sets" },
  { kind: 30003, label: "Bookmark sets", description: "Bookmark groups", category: "Sets" },
  { kind: 30004, label: "Curation sets", description: "Content curation", category: "Sets" },
  { kind: 30005, label: "Video sets", description: "Video playlists", category: "Sets" },
  { kind: 30007, label: "Kind mute sets", description: "Muted event types", category: "Sets" },
  { kind: 30008, label: "Profile Badges", description: "User badges", category: "Profile" },
  { kind: 30009, label: "Badge Definition", description: "Badge template", category: "Profile" },
  { kind: 30015, label: "Interest sets", description: "Interest groups", category: "Sets" },
  { kind: 30017, label: "Create or update a stall", description: "Marketplace stall", category: "Commerce" },
  { kind: 30018, label: "Create or update a product", description: "Product listing", category: "Commerce" },
  { kind: 30019, label: "Marketplace UI/UX", description: "Market UI", category: "Commerce" },
  { kind: 30020, label: "Product sold as an auction", description: "Auction item", category: "Commerce" },
  { kind: 30023, label: "Long-form Content", description: "Article/blog", category: "Content" },
  { kind: 30024, label: "Draft Long-form Content", description: "Draft article", category: "Content" },
  { kind: 30030, label: "Emoji sets", description: "Emoji collections", category: "Sets" },
  { kind: 30040, label: "Curated Publication Index", description: "Publication index", category: "Content" },
  { kind: 30041, label: "Curated Publication Content", description: "Publication content", category: "Content" },
  { kind: 30063, label: "Release artifact sets", description: "Software releases", category: "Development" },
  { kind: 30078, label: "Application-specific Data", description: "App data", category: "Data" },
  { kind: 30166, label: "Relay Discovery", description: "Relay discovery", category: "Network" },
  { kind: 30267, label: "App curation sets", description: "App collections", category: "Sets" },
  { kind: 30311, label: "Live Event", description: "Live stream", category: "Interactive" },
  { kind: 30312, label: "Namespaced group", description: "Group namespace", category: "Community" },
  { kind: 30315, label: "User Status", description: "Status update", category: "Profile" },
  { kind: 30818, label: "Wiki articles", description: "Wiki content", category: "Content" },
  { kind: 31922, label: "Date-Based Calendar Event", description: "Calendar event", category: "Calendar" },
  { kind: 31923, label: "Time-Based Calendar Event", description: "Timed event", category: "Calendar" },
  { kind: 31924, label: "Calendar", description: "Calendar", category: "Calendar" },
  { kind: 31925, label: "Calendar Event RSVP", description: "Event RSVP", category: "Calendar" },
  { kind: 31989, label: "Handler recommendation", description: "Handler rec", category: "Network" },
  { kind: 31990, label: "Handler information", description: "Handler info", category: "Network" },
  { kind: 34235, label: "Video", description: "Video content", category: "Media" },
  { kind: 34236, label: "Short-form Portrait Video", description: "Portrait video", category: "Media" },
  { kind: 34550, label: "Community Definition", description: "Community info", category: "Community" },
  
  // P2P (38000-38999)
  { kind: 38383, label: "Peer-to-peer order events", description: "P2P trading", category: "Commerce" },
  
  // Groups (39000-39999)
  { kind: 39000, label: "Group Metadata", description: "Group info", category: "Community" },
  { kind: 39001, label: "Group Admins", description: "Group admins", category: "Community" },
  { kind: 39002, label: "Group Members", description: "Group members", category: "Community" },
  { kind: 39003, label: "Group Threads", description: "Group threads", category: "Community" },
];

// Job Request Kinds (5000-5999)
for (let i = 5000; i <= 5999; i++) {
  eventKinds.push({
    kind: i,
    label: `Job Request ${i}`,
    description: "Job request",
    category: "Jobs"
  });
}

// Job Result Kinds (6000-6999)
for (let i = 6000; i <= 6999; i++) {
  eventKinds.push({
    kind: i,
    label: `Job Result ${i}`,
    description: "Job result",
    category: "Jobs"
  });
}

// Group Control Events (9000-9030)
for (let i = 9000; i <= 9030; i++) {
  eventKinds.push({
    kind: i,
    label: `Group Control ${i}`,
    description: "Group control",
    category: "Community"
  });
}

// Status Events (1630-1633)
for (let i = 1630; i <= 1633; i++) {
  eventKinds.push({
    kind: i,
    label: `Status ${i}`,
    description: "Git status",
    category: "Development"
  });
}

export const categories = [
  "Core",
  "Media", 
  "Channel",
  "Interactive",
  "Lists",
  "Sets",
  "Commerce",
  "Bitcoin",
  "Development",
  "Community",
  "Content",
  "Network",
  "Auth",
  "Jobs",
  "Calendar",
  "Profile",
  "Reference",
  "Moderation",
  "Location",
  "AI",
  "Data",
  "Misc"
];

export const popularKinds = [0, 1, 3, 4, 6, 7, 1111, 9735, 30023, 10002];