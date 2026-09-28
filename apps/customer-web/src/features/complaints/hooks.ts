import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../../api';
import type { CreateComplaintInput } from '../../api/types';

export const complaintKeys = {
  all: ['customer-complaints'] as const,
  list: ['customer-complaints', 'list'] as const,
  detail: (id: string) => ['customer-complaints', 'detail', id] as const,
};

export function useComplaints() {
  return useQuery({ queryKey: complaintKeys.list, queryFn: () => marketplaceApi.getComplaints() });
}

export function useComplaint(id: string) {
  return useQuery({ queryKey: complaintKeys.detail(id), queryFn: () => marketplaceApi.getComplaint(id), enabled: Boolean(id) });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: CreateComplaintInput) => marketplaceApi.createComplaint(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: complaintKeys.all }) });
}

export function useAddComplaintMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (message: string) => marketplaceApi.addComplaintMessage(id, message), onSuccess: (complaint) => { queryClient.setQueryData(complaintKeys.detail(id), complaint); void queryClient.invalidateQueries({ queryKey: complaintKeys.list }); } });
}
