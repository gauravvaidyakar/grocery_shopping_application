import type { Product } from '../../api/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  return <div className={`product-grid ${compact ? 'product-grid--compact' : ''}`}>{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
