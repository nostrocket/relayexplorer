import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNostr } from '@/contexts/NostrContext';
import { useRelay } from '@/hooks/useRelay';
import { Loader2 } from 'lucide-react';
import { RelayCombobox } from './relay-combobox';

export const RelayConnector: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('wss://relay.damus.io');
  const { isConnected, connect, disconnect, connectionStatus } = useNostr();
  const { validateRelayUrl } = useRelay();

  const handleConnect = async () => {
    if (!validateRelayUrl(inputUrl)) {
      alert('Please enter a valid WebSocket URL (ws:// or wss://)');
      return;
    }
    
    if (isConnected) {
      disconnect();
    } else {
      await connect(inputUrl);
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