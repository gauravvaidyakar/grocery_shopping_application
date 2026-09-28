import { useQuery } from "@tanstack/react-query";
import { api, money } from "../api/client";
import { AsyncState, Status } from "../components/AsyncState";
import { PageHead } from "./DashboardPage";
interface Commission {
  id: string;
  baseAmount: string;
  percentage: string;
  amount: string;
  createdAt: string;
  orderItem: { productName: string; vendorOrderId: string };
}
interface Ledger {
  id: string;
  type: string;
  direction: string;
  amount: string;
  balanceAfter: string;
  description: string;
  referenceId: string;
  createdAt: string;
}
interface Settlement {
  id: string;
  reference: string;
  amount: string;
  status: string;
  providerReference?: string;
  settledAt?: string;
  createdAt: string;
  items: Array<{
    vendorOrder: {
      vendorOrderNumber: string;
      deliveredAt?: string;
      settlementEligibleAt?: string;
    };
    grossAmount: string;
    commissionAmount: string;
    refundAmount: string;
    settlementAmount: string;
  }>;
}
export function FinancePage() {
  const commission = useQuery({
    queryKey: ["commission"],
    queryFn: () => api.get<Commission[]>("/vendor/commission/transactions"),
  });
  const ledger = useQuery({
    queryKey: ["ledger"],
    queryFn: () => api.get<Ledger[]>("/vendor/ledger"),
  });
  const settlements = useQuery({
    queryKey: ["settlements"],
    queryFn: () => api.get<Settlement[]>("/vendor/settlements"),
  });
  return (
    <>
      <PageHead
        eyebrow="Backend-calculated values"
        title="Commission, ledger & settlements"
        subtitle="Rates, deductions, refund adjustments, eligibility and balances are never calculated in this panel."
      />
      <section className="card">
        <h2>Settlements</h2>
        <AsyncState
          loading={settlements.isLoading}
          error={settlements.error}
          empty={!settlements.data?.length}
          onRetry={() => void settlements.refetch()}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Vendor order</th>
                  <th>Eligible date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payout reference</th>
                </tr>
              </thead>
              <tbody>
                {settlements.data?.flatMap((s) =>
                  s.items.map((i) => (
                    <tr key={i.vendorOrder.vendorOrderNumber}>
                      <td>{s.reference}</td>
                      <td>{i.vendorOrder.vendorOrderNumber}</td>
                      <td>
                        {i.vendorOrder.settlementEligibleAt
                          ? new Date(
                              i.vendorOrder.settlementEligibleAt,
                            ).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>{money(i.settlementAmount)}</td>
                      <td>
                        <Status value={s.status} />
                      </td>
                      <td>{s.providerReference ?? "—"}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </section>
      <div className="dashboard-grid">
        <section className="card">
          <h2>Commission transactions</h2>
          <AsyncState
            loading={commission.isLoading}
            error={commission.error}
            empty={!commission.data?.length}
            onRetry={() => void commission.refetch()}
          >
            {commission.data?.map((c) => (
              <div className="ledger-row" key={c.id}>
                <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                <strong>{c.orderItem.productName}</strong>
                <span>
                  {money(c.baseAmount)} × {c.percentage}%
                </span>
                <strong>− {money(c.amount)}</strong>
              </div>
            ))}
          </AsyncState>
        </section>
        <section className="card">
          <h2>Vendor ledger</h2>
          <AsyncState
            loading={ledger.isLoading}
            error={ledger.error}
            empty={!ledger.data?.length}
            onRetry={() => void ledger.refetch()}
          >
            {ledger.data?.map((l) => (
              <div className="ledger-row" key={l.id}>
                <span>{new Date(l.createdAt).toLocaleDateString("en-IN")}</span>
                <strong>{l.type.replaceAll("_", " ")}</strong>
                <span
                  className={
                    l.direction === "CREDIT" ? "success" : "form-error"
                  }
                >
                  {l.direction === "CREDIT" ? "+" : "−"} {money(l.amount)}
                </span>
                <span>Balance {money(l.balanceAfter)}</span>
                <small>{l.description}</small>
              </div>
            ))}
          </AsyncState>
        </section>
      </div>
    </>
  );
}
