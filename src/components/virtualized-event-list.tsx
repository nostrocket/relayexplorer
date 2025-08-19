import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { getRelativeTime } from '@/lib/utils';

interface VirtualizedEventListProps {
  events: NDKEvent[];
  selectedEventId?: string;
  onEventSelect: (event: NDKEvent) => void;
  height: number;
}

const ITEM_HEIGHT = 80; // Height of each event item

interface EventItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    events: NDKEvent[];
    selectedEventId?: string;
    onEventSelect: (event: NDKEvent) => void;
  };
}

const EventItem = memo(({ index, style, data }: EventItemProps) => {
  const { events, selectedEventId, onEventSelect } = data;
  const event = events[index];

  if (!event) return null;

  const isSelected = selectedEventId === event.id;
  const createdAt = event.created_at ? new Date(event.created_at * 1000) : new Date();
  const content = event.content || 'No content';
  const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
  const authorShort = event.pubkey ? event.pubkey.substring(0, 8) + '...' : 'Unknown';

  return (
    <div style={style}>
      <button
        onClick={() => onEventSelect(event)}
        className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-2 md:p-4 text-sm leading-tight whitespace-nowrap w-full text-left transition-colors min-h-[60px] ${
          isSelected 
            ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
            : ''
        }`}
      >
        <div className="flex w-full items-center gap-2">
          <span className="font-mono text-xs">{authorShort}</span>
          <span className="ml-auto text-xs">
            {getRelativeTime(createdAt)}
          </span>
        </div>
        <span className="font-medium">Kind {event.kind}</span>
        <span className="line-clamp-2 w-full max-w-[260px] text-xs whitespace-break-spaces">
          {shortContent}
        </span>
      </button>
    </div>
  );
});

EventItem.displayName = 'EventItem';

export const VirtualizedEventList = memo(({ 
  events, 
  selectedEventId, 
  onEventSelect, 
  height 
}: VirtualizedEventListProps) => {
  const itemData = useCallback(() => ({
    events,
    selectedEventId,
    onEventSelect
  }), [events, selectedEventId, onEventSelect]);

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No events found
      </div>
    );
  }

  return (
    <List
      height={height}
      width="100%"
      itemCount={events.length}
      itemSize={ITEM_HEIGHT}
      itemData={itemData()}
      className="scrollbar-hide"
    >
      {EventItem}
    </List>
  );
});

VirtualizedEventList.displayName = 'VirtualizedEventList';