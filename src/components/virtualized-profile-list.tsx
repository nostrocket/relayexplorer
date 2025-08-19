import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

interface AuthorInfo {
  pubkey: string;
  displayName: string;
  shortPubkey: string;
  avatarUrl?: string;
  hasProfile: boolean;
}

interface VirtualizedProfileListProps {
  profiles: AuthorInfo[];
  activePubkey: string | null;
  onProfileSelect: (pubkey: string | null) => void;
  height: number;
  showAllProfilesButton?: boolean;
}

const ITEM_HEIGHT = 52; // Height of each profile item

interface ProfileItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    profiles: AuthorInfo[];
    activePubkey: string | null;
    onProfileSelect: (pubkey: string | null) => void;
    showAllProfilesButton: boolean;
  };
}

const ProfileItem = memo(({ index, style, data }: ProfileItemProps) => {
  const { profiles, activePubkey, onProfileSelect, showAllProfilesButton } = data;
  
  // Handle "All Profiles" button as first item
  if (showAllProfilesButton && index === 0) {
    return (
      <div style={style}>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={{
              children: "Show events from all profiles",
              hidden: false,
            }}
            onClick={() => onProfileSelect(null)}
            isActive={activePubkey === null}
            className="px-2.5 md:px-2 flex items-center gap-2 font-medium min-h-[44px]"
          >
            <div className="h-6 w-6 bg-primary text-primary-foreground rounded flex items-center justify-center text-xs font-bold">
              ALL
            </div>
            <span className="truncate">All Profiles</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </div>
    );
  }

  // Adjust index for profiles array if "All Profiles" button is shown
  const profileIndex = showAllProfilesButton ? index - 1 : index;
  const authorInfo = profiles[profileIndex];

  if (!authorInfo) return null;

  return (
    <div style={style}>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={{
            children: authorInfo.displayName,
            hidden: false,
          }}
          onClick={() => onProfileSelect(authorInfo.pubkey)}
          isActive={activePubkey === authorInfo.pubkey}
          className="px-2.5 md:px-2 flex items-center gap-2 min-h-[44px]"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage 
              src={authorInfo.avatarUrl || `https://robohash.org/${authorInfo.pubkey}`} 
            />
            <AvatarFallback className="text-xs">
              {authorInfo.pubkey.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{authorInfo.displayName}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </div>
  );
});

ProfileItem.displayName = 'ProfileItem';

export const VirtualizedProfileList = memo(({ 
  profiles, 
  activePubkey, 
  onProfileSelect, 
  height,
  showAllProfilesButton = true
}: VirtualizedProfileListProps) => {
  const itemData = useCallback(() => ({
    profiles,
    activePubkey,
    onProfileSelect,
    showAllProfilesButton
  }), [profiles, activePubkey, onProfileSelect, showAllProfilesButton]);

  const itemCount = showAllProfilesButton ? profiles.length + 1 : profiles.length;

  if (profiles.length === 0 && !showAllProfilesButton) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No profiles found
      </div>
    );
  }

  return (
    <List
      height={height}
      width="100%"
      itemCount={itemCount}
      itemSize={ITEM_HEIGHT}
      itemData={itemData()}
      className="scrollbar-hide"
    >
      {ProfileItem}
    </List>
  );
});

VirtualizedProfileList.displayName = 'VirtualizedProfileList';