import { useState, useMemo } from 'react';
import { useRelations } from '@/hooks/useApi';
import { SearchInput } from '@/components/SearchInput';
import { LabelBadge } from '@/components/LabelBadge';
import { JsonViewer } from '@/components/JsonViewer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { GitBranch, Filter, RefreshCw, ArrowRight } from 'lucide-react';
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

const Relationships = () => {
  const { data: relations, isLoading, isError, refetch, isFetching } = useRelations();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Get unique relationship types
  const allTypes = useMemo(() => {
    if (!relations) return [];
    const types = new Set<string>();
    relations.forEach((rel) => rel.type && types.add(rel.type));
    return Array.from(types).sort();
  }, [relations]);

  // Filter relationships
  const filteredRelations = useMemo(() => {
    if (!relations) return [];
    return relations.filter((rel) => {
      const matchesSearch = search === '' || 
        rel.type?.toLowerCase().includes(search.toLowerCase()) ||
        rel.sourceId?.toLowerCase().includes(search.toLowerCase()) ||
        rel.targetId?.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = typeFilter === 'all' || rel.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [relations, search, typeFilter]);

  if (isLoading) {
    return <LoadingState message="Loading relationships..." />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relationships</h1>
          <p className="text-muted-foreground mt-1">
            Explore graph connections ({filteredRelations.length} of {relations?.length ?? 0})
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
          placeholder="Search by type or node IDs..."
          className="flex-1 max-w-md"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {allTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredRelations.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No relationships found"
          description={search || typeFilter !== 'all' 
            ? "Try adjusting your search or filter criteria" 
            : "The graph doesn't contain any relationships yet"}
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Type</TableHead>
                <TableHead>Source Node</TableHead>
                <TableHead className="w-[50px] text-center"></TableHead>
                <TableHead>Target Node</TableHead>
                <TableHead className="hidden lg:table-cell">Properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRelations.map((rel, index) => (
                <TableRow 
                  key={rel.id || index}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedRow(expandedRow === (rel.id || String(index)) ? null : (rel.id || String(index)))}
                >
                  <TableCell>
                    <LabelBadge label={rel.type} variant="primary" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rel.sourceLabel && (
                        <LabelBadge label={rel.sourceLabel} className="hidden sm:inline-flex" />
                      )}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                        {rel.sourceId}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rel.targetLabel && (
                        <LabelBadge label={rel.targetLabel} className="hidden sm:inline-flex" />
                      )}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                        {rel.targetId}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {Object.keys(rel.properties || {}).length} properties
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Expanded Properties */}
          {expandedRow && (
            <div className="border-t bg-muted/30 p-4 animate-slide-up">
              <h4 className="text-sm font-medium mb-2">Relationship Properties</h4>
              <JsonViewer 
                data={filteredRelations.find((r) => (r.id || String(filteredRelations.indexOf(r))) === expandedRow)?.properties || {}}
                defaultExpanded
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Relationships;
