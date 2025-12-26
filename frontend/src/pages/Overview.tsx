import { useGraphInfo } from '@/hooks/useApi';
import { StatCard } from '@/components/StatCard';
import { LabelBadge } from '@/components/LabelBadge';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Circle, GitBranch, Tag, Database, Activity, Zap, Info, BookOpen, Cpu, Settings } from 'lucide-react';
import projectInfo from '@/data/projectInfo.json';

const Overview = () => {
  const { data: graphInfo, isLoading, isError, refetch } = useGraphInfo();

  if (isLoading) {
    return <LoadingState message="Loading graph statistics..." />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const nodeCount = graphInfo?.nodeCount ?? 0;
  const relationCount = graphInfo?.relationCount ?? 0;
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
                <LabelBadge key={type} label={type} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No relationship types found</p>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-blue/10 p-2">
            <Info className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="font-medium">Project Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{projectInfo.name}</h3>
            <p className="text-sm text-muted-foreground">{projectInfo.description}</p>
          </div>

          {/* Overview Section */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> {projectInfo.sections.overview.title}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{projectInfo.sections.overview.content}</p>
          </div>
          
          {/* Features & Data Sources */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> {projectInfo.sections.features.title}
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {projectInfo.sections.features.items.slice(0, 5).map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Database className="h-3 w-3" /> {projectInfo.sections.dataSources.title}
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {projectInfo.sections.dataSources.items.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
              <Cpu className="h-3 w-3" /> {projectInfo.sections.technology.title}
            </p>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div>
                <p className="text-muted-foreground font-medium mb-2">Backend</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>Framework: <span className="font-medium text-foreground">{projectInfo.sections.technology.backend.framework}</span></p>
                  <p>Database: <span className="font-medium text-foreground">{projectInfo.sections.technology.backend.database}</span></p>
                  <p>Language: <span className="font-medium text-foreground">{projectInfo.sections.technology.backend.language}</span></p>
                  <p>NLP: <span className="font-medium text-foreground">{projectInfo.sections.technology.backend.nlpLibraries}</span></p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-2">Frontend</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>Framework: <span className="font-medium text-foreground">{projectInfo.sections.technology.frontend.framework}</span></p>
                  <p>Build: <span className="font-medium text-foreground">{projectInfo.sections.technology.frontend.buildTool}</span></p>
                  <p>Styling: <span className="font-medium text-foreground">{projectInfo.sections.technology.frontend.styling}</span></p>
                  <p>Components: <span className="font-medium text-foreground">{projectInfo.sections.technology.frontend.components}</span></p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-2">Storage</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>Intermediate: <span className="font-medium text-foreground">{projectInfo.sections.technology.backend.intermediateStorage}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* ETL Pipeline */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Settings className="h-3 w-3" /> ETL Pipeline
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Stages: <span className="font-medium text-foreground">{projectInfo.sections.technology.etl.pipelineStages.join(' → ')}</span></p>
              <p>CLI Options: <span className="font-medium text-foreground">{projectInfo.sections.technology.etl.configOptions.join(', ')}</span></p>
            </div>
          </div>

          {/* System Requirements */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">{projectInfo.sections.requirements.title}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {projectInfo.sections.requirements.items.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
