import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, PackageCheck, Search, Truck, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { api, money, type VendorOrder } from "../api/client";
import { AsyncState, Status } from "../components/AsyncState";
import { PageHead } from "./DashboardPage";
const next: Record<string, string | undefined> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "DELIVERED",
};
export function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<{
    orderId: string;
    itemId: string;
    productName: string;
  }>();
  const [cancellationReason, setCancellationReason] = useState("");
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<VendorOrder[]>("/vendor/orders"),
  });
  const mutate = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) =>
      api.post(path, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orders"] }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/vendor/orders/${id}/status`, { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orders"] }),
  });
  const cancelMutation = useMutation({
    mutationFn: ({ orderId, itemId, reason }: { orderId: string; itemId: string; reason: string }) =>
      api.post(`/vendor/orders/${orderId}/cancel-item/${itemId}`, { reason }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["orders"] });
      setCancelTarget(undefined);
      setCancellationReason("");
    },
  });
  const rows = useMemo(
    () =>
      query.data?.filter(
        (o) =>
          (!filter || o.status === filter) &&
          (!search ||
            o.vendorOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
            o.masterOrder.orderNumber
              .toLowerCase()
              .includes(search.toLowerCase())),
      ) ?? [],
    [query.data, filter, search],
  );
  return (
    <>
      <PageHead
        eyebrow="Fulfilment"
        title="Vendor orders"
        subtitle="Only your vendor-order split is returned by the backend. Customer data is limited to delivery fulfilment."
      />
      <div className="toolbar">
        <label>
          <Search />
          <input
            placeholder="Search order number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(next)
            .concat(["DELIVERED", "CANCELLED"])
            .map((s) => (
              <option key={s}>{s}</option>
            ))}
        </select>
      </div>
      <AsyncState
        loading={query.isLoading}
        error={query.error}
        empty={!rows.length}
        onRetry={() => void query.refetch()}
      >
        <div className="orders">
          {rows.map((order) => (
            <article className="card order" key={order.id}>
              <header>
                <div>
                  <small>VENDOR ORDER</small>
                  <h2>{order.vendorOrderNumber}</h2>
                  <span>
                    Master: {order.masterOrder.orderNumber} ·{" "}
                    {new Date(order.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <Status value={order.status} />
              </header>
              <div className="order-body">
                <div className="order-items">
                  {order.items.map((item) => (
                    <div key={item.id}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span>
                          {item.quantity} × {money(item.unitPrice)}
                        </span>
                        <Status value={item.status} />
                      </div>
                      <strong>{money(item.lineTotal)}</strong>
                      {item.cancellable && (
                        <button
                          type="button"
                          className="cancel-item-button"
                          aria-label={`Cancel ${item.productName}`}
                          onClick={() => {
                            cancelMutation.reset();
                            setCancellationReason("");
                            setCancelTarget({
                              orderId: order.id,
                              itemId: item.id,
                              productName: item.productName,
                            });
                          }}
                        >
                          <XCircle aria-hidden="true" />
                          <span>Cancel item</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <aside>
                  <span>
                    Products <strong>{money(order.productSubtotal)}</strong>
                  </span>
                  <span>
                    Shipping <strong>{money(order.shippingAmount)}</strong>
                  </span>
                  <span>
                    Total <strong>{money(order.orderTotal)}</strong>
                  </span>
                  <div className="address">
                    <small>DELIVER TO</small>
                    <p>
                      {Object.values(order.masterOrder.deliveryAddressSnapshot)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </aside>
              </div>
              <footer>
                {order.shipment ? (
                  <div>
                    <Truck />
                    <span>
                      Shipment: <Status value={order.shipment.status} />{" "}
                      {order.shipment.awb && <>· AWB {order.shipment.awb}</>}
                    </span>
                    {order.shipment.trackingUrl && (
                      <a
                        href={order.shipment.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Track
                      </a>
                    )}
                  </div>
                ) : order.status === "PACKED" ? (
                  <button
                    onClick={() =>
                      mutate.mutate({
                        path: `/shipments/vendor-orders/${order.id}`,
                      })
                    }
                  >
                    <Truck />
                    Create Shiprocket shipment
                  </button>
                ) : (
                  <span className="muted">
                    Shipment becomes available when packed.
                  </span>
                )}
                {next[order.status] && (
                  <button
                    className="primary"
                    onClick={() =>
                      statusMutation.mutate({
                        id: order.id,
                        status: next[order.status]!,
                      })
                    }
                  >
                    <PackageCheck />
                    Mark {next[order.status]!.replaceAll("_", " ")}
                  </button>
                )}
              </footer>
            </article>
          ))}
        </div>
      </AsyncState>
      {cancelTarget && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal cancel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-item-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close cancellation dialog"
              disabled={cancelMutation.isPending}
              onClick={() => setCancelTarget(undefined)}
            >
              <X aria-hidden="true" />
            </button>
            <div className="cancel-dialog__heading">
              <span><AlertTriangle aria-hidden="true" /></span>
              <div>
                <small>ITEM-LEVEL CANCELLATION</small>
                <h2 id="cancel-item-title">Cancel {cancelTarget.productName}?</h2>
              </div>
            </div>
            <p>
              Only this item will be cancelled. The customer’s other vendor
              orders and items will not be affected.
            </p>
            <label className="cancel-dialog__reason">
              Cancellation reason
              <textarea
                autoFocus
                rows={4}
                maxLength={500}
                placeholder="Explain why this item cannot be fulfilled"
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
              />
              <small>{cancellationReason.trim().length}/500 characters</small>
            </label>
            {cancelMutation.isError && (
              <p className="form-error" role="alert">
                {cancelMutation.error instanceof Error
                  ? cancelMutation.error.message
                  : "The item could not be cancelled. Please try again."}
              </p>
            )}
            <div className="cancel-dialog__actions">
              <button
                type="button"
                className="secondary"
                disabled={cancelMutation.isPending}
                onClick={() => setCancelTarget(undefined)}
              >
                Keep item
              </button>
              <button
                type="button"
                className="cancel-confirm-button"
                disabled={
                  cancelMutation.isPending || !cancellationReason.trim()
                }
                onClick={() =>
                  cancelMutation.mutate({
                    orderId: cancelTarget.orderId,
                    itemId: cancelTarget.itemId,
                    reason: cancellationReason.trim(),
                  })
                }
              >
                <XCircle aria-hidden="true" />
                {cancelMutation.isPending ? "Cancelling…" : "Confirm cancellation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
