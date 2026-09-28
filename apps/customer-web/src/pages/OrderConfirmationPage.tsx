import { CalendarDays, Check, IndianRupee, MapPin, PackageCheck, ReceiptText, Truck, WalletCards } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { formatMoney } from '../components/ui/format';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useOrder } from '../features/orders/hooks';

export function OrderConfirmationPage() {
  const { orderId = '' } = useParams();
  const order = useOrder(orderId);
  if (order.isLoading) return <div className="page shell"><LoadingState label="Confirming your order" /></div>;
  if (order.isError) return <div className="page shell"><ErrorState message={getErrorMessage(order.error)} onRetry={() => void order.refetch()} /></div>;
  if (!order.data) return <div className="page shell"><EmptyState title="Order confirmation unavailable" message="Open the order from My Orders and try again." action={<Link className="button button--primary" to="/orders">My orders</Link>} /></div>;

  const value = order.data;
  const paymentMessage = value.paymentMethod === 'COD'
    ? 'Cash on delivery selected. Pay when your order arrives.'
    : value.paymentStatus === 'PAID'
      ? 'Your online payment has been securely verified.'
      : 'Your order is saved while payment verification completes.';
  const address = value.deliveryAddress;

  return <main className="page shell confirmation-page">
    <section className="confirmation-card" aria-labelledby="confirmation-title">
      <header className="confirmation-success">
        <div className="confirmation-check" aria-hidden="true"><Check /></div>
        <span className="eyebrow">Order received</span>
        <h1 id="confirmation-title">Thank you! Your order is confirmed.</h1>
        <p className="confirmation-reference"><ReceiptText aria-hidden="true" /> Master order <strong>#{value.masterOrderNumber}</strong></p>
        <p className="confirmation-message">{paymentMessage}</p>
      </header>

      <section className="confirmation-summary" aria-label="Order summary">
        <div><CalendarDays aria-hidden="true" /><span>Placed on</span><strong>{new Date(value.placedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
        <div><IndianRupee aria-hidden="true" /><span>Order total</span><strong>{formatMoney(value.payableTotal)}</strong></div>
        <div><WalletCards aria-hidden="true" /><span>Payment</span><StatusBadge status={value.paymentStatus} /></div>
      </section>
    </section>

    <section className="confirmation-delivery">
      <MapPin aria-hidden="true" />
      <div><span>Delivering to</span><strong>{address.recipientName}</strong><p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} — {address.pincode}</p></div>
    </section>

    <section className="confirmation-orders" aria-labelledby="sub-orders-title">
      <div className="confirmation-section-heading"><div><span className="eyebrow">Fulfilment details</span><h2 id="sub-orders-title">Vendor-wise sub-orders</h2></div><p>{value.vendorOrders.length} independent shipment{value.vendorOrders.length === 1 ? '' : 's'}</p></div>
      {value.vendorOrders.map((vendorOrder) => <article key={vendorOrder.id}>
        <div className="confirmation-order-icon"><PackageCheck aria-hidden="true" /></div>
        <div className="confirmation-order-copy">
          <span>Sold and fulfilled by</span>
          <strong>{vendorOrder.vendor.name}</strong>
          <small>Order #{vendorOrder.vendorOrderNumber ?? vendorOrder.id}</small>
          <p>{vendorOrder.items.length} item{vendorOrder.items.length === 1 ? '' : 's'} · {vendorOrder.estimatedDelivery ?? 'Delivery estimate pending'}</p>
          {vendorOrder.shipment && <p className="confirmation-shipment"><Truck size={14} /> {vendorOrder.shipment.statusLabel}{vendorOrder.shipment.awb ? ` · AWB ${vendorOrder.shipment.awb}` : ''}</p>}
        </div>
        <div className="confirmation-order-total"><StatusBadge status={vendorOrder.status} /><strong>{formatMoney(vendorOrder.orderTotal)}</strong></div>
      </article>)}
    </section>

    <div className="confirmation-actions"><Link className="button button--primary" to={`/orders/${value.masterOrderId}`}>View order details</Link><Link className="button button--secondary" to="/products">Continue shopping</Link></div>
  </main>;
}
