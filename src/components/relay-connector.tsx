import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNostr } from '@/contexts/NostrContext';
import { useRelay } from '@/hooks/useRelay';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { RelayCombobox } from './relay-combobox';

export const RelayConnector: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('wss://relay.damus.io');
  const { isConnected, connectionError, relayUrl, connect, disconnect, connectionStatus } = useNostr();
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

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="success" className="gap-1">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
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
          size="sm"
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
      
      <div className="flex items-center justify-between">
        {getStatusBadge()}
        {relayUrl && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {relayUrl}
          </span>
        )}
      </div>
      
      {connectionError && (
        <div className="text-xs text-destructive">
          {connectionError}
        </div>
      )}
    </div>
  );
};