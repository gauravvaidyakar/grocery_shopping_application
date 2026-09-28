import { ArrowRight, Minus, Plus, RefreshCw, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { formatMoney } from '../components/ui/format';
import { useCart, useRefreshCart, useRemoveCartItem, useUpdateCartItem } from '../features/cart/hooks';

function issueMessage(issue: string): string {
  if (issue === 'OUT_OF_STOCK') return 'Out of stock — remove this item to continue.';
  if (issue === 'QUANTITY_UNAVAILABLE') return 'The requested quantity is no longer available. Update the quantity to continue.';
  if (issue === 'PRICE_CHANGED') return 'The backend returned an updated price. Review it before checkout.';
  return 'This item needs your attention.';
}

export function CartPage() {
  const cart = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const refresh = useRefreshCart();
  const pending = update.isPending || remove.isPending || refresh.isPending;

  if (cart.isLoading) return <div className="page shell"><LoadingState label="Refreshing your cart" /></div>;
  if (cart.isError || !cart.data) return <div className="page shell"><ErrorState message={getErrorMessage(cart.error)} onRetry={() => void cart.refetch()} /></div>;
  if (!cart.data.itemCount) return <div className="page shell"><EmptyState title="Your cart is empty" message="Explore rural products and add something you’ll love." action={<Link className="button button--primary" to="/products"><ShoppingBag size={18} /> Start shopping</Link>} /></div>;

  const hasIssues = cart.data.groups.some((group) => group.items.some((item) => item.issue));

  return (
    <div className="page shell">
      <div className="page-heading"><div><span className="eyebrow">Your bag</span><h1>Multi-vendor cart</h1><p>{cart.data.itemCount} {cart.data.itemCount === 1 ? 'item' : 'items'} from {cart.data.groups.length} {cart.data.groups.length === 1 ? 'producer' : 'producers'}</p></div><button className="text-button" type="button" disabled={refresh.isPending} onClick={() => refresh.mutate()}><RefreshCw size={16} /> {refresh.isPending ? 'Refreshing…' : 'Refresh prices & stock'}</button></div>
      {refresh.isError && <p className="form-error" role="alert">{getErrorMessage(refresh.error)}</p>}
      <div className="cart-layout">
        <section className="cart-groups">
          {cart.data.groups.map((group) => (
            <article className="cart-group" key={group.vendor.id}>
              <div className="cart-group-head"><div><span>Sold by</span><h2>{group.vendor.name}</h2><p>{group.vendor.location}</p></div><strong>{formatMoney(group.productSubtotal)}</strong></div>
              {group.items.map((item) => <div className="cart-line" key={item.id}><img src={item.product.images[0]} alt={item.product.name} /><div className="cart-line-main"><Link to={`/products/${item.product.slug}`}>{item.product.name}</Link><span>{item.product.weight} · GST-inclusive</span>{item.issue && <p className="inline-error">{issueMessage(item.issue)}</p>}<div className="quantity-control"><button type="button" aria-label={`Decrease ${item.product.name} quantity`} disabled={pending || item.quantity <= 1} onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity - 1 })}><Minus size={15} /></button><span>{item.quantity}</span><button type="button" aria-label={`Increase ${item.product.name} quantity`} disabled={pending || item.quantity >= item.product.availableQuantity || item.issue === 'OUT_OF_STOCK'} onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity + 1 })}><Plus size={15} /></button></div></div><div className="cart-line-price"><strong>{formatMoney(item.currentUnitPrice)}</strong>{item.previousUnitPrice && <del>{formatMoney(item.previousUnitPrice)}</del>}<span>each</span><button type="button" aria-label={`Remove ${item.product.name}`} disabled={pending} onClick={() => remove.mutate(item.id)}><Trash2 size={17} /></button></div></div>)}
              <div className="shipping-pending"><span>Vendor-wise shipping</span><strong>Calculated by backend at checkout</strong></div>
            </article>
          ))}
        </section>
        <aside className="order-summary">
          <h2>Order summary</h2>
          <div><span>Products</span><strong>{formatMoney(cart.data.productSubtotal)}</strong></div>
          <div><span>Shipping</span><strong>At checkout</strong></div>
          <p className="summary-note">The backend will revalidate product price, availability and vendor-wise shipping before you place the order.</p>
          <Link className={`button button--primary button--full ${hasIssues ? 'is-disabled' : ''}`} aria-disabled={hasIssues} to={hasIssues ? '/cart' : '/checkout'}>Proceed to checkout <ArrowRight size={18} /></Link>
          <span className="secure-note"><ShieldCheck size={17} /> No payment is collected on this screen.</span>
        </aside>
      </div>
    </div>
  );
}
