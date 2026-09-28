import type { ReactNode } from "react";
export function AsyncState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty?: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="state">
        <span className="spinner" />
        Loading your business data…
      </div>
    );
  if (error)
    return (
      <div className="state state-error">
        <strong>We could not load this page.</strong>
        <span>{error.message}</span>
        <button onClick={onRetry}>Retry</button>
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <strong>Nothing here yet</strong>
        <span>Your data will appear here when it becomes available.</span>
      </div>
    );
  return <>{children}</>;
}
export const Status = ({ value }: { value: string }) => (
  <span className={`status status-${value.toLowerCase()}`}>
    {value.replaceAll("_", " ")}
  </span>
);
