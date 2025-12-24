import { useState, useMemo } from 'react';
import { useNodes } from '@/hooks/useApi';
import { SearchInput } from '@/components/SearchInput';
import { LabelBadge } from '@/components/LabelBadge';
import { JsonViewer } from '@/components/JsonViewer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Copy, Check, Circle, Filter, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const Nodes = () => {
  const { data: nodes, isLoading, isError, refetch, isFetching } = useNodes();
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Get unique labels
  const allLabels = useMemo(() => {
    if (!nodes) return [];
    const labels = new Set<string>();
    nodes.forEach((node) => node.labels?.forEach((l) => labels.add(l)));
    return Array.from(labels).sort();
  }, [nodes]);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    return nodes.filter((node) => {
      const matchesSearch = search === '' || 
        node.id?.toLowerCase().includes(search.toLowerCase()) ||
        node.labels?.some((l) => l.toLowerCase().includes(search.toLowerCase())) ||
        JSON.stringify(node.properties).toLowerCase().includes(search.toLowerCase());
      
      const matchesLabel = labelFilter === 'all' || 
        node.labels?.includes(labelFilter);

      return matchesSearch && matchesLabel;
    });
  }, [nodes, search, labelFilter]);

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return <LoadingState message="Loading nodes..." />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nodes</h1>
          <p className="text-muted-foreground mt-1">
            Explore and search graph nodes ({filteredNodes.length} of {nodes?.length ?? 0})
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by ID, label, or property..."
          className="flex-1 max-w-md"
        />
        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {allLabels.map((label) => (
              <SelectItem key={label} value={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredNodes.length === 0 ? (
        <EmptyState
          icon={Circle}
          title="No nodes found"
          description={search || labelFilter !== 'all' 
            ? "Try adjusting your search or filter criteria" 
            : "The graph doesn't contain any nodes yet"}
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Node ID</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead className="hidden md:table-cell">Properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.map((node) => (
                <TableRow 
                  key={node.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedRow(expandedRow === node.id ? null : node.id)}
                >
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[150px]">{node.id}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyId(node.id);
                        }}
                      >
                        {copiedId === node.id ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {node.labels?.map((label) => (
                        <LabelBadge key={label} label={label} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {Object.keys(node.properties || {}).length} properties
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Expanded Properties */}
          {expandedRow && (
            <div className="border-t bg-muted/30 p-4 animate-slide-up">
              <h4 className="text-sm font-medium mb-2">Node Properties</h4>
              <JsonViewer 
                data={filteredNodes.find((n) => n.id === expandedRow)?.properties || {}}
                defaultExpanded
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Nodes;
