import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
  timestamp?: string;
}

export interface ApiInfo {
  name?: string;
  version?: string;
  description?: string;
}

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelation {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  sourceLabel?: string;
  targetLabel?: string;
  properties?: Record<string, unknown>;
}

export interface GraphInfo {
  nodeCount: number;
  relationCount: number;
  nodeLabels: string[];
  relationshipTypes: string[];
}

// API Functions
export const getApiInfo = async (): Promise<ApiInfo> => {
  const response = await api.get('/');
  return response.data;
};

export const getHealth = async (): Promise<HealthStatus> => {
  const response = await api.get('/health');
  return response.data;
};

export const getNodes = async (): Promise<GraphNode[]> => {
  const response = await api.get('/nodes');
  return response.data;
};

export const getRelations = async (): Promise<GraphRelation[]> => {
  const response = await api.get('/relations');
  return response.data;
};

export const getGraphInfo = async (): Promise<GraphInfo> => {
  const response = await api.get('/graph_info');
  return response.data;
};

export default api;
