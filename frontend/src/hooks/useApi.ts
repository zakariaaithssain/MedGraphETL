import { useQuery } from '@tanstack/react-query';
import { getHealth, getApiInfo, getNodes, getRelations, getGraphInfo } from '@/services/api';

export const useHealth = (refetchInterval?: number) => {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: refetchInterval || 30000,
    retry: 1,
  });
};

export const useApiInfo = () => {
  return useQuery({
    queryKey: ['apiInfo'],
    queryFn: getApiInfo,
    retry: 1,
  });
};

export const useNodes = (params?: {
  label?: string;
  cui?: string;
  name?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['nodes', params],
    queryFn: () => getNodes(params),
    retry: 2,
  });
};

export const useRelations = (params?: {
  type?: string;
  source_cui?: string;
  target_cui?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['relations', params],
    queryFn: () => getRelations(params),
    retry: 2,
  });
};

export const useGraphInfo = () => {
  return useQuery({
    queryKey: ['graphInfo'],
    queryFn: getGraphInfo,
    retry: 2,
  });
};
