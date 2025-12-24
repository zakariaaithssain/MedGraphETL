import { useQuery } from '@tanstack/react-query';
import { getHealth, getNodes, getRelations, getGraphInfo, getApiInfo } from '@/services/api';

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

export const useNodes = () => {
  return useQuery({
    queryKey: ['nodes'],
    queryFn: getNodes,
    retry: 2,
  });
};

export const useRelations = () => {
  return useQuery({
    queryKey: ['relations'],
    queryFn: getRelations,
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
