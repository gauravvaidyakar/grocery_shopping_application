import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../../api';
import type { ProductQuery } from '../../api/types';

export const catalogueKeys = {
  homeHero: ['home-hero-slides'] as const,
  categories: ['categories'] as const,
  products: (query: ProductQuery) => ['products', query] as const,
  product: (idOrSlug: string) => ['product', idOrSlug] as const,
  reviews: (productId: string) => ['product-reviews', productId] as const,
  related: (categoryId: string) => ['related-products', categoryId] as const,
};

export function useHomeHeroSlides() {
  return useQuery({
    queryKey: catalogueKeys.homeHero,
    queryFn: () => marketplaceApi.getHomeHeroSlides(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: catalogueKeys.categories,
    queryFn: () => marketplaceApi.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useProducts(query: ProductQuery) {
  return useQuery({ queryKey: catalogueKeys.products(query), queryFn: () => marketplaceApi.getProducts(query), placeholderData: keepPreviousData, staleTime: 5 * 60 * 1000 });
}

export function useProduct(idOrSlug: string) {
  return useQuery({ queryKey: catalogueKeys.product(idOrSlug), queryFn: () => marketplaceApi.getProduct(idOrSlug), enabled: Boolean(idOrSlug), staleTime: 5 * 60 * 1000 });
}

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: catalogueKeys.reviews(productId),
    queryFn: () => marketplaceApi.getProductReviews(productId),
    enabled: Boolean(productId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRelatedProducts(categoryId: string) {
  return useQuery({
    queryKey: catalogueKeys.related(categoryId),
    queryFn: () => marketplaceApi.getProducts({ category: categoryId, page: 1, limit: 5 }),
    enabled: Boolean(categoryId),
    staleTime: 5 * 60 * 1000,
  });
}
