import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelation {
  id?: string;
  type: string;
  sourceId: string;
  targetId: string;
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
  identity?: { low: number; high: number };
  labels: string[];
  properties: Record<string, unknown>;
}

interface RawRelation {
  relationship: {
    identity?: { low: number; high: number };
    type: string;
    properties: Record<string, unknown>;
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
  if (node.identity && typeof node.identity.low === 'number') {
    return `n${node.identity.low}`;
  }
  return JSON.stringify(node.identity || '');
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
  
  // label is required, default to 'DRUG' if not provided
  if (params?.label) {
    queryParams.label = params.label;
  } else {
    queryParams.label = 'DRUG';
  }
  
  if (params?.cui) queryParams.cui = params.cui;
  if (params?.name) queryParams.name = params.name;
  if (params?.limit) queryParams.limit = params.limit;
  
  const response = await api.get<RawNode[]>('/nodes', { params: queryParams });
  return response.data.map(node => ({
    id: getNodeId(node),
    labels: node.labels || [],
    properties: node.properties || {},
  }));
};

export const getRelations = async (params?: {
  type?: string;
  source_cui?: string;
  target_cui?: string;
  limit?: number;
}): Promise<GraphRelation[]> => {
  const queryParams: Record<string, unknown> = {};
  
  // type is required, default to 'INTERACTS_WITH' if not provided
  if (params?.type) {
    queryParams.type = params.type;
  } else {
    queryParams.type = 'INTERACTS_WITH';
  }
  
  if (params?.source_cui) queryParams.source_cui = params.source_cui;
  if (params?.target_cui) queryParams.target_cui = params.target_cui;
  if (params?.limit) queryParams.limit = params.limit;
  
  const response = await api.get<RawRelation[]>('/relations', { params: queryParams });
  return response.data.map((rel, index) => ({
    id: rel.relationship.identity?.low ? `r${rel.relationship.identity.low}` : `r${index}`,
    type: rel.relationship.type,
    sourceId: getNodeId(rel.source),
    targetId: getNodeId(rel.target),
    sourceLabel: rel.source.labels?.[0],
    targetLabel: rel.target.labels?.[0],
    properties: rel.relationship.properties || {},
  }));
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
