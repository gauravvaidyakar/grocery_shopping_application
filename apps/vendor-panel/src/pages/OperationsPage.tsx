import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { AsyncState, Status } from "../components/AsyncState";
import { PageHead } from "./DashboardPage";
interface ReturnRow {
  id: string;
  reason: string;
  resolution: string;
  status: string;
  requestedAt: string;
  evidence: unknown;
  orderItem: {
    product: { name: string };
    vendorOrder: { vendorOrderNumber: string };
    replacement?: { status: string };
  };
}
interface Replacement {
  id: string;
  reason: string;
  status: string;
  trackingReference?: string;
  orderItem: {
    product: { name: string };
    vendorOrder: { vendorOrderNumber: string };
  };
}
interface Review {
  id: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  product: { name: string };
  customer: { firstName: string };
}
export function OperationsPage() {
  const returns = useQuery({
    queryKey: ["vendor-returns"],
    queryFn: () => api.get<ReturnRow[]>("/vendor/returns"),
  });
  const replacements = useQuery({
    queryKey: ["vendor-replacements"],
    queryFn: () => api.get<Replacement[]>("/replacements/vendor/all"),
  });
  const reviews = useQuery({
    queryKey: ["vendor-reviews"],
    queryFn: () => api.get<Review[]>("/vendor/reviews"),
  });
  return (
    <>
      <PageHead
        eyebrow="After-sales"
        title="Returns, replacements & reviews"
        subtitle="Customer requests and moderation statuses are read from backend workflows."
      />
      <div className="dashboard-grid">
        <section className="card">
          <h2>Return requests</h2>
          <AsyncState
            loading={returns.isLoading}
            error={returns.error}
            empty={!returns.data?.length}
            onRetry={() => void returns.refetch()}
          >
            {returns.data?.map((r) => (
              <article className="list-card" key={r.id}>
                <div>
                  <strong>{r.orderItem.product.name}</strong>
                  <span>{r.orderItem.vendorOrder.vendorOrderNumber}</span>
                </div>
                <Status value={r.status} />
                <p>{r.reason}</p>
                <small>
                  Requested{" "}
                  {new Date(r.requestedAt).toLocaleDateString("en-IN")} ·
                  Customer chose {r.resolution}
                </small>
              </article>
            ))}
          </AsyncState>
        </section>
        <section className="card">
          <h2>Replacements</h2>
          <AsyncState
            loading={replacements.isLoading}
            error={replacements.error}
            empty={!replacements.data?.length}
            onRetry={() => void replacements.refetch()}
          >
            {replacements.data?.map((r) => (
              <article className="list-card" key={r.id}>
                <div>
                  <strong>{r.orderItem.product.name}</strong>
                  <span>{r.orderItem.vendorOrder.vendorOrderNumber}</span>
                </div>
                <Status value={r.status} />
                <p>{r.reason}</p>
                {r.trackingReference && (
                  <small>Tracking: {r.trackingReference}</small>
                )}
              </article>
            ))}
          </AsyncState>
        </section>
      </div>
      <section className="card">
        <h2>Customer reviews</h2>
        <AsyncState
          loading={reviews.isLoading}
          error={reviews.error}
          empty={!reviews.data?.length}
          onRetry={() => void reviews.refetch()}
        >
          <div className="review-grid">
            {reviews.data?.map((r) => (
              <article className="list-card" key={r.id}>
                <div>
                  <strong>{r.product.name}</strong>
                  <Status value={r.status} />
                </div>
                <span className="stars">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
                <p>{r.comment}</p>
                <small>
                  {r.customer.firstName} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </small>
              </article>
            ))}
          </div>
        </AsyncState>
      </section>
    </>
  );
}
