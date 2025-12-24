import { useHealth } from '@/hooks/useApi';
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HealthIndicatorProps {
  compact?: boolean;
}

export const HealthIndicator = ({ compact = false }: HealthIndicatorProps) => {
  const { data, isLoading, isError, refetch, isFetching } = useHealth(30000);
  
  const isHealthy = !isError && data?.status === 'healthy';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div 
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors",
            isLoading ? "bg-muted-foreground animate-pulse" :
            isHealthy ? "bg-success" : "bg-destructive"
          )}
        />
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Checking..." : isHealthy ? "Connected" : "Disconnected"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : isHealthy ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className={cn(
          "text-sm font-medium",
          isHealthy ? "text-success" : "text-destructive"
        )}>
          {isLoading ? "Checking..." : isHealthy ? "API Healthy" : "API Unavailable"}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => refetch()}
        disabled={isFetching}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
      </Button>
    </div>
  );
};
