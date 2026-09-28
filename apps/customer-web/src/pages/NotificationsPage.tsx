import { useQuery } from '@tanstack/react-query';
import { Bell, Clock3 } from 'lucide-react';
import { marketplaceApi } from '../api';
import { getErrorMessage } from '../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { StatusBadge } from '../components/ui/StatusBadge';

function readable(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function NotificationsPage() {
  const query = useQuery({ queryKey: ['customer-notifications'], queryFn: () => marketplaceApi.getNotifications() });

  return (
    <main className="page shell">
      <div className="page-heading"><div><span className="eyebrow">Account updates</span><h1>Notifications</h1><p>Order, payment, shipment, return and complaint updates sent by Vishwaneed.</p></div></div>
      {query.isLoading && <LoadingState label="Loading notifications" />}
      {query.isError && <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No notifications yet" message="Important marketplace updates will appear here." />}
      {query.data && query.data.length > 0 && <div className="customer-notification-list">{query.data.map((notification) => {
        const details = Object.entries(notification.payload).map(([key, value]) => [key.replaceAll('_', ' '), readable(value)] as const).filter(([, value]) => value);
        return <article key={notification.id}><Bell aria-hidden="true" /><div><div className="customer-notification-head"><h2>{notification.templateKey.replaceAll('_', ' ')}</h2><StatusBadge status={notification.status} /></div>{details.length > 0 && <p>{details.map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>}<time dateTime={notification.createdAt}><Clock3 aria-hidden="true" /> {new Date(notification.createdAt).toLocaleString('en-IN')}</time>{notification.failureReason && <small className="form-error">{notification.failureReason}</small>}</div></article>;
      })}</div>}
    </main>
  );
}
