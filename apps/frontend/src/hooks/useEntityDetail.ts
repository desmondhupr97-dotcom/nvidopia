import { useQuery } from '@tanstack/react-query';

export function useEntityDetail<T>(
  queryKey: string,
  id: string | undefined,
  fetchFn: (id: string) => Promise<T>,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey, id],
    queryFn: () => fetchFn(id!),
    enabled: !!id,
  });

  return { data, isLoading, error };
}
