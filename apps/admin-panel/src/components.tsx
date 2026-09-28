import type { ReactNode } from "react";
export function Status({ value }: { value: string }) {
  return (
    <span className={`status s-${value.toLowerCase()}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function Async({
  query,
  empty,
  children,
}: {
  query: { isLoading: boolean; error: Error | null; refetch: () => unknown };
  empty?: boolean;
  children: ReactNode;
}) {
  if (query.isLoading)
    return (
      <div className="state">
        <i />
        Loading marketplace data…
      </div>
    );
  if (query.error)
    return (
      <div className="state error">
        <strong>Unable to load this page</strong>
        <span>{query.error.message}</span>
        <button onClick={() => query.refetch()}>Retry</button>
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <strong>No records found</strong>
        <span>Try changing the filters or check back later.</span>
      </div>
    );
  return <>{children}</>;
}
export function Head({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
export function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {Math.max(total, 1)}
      </span>
      <button disabled={page >= total} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
