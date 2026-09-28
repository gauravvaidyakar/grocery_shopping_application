import { ArrowLeft, Clock3, ExternalLink, MapPin, PackageSearch, RefreshCw, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { Shipment, VendorOrder } from '../api/types';
import { getErrorMessage } from '../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useOrder, useShipmentTracking } from '../features/orders/hooks';

const trackingDate = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const deliveryEstimate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { dateStyle: 'medium' });
};

function ShipmentTrackingCard({ vendorOrder, initial }: { vendorOrder: VendorOrder; initial: Shipment }) {
  const tracking = useShipmentTracking(initial.id);
  const shipment = tracking.data ?? initial;
  const events = [...shipment.events].reverse();
  return <article className="tracking-card">
    <header>
      <div><span>{vendorOrder.vendor.name}</span><h2>{shipment.carrier ?? shipment.provider}</h2><p>Vendor order #{vendorOrder.vendorOrderNumber ?? vendorOrder.id}</p></div>
      <StatusBadge status={shipment.status} />
    </header>
    <div className="tracking-identifiers"><span><strong>AWB</strong>{shipment.awb ?? 'Pending assignment'}</span>{shipment.estimatedDelivery && <span><strong>Estimated delivery</strong>{deliveryEstimate(shipment.estimatedDelivery)}</span>}</div>
    {tracking.isError && <ErrorState message={getErrorMessage(tracking.error)} onRetry={() => void tracking.refetch()} />}
    <div className="tracking-actions">
      <span>Updated {trackingDate(shipment.updatedAt)}</span>
      <button className="text-button" type="button" disabled={tracking.isFetching} onClick={() => void tracking.refetch()}><RefreshCw className={tracking.isFetching ? 'is-spinning' : ''} size={15} /> {tracking.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      {shipment.trackingUrl && <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Carrier tracking <ExternalLink size={14} /></a>}
    </div>
    {events.length > 0 ? <ol className="tracking-timeline">{events.map((event, index) => <li className={index === 0 ? 'current' : ''} key={event.id}><span /><div><strong>{event.label}</strong>{event.location && <small><MapPin size={13} /> {event.location}</small>}<time>{trackingDate(event.occurredAt)}</time></div></li>)}</ol> : <div className="tracking-awaiting"><Clock3 /><div><strong>Waiting for the first carrier update</strong><p>The shipment exists, but the carrier has not returned a tracking event yet.</p></div></div>}
  </article>;
}

function ShipmentPendingCard({ vendorOrder }: { vendorOrder: VendorOrder }) {
  const cancelled = vendorOrder.status === 'CANCELLED';
  return <article className="tracking-card tracking-card--pending"><header><div><span>{vendorOrder.vendor.name}</span><h2>{cancelled ? 'Shipment cancelled' : 'Preparing your shipment'}</h2><p>Vendor order #{vendorOrder.vendorOrderNumber ?? vendorOrder.id}</p></div><StatusBadge status={vendorOrder.status} /></header><div className="tracking-awaiting"><PackageSearch /><div><strong>{cancelled ? 'No carrier tracking is expected' : 'AWB and tracking are not available yet'}</strong><p>{cancelled ? 'This vendor order was cancelled before a shipment was created.' : 'This vendor is preparing the order. Tracking will appear automatically after the backend creates its shipment.'}</p></div></div></article>;
}

export function TrackingPage() {
  const { orderId = '' } = useParams();
  const order = useOrder(orderId, 30_000);
  if (order.isLoading) return <div className="page shell"><LoadingState label="Loading shipment tracking" /></div>;
  if (order.isError) return <div className="page shell"><ErrorState message={getErrorMessage(order.error)} onRetry={() => void order.refetch()} /></div>;
  if (!order.data) return <div className="page shell"><EmptyState title="Order not found" message="Tracking is unavailable for this order." action={<Link className="button button--secondary" to="/orders">Back to my orders</Link>} /></div>;
  const shippedCount = order.data.vendorOrders.filter((vendorOrder) => vendorOrder.shipment).length;
  return <main className="page shell tracking-page">
    <Link className="back-link" to={`/orders/${orderId}`}><ArrowLeft size={17} /> Back to order</Link>
    <div className="page-heading"><div><span className="eyebrow">Vendor-wise delivery</span><h1>Track order #{order.data.masterOrderNumber}</h1><p>Each vendor shipment progresses independently. This page refreshes automatically every 30 seconds.</p></div><button className="button button--secondary" type="button" disabled={order.isFetching} onClick={() => void order.refetch()}><RefreshCw className={order.isFetching ? 'is-spinning' : ''} size={17} /> {order.isFetching ? 'Refreshing…' : 'Refresh all'}</button></div>
    <div className="tracking-overview"><Truck /><div><strong>{shippedCount} of {order.data.vendorOrders.length} shipment{order.data.vendorOrders.length === 1 ? '' : 's'} created</strong><span>AWB and carrier events are supplied by the shipping backend.</span></div></div>
    <div className="tracking-grid">{order.data.vendorOrders.map((vendorOrder) => vendorOrder.shipment ? <ShipmentTrackingCard key={vendorOrder.id} vendorOrder={vendorOrder} initial={vendorOrder.shipment} /> : <ShipmentPendingCard key={vendorOrder.id} vendorOrder={vendorOrder} />)}</div>
  </main>;
}
