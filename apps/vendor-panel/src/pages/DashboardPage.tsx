import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ClipboardCheck,
  IndianRupee,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  Star,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  api,
  money,
  type VendorOrder,
  type VendorProfile,
} from "../api/client";
import { AsyncState, Status } from "../components/AsyncState";

interface Dashboard {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnRequests: number;
  reviewCount: number;
  complaintCount: number;
  totalSales: string | number;
  totalCommission: string | number;
  netSettlement: string | number;
  pendingSettlement: string | number;
  settledAmount: string | number;
  recentOrders: VendorOrder[];
}

export function DashboardPage() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<Dashboard>("/vendor/dashboard"),
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<VendorProfile>("/vendor/profile"),
  });
  const metrics: Array<[string | number, string, LucideIcon]> = dashboard.data
    ? [
        [dashboard.data.totalProducts, "Products", Boxes],
        [dashboard.data.totalOrders, "Total orders", ClipboardCheck],
        [dashboard.data.todayOrders, "New today", PackageCheck],
        [dashboard.data.pendingOrders, "Orders to process", ClipboardCheck],
        [dashboard.data.deliveredOrders, "Completed orders", PackageCheck],
        [dashboard.data.cancelledOrders, "Cancelled orders", RotateCcw],
        [dashboard.data.lowStockProducts, "Low stock", AlertTriangle],
        [dashboard.data.returnRequests, "Return requests", RotateCcw],
        [dashboard.data.reviewCount, "Reviews", Star],
        [dashboard.data.complaintCount, "Complaints", MessageSquare],
        [money(dashboard.data.totalSales), "Delivered sales", IndianRupee],
        [money(dashboard.data.totalCommission), "Commission", ArrowUpRight],
        [money(dashboard.data.netSettlement), "Net settlement", WalletCards],
        [
          money(dashboard.data.pendingSettlement),
          "Pending settlement",
          WalletCards,
        ],
        [money(dashboard.data.settledAmount), "Settled", PackageCheck],
      ]
    : [];
  return (
    <>
      <PageHead
        eyebrow="Overview"
        title="Your business at a glance"
        subtitle="Live operational and financial figures from Vishwaneed."
      />
      <AsyncState
        loading={dashboard.isLoading}
        error={dashboard.error}
        onRetry={() => void dashboard.refetch()}
      >
        {dashboard.data && (
          <>
            <div className="metrics dashboard-metrics">
              {metrics.map(([value, label, Icon]) => (
                <article className="metric" key={label}>
                  <Icon />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="card dashboard-orders">
                <div className="section-title">
                  <div>
                    <small>FULFILMENT</small>
                    <h2>Recent vendor orders</h2>
                  </div>
                </div>
                {dashboard.data.recentOrders.length === 0 ? (
                  <p className="muted">No orders yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Placed</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.data.recentOrders.map((order) => (
                          <tr key={order.id}>
                            <td data-label="Order">
                              <strong>{order.vendorOrderNumber}</strong>
                            </td>
                            <td data-label="Placed">
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-IN",
                              )}
                            </td>
                            <td data-label="Items">{order.items.length}</td>
                            <td data-label="Total">
                              {money(order.orderTotal)}
                            </td>
                            <td data-label="Status">
                              <Status value={order.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <section className="card readiness dashboard-readiness">
                <small>ACCOUNT READINESS</small>
                <h2>{profile.data?.businessName ?? "Vendor profile"}</h2>
                <div className="readiness-row">
                  <span>KYC</span>
                  <Status value={profile.data?.status ?? "LOADING"} />
                </div>
                <div className="readiness-row">
                  <span>Documents</span>
                  <strong>
                    {profile.data?.documents.filter(
                      (document) => document.status === "APPROVED",
                    ).length ?? 0}
                    /{profile.data?.documents.length ?? 0} approved
                  </strong>
                </div>
                <div className="readiness-row">
                  <span>Inspection</span>
                  <Status
                    value={
                      profile.data?.inspections.at(0)?.status ?? "NOT_SCHEDULED"
                    }
                  />
                </div>
                <p>
                  Product creation is enabled only after backend approval of the
                  vendor account.
                </p>
              </section>
            </div>
          </>
        )}
      </AsyncState>
    </>
  );
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}
