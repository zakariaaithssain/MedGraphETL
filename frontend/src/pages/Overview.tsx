import { useGraphInfo, useNodes, useRelations } from '@/hooks/useApi';
import { StatCard } from '@/components/StatCard';
import { LabelBadge } from '@/components/LabelBadge';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Circle, GitBranch, Tag, Database, Activity, Zap } from 'lucide-react';

const Overview = () => {
  const { data: graphInfo, isLoading, isError, refetch } = useGraphInfo();
  const { data: nodes } = useNodes();
  const { data: relations } = useRelations();

  if (isLoading) {
    return <LoadingState message="Loading graph statistics..." />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const nodeCount = graphInfo?.nodeCount ?? nodes?.length ?? 0;
  const relationCount = graphInfo?.relationCount ?? relations?.length ?? 0;
  const nodeLabels = graphInfo?.nodeLabels ?? [];
  const relationshipTypes = graphInfo?.relationshipTypes ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Graph Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your medical knowledge graph statistics and metadata
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Nodes"
          value={nodeCount.toLocaleString()}
          icon={Circle}
          subtitle="Entities in graph"
          variant="primary"
        />
        <StatCard
          title="Total Relationships"
          value={relationCount.toLocaleString()}
          icon={GitBranch}
          subtitle="Connections"
          variant="success"
        />
        <StatCard
          title="Node Labels"
          value={nodeLabels.length}
          icon={Tag}
          subtitle="Unique types"
        />
        <StatCard
          title="Relationship Types"
          value={relationshipTypes.length}
          icon={Zap}
          subtitle="Connection types"
        />
      </div>

      {/* Labels & Types Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Node Labels */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-medium">Node Labels</h2>
          </div>
          {nodeLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {nodeLabels.map((label) => (
                <LabelBadge key={label} label={label} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No labels found</p>
          )}
        </div>

        {/* Relationship Types */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-lg bg-success/10 p-2">
              <Activity className="h-4 w-4 text-success" />
            </div>
            <h2 className="font-medium">Relationship Types</h2>
          </div>
          {relationshipTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {relationshipTypes.map((type) => (
                <LabelBadge key={type} label={type} variant="outline" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No relationship types found</p>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-medium mb-3">API Information</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Base URL</p>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}
            </code>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Database</p>
            <p className="text-sm font-medium">Neo4j</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Framework</p>
            <p className="text-sm font-medium">FastAPI</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
