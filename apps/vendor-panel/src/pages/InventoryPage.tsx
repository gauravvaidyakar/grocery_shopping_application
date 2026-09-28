import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { api, type Inventory } from "../api/client";
import { AsyncState, Status } from "../components/AsyncState";
import { PageHead } from "./DashboardPage";
interface Tx {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  notes?: string;
  createdAt: string;
}
export function InventoryPage() {
  const qc = useQueryClient();
  const [history, setHistory] = useState<string>();
  const query = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.get<Inventory[]>("/vendor/inventory"),
  });
  const historyQuery = useQuery({
    queryKey: ["inventory-history", history],
    queryFn: () => api.get<Tx[]>(`/vendor/inventory/${history}/history`),
    enabled: !!history,
  });
  const [values, setValues] = useState<
    Record<string, { quantity: string; reason: string }>
  >({});
  const adjust = useMutation({
    mutationFn: ({
      id,
      quantity,
      reason,
    }: {
      id: string;
      quantity: number;
      reason: string;
    }) => api.patch(`/vendor/inventory/${id}`, { quantity, reason }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
  return (
    <>
      <PageHead
        eyebrow="Stock control"
        title="Inventory"
        subtitle="Available stock is quantity minus backend-reserved units; adjustments cannot reduce stock below reservations."
      />
      <AsyncState
        loading={query.isLoading}
        error={query.error}
        empty={!query.data?.length}
        onRetry={() => void query.refetch()}
      >
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Current</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Adjustment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.map((i) => {
                const v = values[i.productId] ?? { quantity: "", reason: "" };
                const available = i.quantity - i.reserved;
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.product.name}</strong>
                    </td>
                    <td>
                      <Status
                        value={
                          available <= i.lowStockThreshold
                            ? "LOW_STOCK"
                            : "HEALTHY"
                        }
                      />
                    </td>
                    <td>{i.quantity}</td>
                    <td>{i.reserved}</td>
                    <td>
                      <strong>{available}</strong>
                    </td>
                    <td>
                      <div className="adjust">
                        <input
                          aria-label="Adjustment"
                          type="number"
                          value={v.quantity}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              [i.productId]: { ...v, quantity: e.target.value },
                            })
                          }
                        />
                        <input
                          aria-label="Reason"
                          placeholder="Reason"
                          value={v.reason}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              [i.productId]: { ...v, reason: e.target.value },
                            })
                          }
                        />
                        <button
                          disabled={!v.quantity || !v.reason}
                          onClick={() =>
                            adjust.mutate({
                              id: i.productId,
                              quantity: Number(v.quantity),
                              reason: v.reason,
                            })
                          }
                        >
                          {Number(v.quantity) < 0 ? <Minus /> : <Plus />}Apply
                        </button>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => setHistory(i.productId)}>
                        <History />
                        History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AsyncState>
      {history && (
        <section className="card">
          <div className="section-title">
            <h2>Inventory history</h2>
            <button onClick={() => setHistory(undefined)}>Close</button>
          </div>
          <AsyncState
            loading={historyQuery.isLoading}
            error={historyQuery.error}
            empty={!historyQuery.data?.length}
            onRetry={() => void historyQuery.refetch()}
          >
            {historyQuery.data?.map((t) => (
              <div className="ledger-row" key={t.id}>
                <span>{new Date(t.createdAt).toLocaleString("en-IN")}</span>
                <strong>{t.type}</strong>
                <span>
                  {t.quantity > 0 ? "+" : ""}
                  {t.quantity}
                </span>
                <span>Balance {t.balanceAfter}</span>
                <small>{t.notes}</small>
              </div>
            ))}
          </AsyncState>
        </section>
      )}
    </>
  );
}
