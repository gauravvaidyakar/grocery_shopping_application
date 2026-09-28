import { Package, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderStatus } from '../api/types';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { formatMoney } from '../components/ui/format';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getErrorMessage } from '../api/errors';
import { useOrders } from '../features/orders/hooks';

export function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const orders = useOrders(status ? { status } : {});
  return <div className="page shell"><div className="page-heading"><div><span className="eyebrow">Your purchases</span><h1>My orders</h1><p>One payment can create several independently fulfilled vendor orders.</p></div><label className="compact-field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | '')}><option value="">All orders</option><option value="CONFIRMED">Confirmed</option><option value="SHIPPED">Shipped</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option><option value="RETURN_REQUESTED">Return requested</option></select></label></div>{orders.isLoading && <LoadingState label="Loading your orders" />}{orders.isError && <ErrorState message={getErrorMessage(orders.error)} onRetry={() => void orders.refetch()} />}{orders.data?.items.length === 0 && <EmptyState title="No orders found" message={status ? 'No orders match this status.' : 'Your completed checkouts will appear here.'} action={<Link className="button button--primary" to="/products">Start shopping</Link>} />}{orders.data && orders.data.items.length > 0 && <div className="orders-list">{orders.data.items.map((order) => <article className="order-card" key={order.masterOrderId}><header><div><span>Master order</span><h2>#{order.masterOrderNumber}</h2><small>{new Date(order.placedAt).toLocaleString('en-IN')}</small></div><div className="order-card-status"><StatusBadge status={order.status} /><strong>{formatMoney(order.payableTotal)}</strong></div></header><div className="order-vendor-preview">{order.vendorOrders.map((vendorOrder) => <div key={vendorOrder.id}><Package size={18} /><span><strong>{vendorOrder.vendor.name}</strong><small>{vendorOrder.items.length} item{vendorOrder.items.length === 1 ? '' : 's'}</small></span><StatusBadge status={vendorOrder.status} /></div>)}</div><footer><span><Truck size={17} /> {order.vendorOrders.length} independent vendor shipment{order.vendorOrders.length === 1 ? '' : 's'}</span><Link className="button button--secondary" to={`/orders/${order.masterOrderId}`}>View order</Link></footer></article>)}</div>}</div>;
}
