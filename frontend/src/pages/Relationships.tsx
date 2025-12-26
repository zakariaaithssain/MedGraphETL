import { useState } from 'react';
import { useRelations, useGraphInfo } from '@/hooks/useApi';
import { LabelBadge } from '@/components/LabelBadge';
import { JsonViewer } from '@/components/JsonViewer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [selectedType, setSelectedType] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sourceCui, setSourceCui] = useState('');
  const [targetCui, setTargetCui] = useState('');
  const [limit, setLimit] = useState<number>(10);

  // Get available relationship types from graph info
  const { data: graphInfo, isLoading: infoLoading } = useGraphInfo();
  
  // Set default type when graph info loads
  const availableTypes = graphInfo?.relationshipTypes || [];
  const defaultType = availableTypes[0] || '';
  
  const effectiveType = selectedType || defaultType;

  // Fetch relations for selected type with filters
  const { data: relations, isLoading, isError, refetch, isFetching } = useRelations({ 
    type: effectiveType,
    source_cui: sourceCui || undefined,
    target_cui: targetCui || undefined,
    limit: limit 
  }, effectiveType ? true : false);

  if (infoLoading || isLoading) {
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
            Explore graph connections ({relations?.length ?? 0} results)
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
        {/* Type Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Additional Filters - Source and Target CUI */}
        <div className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-4 rounded-lg">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Source CUI (Concept Unique Identifier)
            </label>
            <Input
              value={sourceCui}
              onChange={(e) => setSourceCui(e.target.value)}
              placeholder="Enter source CUI..."
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Target CUI (Concept Unique Identifier)
            </label>
            <Input
              value={targetCui}
              onChange={(e) => setTargetCui(e.target.value)}
              placeholder="Enter target CUI..."
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
                setSourceCui('');
                setTargetCui('');
              }}
              className="w-full sm:w-auto"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {!relations || relations.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No relationships found"
          description="The graph doesn't contain any relationships for this type"
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[50px] text-center"></TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="hidden lg:table-cell">Properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relations?.map((rel, index) => (
                <TableRow 
                  key={rel.id || index}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedRow(expandedRow === (rel.id || String(index)) ? null : (rel.id || String(index)))}
                >
                  <TableCell>
                    <LabelBadge label={rel.type} variant="primary" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="font-medium">{rel.sourceName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{rel.sourceCui}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="font-medium">{rel.targetName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{rel.targetCui}</div>
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
                data={relations?.find((r) => (r.id || String(relations.indexOf(r))) === expandedRow)?.properties || {}}
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
