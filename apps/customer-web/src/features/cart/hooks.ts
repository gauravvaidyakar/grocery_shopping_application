import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../../api';

export const cartKey = ['customer-cart'] as const;

export function useCart(enabled = true) {
  return useQuery({ queryKey: cartKey, queryFn: () => marketplaceApi.getCart(), enabled });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => marketplaceApi.addCartItem(productId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => marketplaceApi.updateCartItem(itemId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => marketplaceApi.removeCartItem(itemId),
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
  });
}

export function useRefreshCart() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: () => marketplaceApi.refreshCart(), onSuccess: (cart) => queryClient.setQueryData(cartKey, cart) });
}
