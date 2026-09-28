import { AlertTriangle, PackageOpen, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="async-state" role="status"><span className="spinner" aria-hidden="true" /><span>{label}…</span></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="async-state async-state--error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div><strong>We couldn’t load this right now.</strong><p>{message}</p></div>
      {onRetry && <button className="button button--secondary" type="button" onClick={onRetry}><RefreshCw size={17} /> Try again</button>}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="async-state async-state--empty"><PackageOpen size={42} aria-hidden="true" /><div><strong>{title}</strong><p>{message}</p></div>{action}</div>;
}
