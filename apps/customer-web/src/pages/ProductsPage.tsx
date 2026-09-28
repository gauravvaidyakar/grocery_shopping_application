import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProductSort, ProductType } from '../api/types';
import { ProductGrid } from '../components/product/ProductGrid';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { useCategories, useProducts } from '../features/catalogue/hooks';

const PAGE_SIZE = 6;

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useCategories();
  const query = useMemo(() => ({
    search: params.get('search') || undefined,
    category: params.get('category') || undefined,
    vendorId: params.get('vendorId') || undefined,
    productType: (params.get('productType') || undefined) as ProductType | undefined,
    minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
    maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    available: params.get('available') === 'true' || undefined,
    sort: (params.get('sort') || 'POPULAR') as ProductSort,
    page: Number(params.get('page') || 1),
    limit: PAGE_SIZE,
  }), [params]);
  const products = useProducts(query);

  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key); else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const clearFilters = () => {
    const search = params.get('search');
    setParams(search ? { search } : {});
  };

  return (
    <div className="page shell">
      <div className="catalogue-heading">
        <div><span className="eyebrow">Marketplace</span><h1>{query.search ? `Results for “${query.search}”` : 'Find food with a story'}</h1><p>{products.data?.meta.total ?? 0} approved products</p></div>
        <div className="catalogue-controls"><button className="button button--secondary filter-toggle" type="button" onClick={() => setFiltersOpen(true)}><Filter size={18} /> Filters</button><label><span className="sr-only">Sort products</span><select value={query.sort} onChange={(event) => update('sort', event.target.value)}><option value="POPULAR">Sort: Popularity</option><option value="PRICE_ASC">Price: Low to high</option><option value="PRICE_DESC">Price: High to low</option><option value="NEWEST">Newest first</option></select></label></div>
      </div>
      <div className="catalogue-layout">
        <aside className={`filters-panel ${filtersOpen ? 'is-open' : ''}`} aria-label="Product filters">
          <div className="filters-mobile-head"><strong><SlidersHorizontal size={18} /> Filters</strong><button className="icon-button" type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X /></button></div>
          <div className="filter-group"><h2>Category</h2><label><input type="radio" name="category" checked={!query.category} onChange={() => update('category')} /> All categories</label>{categories.data?.map((category) => <label key={category.id}><input type="radio" name="category" checked={query.category === category.id} onChange={() => update('category', category.id)} /> {category.name}</label>)}</div>
          <div className="filter-group"><h2>Product type</h2><label><input type="radio" name="type" checked={!query.productType} onChange={() => update('productType')} /> All types</label><label><input type="radio" name="type" checked={query.productType === 'RAW_COMMODITY'} onChange={() => update('productType', 'RAW_COMMODITY')} /> Raw / commodity</label><label><input type="radio" name="type" checked={query.productType === 'VALUE_ADDED'} onChange={() => update('productType', 'VALUE_ADDED')} /> Value-added</label></div>
          <div className="filter-group"><h2>Price</h2><div className="price-inputs"><label>Min ₹<input inputMode="numeric" value={query.minPrice ?? ''} onChange={(event) => update('minPrice', event.target.value)} /></label><label>Max ₹<input inputMode="numeric" value={query.maxPrice ?? ''} onChange={(event) => update('maxPrice', event.target.value)} /></label></div></div>
          <div className="filter-group"><label className="switch-row"><input type="checkbox" checked={Boolean(query.available)} onChange={(event) => update('available', event.target.checked ? 'true' : undefined)} /> In-stock products only</label></div>
          <button className="text-button" type="button" onClick={clearFilters}>Clear all filters</button>
        </aside>
        <section className="catalogue-results" aria-live="polite">
          {products.isLoading && <LoadingState label="Loading products" />}
          {products.isError && <ErrorState message="Products could not be loaded. Check your connection and try again." onRetry={() => void products.refetch()} />}
          {products.data?.items.length === 0 && <EmptyState title="No products found" message="Try changing your search or removing a filter." action={<button className="button button--secondary" onClick={clearFilters}><Search size={17} /> Clear filters</button>} />}
          {products.data && products.data.items.length > 0 && <><ProductGrid products={products.data.items} /><nav className="pagination" aria-label="Product pages"><button type="button" disabled={query.page <= 1} onClick={() => update('page', String(query.page - 1))}>Previous</button><span>Page {query.page} of {products.data.meta.totalPages}</span><button type="button" disabled={query.page >= products.data.meta.totalPages} onClick={() => update('page', String(query.page + 1))}>Next</button></nav></>}
        </section>
      </div>
    </div>
  );
}
