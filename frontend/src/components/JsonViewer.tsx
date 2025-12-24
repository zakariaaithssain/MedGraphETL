import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const JsonViewer = ({ 
  data, 
  className, 
  collapsible = true,
  defaultExpanded = false 
}: JsonViewerProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);
  const isExpandable = collapsible && jsonString.length > 100;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative group", className)}>
      {isExpandable && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 left-1 h-6 px-2 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 mr-1" />
          ) : (
            <ChevronRight className="h-3 w-3 mr-1" />
          )}
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>

      <pre className={cn(
        "bg-muted/50 rounded-md p-3 text-xs font-mono overflow-x-auto",
        isExpandable && "pt-8",
        isExpandable && !expanded && "max-h-24 overflow-hidden"
      )}>
        <code className="text-foreground">{jsonString}</code>
      </pre>

      {isExpandable && !expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/50 to-transparent rounded-b-md" />
      )}
    </div>
  );
};
