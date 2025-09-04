import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNostr } from '@/hooks/useNostr';
import { useRelay } from '@/hooks/useRelay';
import { Loader2, Clock, Hash } from 'lucide-react';
import { RelayCombobox } from './relay-combobox';
import type { SubscriptionTimeFilter } from '@/types/app';

export const RelayConnector: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('wss://relay.damus.io');
  const [eventKinds, setEventKinds] = useState('0,1');
  const [kindsError, setKindsError] = useState<string | null>(null);
  const [timeFilterEnabled, setTimeFilterEnabled] = useState(false);
  const [sinceSeconds, setSinceSeconds] = useState('86400');
  const [timeFilterError, setTimeFilterError] = useState<string | null>(null);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [eventLimit, setEventLimit] = useState('100');
  const [limitError, setLimitError] = useState<string | null>(null);
  const { isConnected, connect, disconnect, connectionStatus } = useNostr();
  const { validateRelayUrl } = useRelay();

  const validateEventKinds = (kinds: string): number[] | null => {
    if (!kinds.trim()) {
      setKindsError('Event kinds cannot be empty');
      return null;
    }

    const kindsArray = kinds.split(',').map(k => k.trim()).filter(k => k !== '');
    const numbers: number[] = [];

    for (const kind of kindsArray) {
      const num = parseInt(kind, 10);
      if (isNaN(num) || num < 0) {
        setKindsError(`"${kind}" is not a valid event kind. Please use only non-negative integers.`);
        return null;
      }
      numbers.push(num);
    }

    if (numbers.length === 0) {
      setKindsError('Please provide at least one event kind');
      return null;
    }

    setKindsError(null);
    return numbers;
  };

  const validateTimeFilter = (seconds: string): Partial<SubscriptionTimeFilter> | null => {
    if (!timeFilterEnabled) {
      setTimeFilterError(null);
      return null;
    }

    if (!seconds.trim()) {
      setTimeFilterError('Seconds cannot be empty when time filter is enabled');
      return null;
    }

    const numSeconds = parseFloat(seconds);
    if (isNaN(numSeconds) || numSeconds <= 0) {
      setTimeFilterError('Seconds must be a positive number');
      return null;
    }

    if (numSeconds > 31536000) { // 365 days in seconds
      setTimeFilterError('Seconds cannot exceed 31536000 (1 year)');
      return null;
    }

    const sinceTimestamp = Math.floor((Date.now() - (numSeconds * 1000)) / 1000);
    
    setTimeFilterError(null);
    return { since: sinceTimestamp };
  };

  const validateEventLimit = (limit: string): number | null => {
    if (!limitEnabled) {
      setLimitError(null);
      return null;
    }

    if (!limit.trim()) {
      setLimitError('Event limit cannot be empty when limit is enabled');
      return null;
    }

    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit <= 0) {
      setLimitError('Event limit must be a positive integer');
      return null;
    }

    if (numLimit > 5000) {
      setLimitError('Event limit cannot exceed 5000');
      return null;
    }

    setLimitError(null);
    return numLimit;
  };

  const handleConnect = async () => {
    if (!validateRelayUrl(inputUrl)) {
      alert('Please enter a valid WebSocket URL (ws:// or wss://)');
      return;
    }

    const parsedKinds = validateEventKinds(eventKinds);
    if (!parsedKinds) {
      return;
    }

    const timeFilter = validateTimeFilter(sinceSeconds);
    if (timeFilterEnabled && !timeFilter) {
      return;
    }

    const limit = validateEventLimit(eventLimit);
    if (limitEnabled && limit === null) {
      return;
    }

    // Combine time filter and limit into a single filter object
    const combinedFilter: SubscriptionTimeFilter | undefined = 
      timeFilter || limitEnabled ? {
        ...timeFilter,
        ...(limit !== null ? { limit } : {})
      } : undefined;
    
    if (isConnected) {
      disconnect();
    } else {
      await connect(inputUrl, parsedKinds, combinedFilter);
    }
  };

  const handleEventKindsChange = (value: string) => {
    setEventKinds(value);
    if (kindsError) {
      // Clear error when user starts typing
      setKindsError(null);
    }
  };

  const handleSinceSecondsChange = (value: string) => {
    setSinceSeconds(value);
    if (timeFilterError) {
      // Clear error when user starts typing
      setTimeFilterError(null);
    }
  };

  const handleEventLimitChange = (value: string) => {
    setEventLimit(value);
    if (limitError) {
      // Clear error when user starts typing
      setLimitError(null);
    }
  };


  return (
    <div className="space-y-3">
      <RelayCombobox
        value={inputUrl}
        onValueChange={setInputUrl}
        disabled={connectionStatus === 'connecting'}
        placeholder="Enter relay URL or select from popular relays..."
      />
      
      <div className="space-y-2">
        <label htmlFor="event-kinds" className="text-sm font-medium">
          Event Kinds (comma-separated)
        </label>
        <Input
          id="event-kinds"
          type="text"
          value={eventKinds}
          onChange={(e) => handleEventKindsChange(e.target.value)}
          placeholder="0,1"
          disabled={connectionStatus === 'connecting'}
          className={kindsError ? "border-red-500" : ""}
        />
        {kindsError && (
          <p className="text-sm text-red-500">{kindsError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Default: 0 (profiles), 1 (text notes). Use comma-separated integers for multiple kinds.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="time-filter"
            checked={timeFilterEnabled}
            onCheckedChange={setTimeFilterEnabled}
            disabled={connectionStatus === 'connecting'}
          />
          <Label htmlFor="time-filter" className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>Limit by time period</span>
          </Label>
        </div>

        {timeFilterEnabled && (
          <div className="space-y-2 pl-6">
            <label htmlFor="since-seconds" className="text-sm font-medium">
              Show events from last (seconds)
            </label>
            <Input
              id="since-seconds"
              type="number"
              value={sinceSeconds}
              onChange={(e) => handleSinceSecondsChange(e.target.value)}
              placeholder="86400"
              min="1"
              max="31536000"
              step="1"
              disabled={connectionStatus === 'connecting'}
              className={timeFilterError ? "border-red-500" : ""}
            />
            {timeFilterError && (
              <p className="text-sm text-red-500">{timeFilterError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave unchecked to get all available events from the relay. Max: 31536000 seconds (1 year). Default: 86400 (24 hours).
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="event-limit"
            checked={limitEnabled}
            onCheckedChange={setLimitEnabled}
            disabled={connectionStatus === 'connecting'}
          />
          <Label htmlFor="event-limit" className="flex items-center space-x-1">
            <Hash className="h-4 w-4" />
            <span>Limit number of events</span>
          </Label>
        </div>

        {limitEnabled && (
          <div className="space-y-2 pl-6">
            <label htmlFor="event-limit-input" className="text-sm font-medium">
              Maximum number of events
            </label>
            <Input
              id="event-limit-input"
              type="number"
              value={eventLimit}
              onChange={(e) => handleEventLimitChange(e.target.value)}
              placeholder="100"
              min="1"
              max="5000"
              step="1"
              disabled={connectionStatus === 'connecting'}
              className={limitError ? "border-red-500" : ""}
            />
            {limitError && (
              <p className="text-sm text-red-500">{limitError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave unchecked to get all available events. Max: 5000 events. Default: 100 events.
            </p>
          </div>
        )}
      </div>
      
      <Button 
        onClick={handleConnect}
        disabled={connectionStatus === 'connecting'}
        variant={isConnected ? "destructive" : "default"}
        className="w-full"
      >
        {connectionStatus === 'connecting' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isConnected ? (
          'Disconnect'
        ) : (
          'Connect'
        )}
      </Button>
    </div>
  );
};