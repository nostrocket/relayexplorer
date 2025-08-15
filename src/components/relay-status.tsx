import { useNostr } from '@/contexts/NostrContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, Loader2, AlertCircle, Info } from 'lucide-react';

export const RelayStatus: React.FC = () => {
  const { 
    connectionStatus, 
    connectionError, 
    relayUrl, 
    relayMetadata, 
    isConnected 
  } = useNostr();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getStatusColor()}>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </Badge>
          </div>
          {relayUrl && (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
              {relayUrl}
            </span>
          )}
        </div>

        {connectionError && (
          <div className="text-xs text-red-500 mb-2">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            {connectionError}
          </div>
        )}

        {relayMetadata && (
          <div className="space-y-1">
            {relayMetadata.name && (
              <div className="text-xs">
                <span className="font-medium">Name:</span> {relayMetadata.name}
              </div>
            )}
            {relayMetadata.description && (
              <div className="text-xs">
                <span className="font-medium">Description:</span> {relayMetadata.description}
              </div>
            )}
            {relayMetadata.supported_nips && relayMetadata.supported_nips.length > 0 && (
              <div className="text-xs">
                <span className="font-medium">NIPs:</span> {relayMetadata.supported_nips.slice(0, 5).join(', ')}
                {relayMetadata.supported_nips.length > 5 && '...'}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Status: {isConnected ? 'Ready for events' : 'Not receiving events'}
        </div>
      </CardContent>
    </Card>
  );
};