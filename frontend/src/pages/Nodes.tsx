import { useState, useMemo } from 'react';
import { useNodes, useGraphInfo } from '@/hooks/useApi';
import { SearchInput } from '@/components/SearchInput';
import { LabelBadge } from '@/components/LabelBadge';
import { JsonViewer } from '@/components/JsonViewer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cui, setCui] = useState('');
  const [name, setName] = useState('');
  const [limit, setLimit] = useState<number>(10);

  // Get available labels from graph info
  const { data: graphInfo, isLoading: infoLoading } = useGraphInfo();
  
  // Set default label when graph info loads
  const availableLabels = graphInfo?.nodeLabels || [];
  const defaultLabel = availableLabels[0] || '';
  
  const effectiveLabel = selectedLabel || defaultLabel;

  // Fetch nodes for selected label with filters
  const { data: nodes, isLoading, isError, refetch, isFetching } = useNodes({ 
    label: effectiveLabel,
    cui: cui || undefined,
    name: name || undefined,
    limit: limit 
  }, effectiveLabel ? true : false);

  // Filter nodes by search
  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    return nodes.filter((node) => {
      const matchesSearch = search === '' || 
        node.id?.toLowerCase().includes(search.toLowerCase()) ||
        node.labels?.some((l) => l.toLowerCase().includes(search.toLowerCase())) ||
        JSON.stringify(node.properties).toLowerCase().includes(search.toLowerCase());
      
      return matchesSearch;
    });
  }, [nodes, search]);

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (infoLoading || isLoading) {
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

      {/* Filters and Input Fields */}
      <div className="space-y-4">
        {/* Search and Label Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by ID, label, or property..."
            className="flex-1 max-w-md"
          />
          <Select value={selectedLabel} onValueChange={setSelectedLabel}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select label" />
            </SelectTrigger>
            <SelectContent>
              {availableLabels.map((label) => (
                <SelectItem key={label} value={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Additional Filters - CUI and Name */}
        <div className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-4 rounded-lg">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              CUI (Concept Unique Identifier)
            </label>
            <Input
              value={cui}
              onChange={(e) => setCui(e.target.value)}
              placeholder="Enter CUI..."
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Limit Results
            </label>
            <Input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="10"
              min="1"
              max="10000"
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCui('');
                setName('');
              }}
              className="w-full sm:w-auto"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredNodes.length === 0 ? (
        <EmptyState
          icon={Circle}
          title="No nodes found"
          description={search 
            ? "Try adjusting your search criteria" 
            : "The graph doesn't contain any nodes for this label"}
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Node ID</TableHead>
                <TableHead>CUI</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Normalized Name</TableHead>
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
                  <TableCell className="font-mono text-sm">{node.cui}</TableCell>
                  <TableCell className="max-w-[200px]">{node.name}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[300px] text-sm text-muted-foreground">
                    {node.normalizedName}
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
