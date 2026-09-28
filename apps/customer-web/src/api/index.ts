import { HttpMarketplaceApi } from './httpMarketplaceApi';
import { createMockMarketplaceApi } from './mockMarketplaceApi';
import type { MarketplaceApi } from './types';

const apiMode = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';
const apiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';

export const runtimeConfig = {
  apiMode,
  apiBaseUrl,
  isMock: apiMode === 'mock',
} as const;

export const marketplaceApi: MarketplaceApi = runtimeConfig.isMock
  ? createMockMarketplaceApi()
  : new HttpMarketplaceApi(apiBaseUrl);
