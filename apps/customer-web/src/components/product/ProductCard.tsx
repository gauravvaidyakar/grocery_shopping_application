import { Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Product } from '../../api/types';
import { getErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/AuthProvider';
import { useAddToCart } from '../../features/cart/hooks';
import { discountPercentage, formatMoney } from '../ui/format';

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const discount = discountPercentage(product.price, product.mrp);
  const outOfStock = product.stockStatus === 'OUT_OF_STOCK';

  const add = async () => {
    if (!isAuthenticated) {
      void navigate('/login', { state: { from: location.pathname } });
      return;
    }
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: 1 });
      setNotice(`${product.name} added to cart.`);
    } catch (error) {
      setNotice(getErrorMessage(error));
    }
  };

  return (
    <article className="product-card">
      <Link className="product-card-image" to={`/products/${product.id}`}>
        {product.images[0] ? <img src={product.images[0]} alt={product.name} width="640" height="480" loading="lazy" decoding="async" /> : <span className="product-image-empty" aria-label="No product image available">No image</span>}
        {discount !== null && <span className="discount-badge">{discount}% off</span>}
        {outOfStock && <span className="stock-overlay">Out of stock</span>}
      </Link>
      <div className="product-card-body">
        <div className="rating"><Star size={14} fill="currentColor" aria-hidden="true" /><span>{product.rating}</span><span className="muted">({product.reviewCount})</span></div>
        <Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link>
        <p className="product-meta">{product.weight} · {product.vendor.name}</p>
        <div className="product-card-purchase">
          <div className="product-price"><strong>{formatMoney(product.price)}</strong>{product.mrp && <del>{formatMoney(product.mrp)}</del>}<small>GST incl.</small></div>
          <button
            className="add-button"
            type="button"
            disabled={outOfStock || addToCart.isPending}
            aria-label={addToCart.isPending ? `Adding ${product.name} to cart` : outOfStock ? `${product.name} is unavailable` : `Add ${product.name} to cart`}
            title={outOfStock ? 'Out of stock' : 'Add to cart'}
            onClick={() => void add()}
          >
            <Plus aria-hidden="true" />
          </button>
        </div>
        {notice && <p className={addToCart.isError ? 'product-notice form-error' : 'product-notice'} role="status" aria-live="polite">{notice}</p>}
      </div>
    </article>
  );
}
