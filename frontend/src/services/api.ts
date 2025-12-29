import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://backend:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface HealthStatus {
  status: string;
}

export interface ApiInfo {
  message?: string;
  version?: string;
  endpoints?: Record<string, string>;
}

export interface GraphNode {
  id: string;
  cui: string;
  name: string;
  normalizedName: string;
  normalizationSource: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelation {
  id?: string;
  type: string;
  sourceId: string;
  sourceCui: string;
  sourceName: string;
  targetId: string;
  targetCui: string;
  targetName: string;
  sourceLabel?: string;
  targetLabel?: string;
  properties: Record<string, unknown>;
}

export interface GraphInfo {
  nodeCount: number;
  relationCount: number;
  nodeLabels: string[];
  relationshipTypes: string[];
}

// Raw API response types
interface RawNode {
  cui: string;
  name: string;
  normalized_name: string;
  id: string;
  normalization_source: string;
  [key: string]: unknown;
}

interface RawRelation {
  relationship: {
    type: string;
    [key: string]: unknown;
  };
  source: RawNode;
  target: RawNode;
}

interface RawGraphInfo {
  nodes: number;
  relations: number;
  labels: string[];
  relation_types: string[];
}

// Helper function to extract node ID
const getNodeId = (node: RawNode): string => {
  return node.id || '';
};

// API Functions
export const getApiInfo = async (): Promise<ApiInfo> => {
  const response = await api.get<ApiInfo>('/');
  return response.data;
};

export const getHealth = async (): Promise<HealthStatus> => {
  const response = await api.get<HealthStatus>('/health');
  return response.data;
};

export const getNodes = async (params?: {
  label?: string;
  cui?: string;
  name?: string;
  limit?: number;
}): Promise<GraphNode[]> => {
  const queryParams: Record<string, unknown> = {};
  
  // label is required - must be provided
  if (!params?.label) {
    throw new Error('Label is required to fetch nodes');
  }
  
  queryParams.label = params.label;
  if (params?.cui) queryParams.cui = params.cui;
  if (params?.name) queryParams.name = params.name;
  if (params?.limit) queryParams.limit = params.limit;
  
  const response = await api.get<RawNode[]>('/nodes', { params: queryParams });
  return response.data.map(node => ({
    id: getNodeId(node),
    cui: node.cui,
    name: node.name,
    normalizedName: node.normalized_name,
    normalizationSource: node.normalization_source,
    labels: [], // Nodes don't have labels in this API
    properties: {
      cui: node.cui,
      name: node.name,
      normalized_name: node.normalized_name,
      normalization_source: node.normalization_source,
    },
  }));
};

export const getRelations = async (params?: {
  type?: string;
  source_cui?: string;
  target_cui?: string;
  limit?: number;
}): Promise<GraphRelation[]> => {
  const queryParams: Record<string, unknown> = {};
  
  // type is required - must be provided
  if (!params?.type) {
    throw new Error('Type is required to fetch relations');
  }
  
  queryParams.type = params.type;
  if (params?.source_cui) queryParams.source_cui = params.source_cui;
  if (params?.target_cui) queryParams.target_cui = params.target_cui;
  if (params?.limit) queryParams.limit = params.limit;
  
  const response = await api.get<RawRelation[]>('/relations', { params: queryParams });
  return response.data.map((rel, index) => {
    const relationshipProps: Record<string, unknown> = { type: rel.relationship.type };
    // Include any additional properties from relationship
    Object.keys(rel.relationship).forEach(key => {
      if (key !== 'type') {
        relationshipProps[key] = rel.relationship[key];
      }
    });

    return {
      id: `${rel.source.cui}-${rel.target.cui}-${index}`,
      type: rel.relationship.type,
      sourceId: getNodeId(rel.source),
      sourceCui: rel.source.cui,
      sourceName: rel.source.name,
      targetId: getNodeId(rel.target),
      targetCui: rel.target.cui,
      targetName: rel.target.name,
      sourceLabel: rel.source.normalized_name,
      targetLabel: rel.target.normalized_name,
      properties: relationshipProps,
    };
  });
};

export const getGraphInfo = async (): Promise<GraphInfo> => {
  const response = await api.get<RawGraphInfo>('/info');
  return {
    nodeCount: response.data.nodes,
    relationCount: response.data.relations,
    nodeLabels: response.data.labels,
    relationshipTypes: response.data.relation_types,
  };
};

export default api;
