import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNostr } from '@/hooks/useNostr';
import { useRelay } from '@/hooks/useRelay';
import { Loader2 } from 'lucide-react';
import { RelayCombobox } from './relay-combobox';

export const RelayConnector: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('wss://relay.damus.io');
  const [eventKinds, setEventKinds] = useState('0,1');
  const [kindsError, setKindsError] = useState<string | null>(null);
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

  const handleConnect = async () => {
    if (!validateRelayUrl(inputUrl)) {
      alert('Please enter a valid WebSocket URL (ws:// or wss://)');
      return;
    }

    const parsedKinds = validateEventKinds(eventKinds);
    if (!parsedKinds) {
      return;
    }
    
    if (isConnected) {
      disconnect();
    } else {
      await connect(inputUrl, parsedKinds);
    }
  };

  const handleEventKindsChange = (value: string) => {
    setEventKinds(value);
    if (kindsError) {
      // Clear error when user starts typing
      setKindsError(null);
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