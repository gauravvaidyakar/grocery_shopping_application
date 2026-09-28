import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  FileClock,
  FileText,
  Gavel,
  Image as ImageIcon,
  Layers3,
  LogOut,
  Menu,
  PackageCheck,
  Pencil,
  ReceiptIndianRupee,
  RefreshCcw,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  WalletCards,
  X,
  Upload,
  Users,
} from "lucide-react";
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { api, assetUrl, money, type Page } from "./api";
import { useAuth } from "./auth";
import { Async, Head, Pager, Status } from "./components";
import { HomeHeroSlides } from "./HomeHeroSlides";
const nav = [
  ["/", "Dashboard", BarChart3],
  ["/vendors", "Vendors & KYC", Building2],
  ["/customers", "Customers", Users],
  ["/products", "Products", ShoppingBag],
  ["/categories", "Categories", Layers3],
  ["/homepage", "Homepage hero", ImageIcon],
  ["/orders", "Orders", PackageCheck],
  ["/payments", "Payments", WalletCards],
  ["/shipments", "Shipments", Truck],
  ["/commission", "Commission", ReceiptIndianRupee],
  ["/ledger", "Vendor ledger", FileText],
  ["/settlements", "Settlements", ClipboardCheck],
  ["/refunds", "Refunds", RefreshCcw],
  ["/returns", "Returns", RotateCcw],
  ["/replacements", "Replacements", Boxes],
  ["/reviews", "Reviews", Star],
  ["/complaints", "Complaints", Gavel],
  ["/notifications", "Notifications", Bell],
  ["/reports", "Reports", BarChart3],
  ["/audit", "Audit logs", FileClock],
  ["/settings", "System status", Settings],
] as const;
class PageBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Admin page rendering failed", error, info.componentStack);
  }
  override render() {
    if (this.state.error)
      return (
        <div className="state error">
          <strong>This page could not be displayed</strong>
          <span>{this.state.error.message}</span>
          <button onClick={() => this.setState({ error: null })}>Retry</button>
          <Link to="/">Return to dashboard</Link>
        </div>
      );
    return this.props.children;
  }
}
function Protected() {
  const { session } = useAuth();
  const location = useLocation();
  return session ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}
function Layout() {
  const [open, setOpen] = useState(false);
  const { session, logout } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeAtDesktop = () => {
      if (window.innerWidth > 900) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeAtDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeAtDesktop);
    };
  }, [open]);
  return (
    <div className="shell">
      <aside className={open ? "open" : ""}>
        <div className="brand">
          <span>V</span>
          <div>
            <strong>Vishwaneed</strong>
            <small>Marketplace administration</small>
          </div>
          <button
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={() => void logout()}>
          <LogOut />
          Sign out
        </button>
      </aside>
      <section className="work">
        <header>
          <button
            className="menu"
            aria-label="Open navigation menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div>
            <small>SECURE ADMIN SESSION</small>
            <strong>{session?.user.email ?? "Administrator"}</strong>
          </div>
        </header>
        <main>
          <PageBoundary key={location.pathname}>
            <Outlet />
          </PageBoundary>
        </main>
      </section>
      {open && (
        <button
          className="admin-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
function Login() {
  const { session, login } = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navTo = useNavigate();
  if (session) return <Navigate to="/" />;
  return (
    <div className="login">
      <section>
        <div className="brand">
          <span>V</span>
          <div>
            <strong>Vishwaneed</strong>
            <small>Control centre</small>
          </div>
        </div>
        <div>
          <small>MARKETPLACE OPERATIONS</small>
          <h1>
            Steward trust.
            <br />
            Scale impact.
          </h1>
          <p>
            Secure oversight for vendors, fulfilment, finance and customer
            experience.
          </p>
        </div>
      </section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void login(id, password)
            .then(() => void navTo("/"))
            .catch((reason: unknown) =>
              setError(
                reason instanceof Error ? reason.message : "Login failed",
              ),
            );
        }}
      >
        <ShieldCheck />
        <h2>Administrator sign in</h2>
        <p>Use your seeded administrator credentials.</p>
        <label>
          Email or mobile
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <span className="form-error">{error}</span>}
        <button className="primary">Sign in securely</button>
      </form>
    </div>
  );
}
interface Dashboard {
  customers: number;
  vendors: number;
  activeVendors: number;
  pendingVendors: number;
  products: number;
  pendingProducts: number;
  orders: number;
  vendorOrders: number;
  sales: string | number;
  commission: string | number;
  revenue: string | number;
  settlements: string | number;
  refunds: string | number;
  complaints: number;
  reviews: number;
  inventory: number;
}
function DashboardPage() {
  const q = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get<Dashboard>("/admin/dashboard"),
  });
  return (
    <>
      <Head
        title="Marketplace overview"
        subtitle="Backend-driven operational metrics and queues requiring attention."
      />
      <Async query={q}>
        {q.data && (
          <div className="metrics">
            {Object.entries(q.data).map(([key, value]) => (
              <article key={key}>
                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        )}
        <div className="grid">
          <section className="card">
            <h2>Approval workflow</h2>
            <p>
              Review KYC and inspection evidence before approving vendors.
              Product approval remains blocked until vendor approval.
            </p>
            <Link className="primary" to="/vendors">
              Review vendor applications
            </Link>
          </section>
          <section className="card">
            <h2>Financial controls</h2>
            <p>
              Commission, refunds and settlements are calculated and persisted
              by the backend.
            </p>
            <Link className="secondary" to="/settlements">
              Open settlements
            </Link>
          </section>
        </div>
      </Async>
    </>
  );
}
interface Vendor {
  id: string;
  businessName: string;
  ownerName: string;
  status: string;
  createdAt: string;
  user: { email?: string; mobile?: string };
  documents?: Array<{
    id: string;
    type: string;
    status: string;
    originalName: string;
    rejectionReason?: string;
  }>;
  bankAccounts?: Array<{
    id: string;
    accountHolderName: string;
    bankName: string;
    accountNumberLast4: string;
    ifsc: string;
    status: string;
  }>;
  inspections?: Array<{
    id: string;
    status: string;
    scheduledAt: string;
    inspectedAt?: string;
    location?: string;
    remarks?: string;
    checklist?: { businessActivityVerified?: boolean };
    inspector?: { email?: string; mobile?: string };
    documentsVerified?: boolean;
    premisesVerified?: boolean;
    qualityVerified?: boolean;
  }>;
  statusHistory?: Array<{
    id: string;
    toStatus: string;
    reason?: string;
    createdAt: string;
  }>;
  _count?: { documents: number; products: number; vendorOrders: number };
}
function VendorsPage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const q = useQuery({
    queryKey: ["admin-vendors", page],
    queryFn: () =>
      api.get<Page<Vendor>>(`/admin/vendors?page=${page}&limit=20`),
  });
  return (
    <>
      <Head
        title="Vendors, KYC & inspections"
        subtitle="Review identity, licences, banking and physical verification before approval."
      />
      <Async query={q} empty={!q.data?.data.length}>
        <Table
          columns={[
            "Business",
            "Owner",
            "Contact",
            "Products",
            "Orders",
            "Status",
            "",
          ]}
          rows={
            q.data?.data.map((v) => [
              v.businessName,
              v.ownerName,
              v.user.email ?? v.user.mobile ?? "—",
              v._count?.products ?? 0,
              v._count?.vendorOrders ?? 0,
              <Status value={v.status} />,
              <button onClick={() => setSelected(v.id)}>Review</button>,
            ]) ?? []
          }
        />
        {q.data && (
          <Pager
            page={page}
            total={q.data.meta.totalPages}
            onChange={setPage}
          />
        )}
      </Async>
      {selected && (
        <VendorDrawer id={selected} close={() => setSelected(undefined)} />
      )}
    </>
  );
}
function VendorDrawer({ id, close }: { id: string; close: () => void }) {
  const qc = useQueryClient();
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [inspectionLocation, setInspectionLocation] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("OTHER");
  const [suspensionDetails, setSuspensionDetails] = useState("");
  const q = useQuery({
    queryKey: ["admin-vendor", id],
    queryFn: () => api.get<Vendor>(`/admin/vendors/${id}`),
  });
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) =>
      api.post(path, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-vendor", id] });
      void qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
  });
  const verify = useMutation({
    mutationFn: ({
      documentId,
      status,
      reason,
    }: {
      documentId: string;
      status: string;
      reason?: string;
    }) =>
      api.patch(`/admin/vendor-documents/${documentId}/verify`, {
        status,
        rejectionReason: reason,
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["admin-vendor", id] }),
  });
  const patch = useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown }) =>
      api.patch(path, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-vendor", id] });
      void qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
  });
  const schedule = useMutation({
    mutationFn: () =>
      api.post(`/admin/vendors/${id}/inspection`, {
        scheduledAt: new Date(scheduledAt).toISOString(),
        location: inspectionLocation.trim(),
        checklist: {},
      }),
    onSuccess: () => {
      setShowSchedule(false);
      setScheduledAt("");
      setInspectionLocation("");
      void qc.invalidateQueries({ queryKey: ["admin-vendor", id] });
      void qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
  });
  const mutationError =
    action.error ?? verify.error ?? patch.error ?? schedule.error;
  const requiredDocuments = [
    "PAN",
    "AADHAAR",
    "GST_CERTIFICATE",
    "FSSAI_LICENSE",
    "CANCELLED_CHEQUE",
    "BUSINESS_REGISTRATION_PROOF",
  ];
  const documentsReady = requiredDocuments.every((type) =>
    q.data?.documents?.some(
      (document) => document.type === type && document.status === "VERIFIED",
    ),
  );
  const bankReady =
    q.data?.bankAccounts?.some((bank) => bank.status === "VERIFIED") ?? false;
  const inspectionReady =
    q.data?.inspections?.some(
      (inspection) =>
        inspection.status === "PASSED" &&
        inspection.documentsVerified &&
        inspection.premisesVerified &&
        inspection.qualityVerified,
    ) ?? false;
  const approvalReady =
    documentsReady &&
    bankReady &&
    inspectionReady &&
    q.data?.status === "PENDING";
  const hasActiveInspection =
    q.data?.inspections?.some((inspection) =>
      ["SCHEDULED", "IN_PROGRESS", "NEEDS_ACTION", "NEEDS_REVIEW"].includes(
        inspection.status,
      ),
    ) ?? false;
  const approvalBlockers = [
    !documentsReady ? "Verify every required KYC document." : undefined,
    !bankReady ? "Verify the vendor bank account." : undefined,
    !inspectionReady
      ? hasActiveInspection
        ? "Complete the physical inspection and mark every required check as verified."
        : "Schedule and pass the physical inspection."
      : undefined,
    inspectionReady && q.data?.status !== "PENDING"
      ? "Refresh the vendor record so its status can move to pending approval."
      : undefined,
  ].filter((message): message is string => Boolean(message));
  return (
    <div className="drawer-bg">
      <aside className="drawer">
        <button className="close" onClick={close}>
          <X />
        </button>
        <Async query={q}>
          {q.data && (
            <>
              <small>VENDOR REVIEW</small>
              <h2>{q.data.businessName}</h2>
              <Status value={q.data.status} />
              <p>
                {q.data.ownerName} · {q.data.user.email ?? q.data.user.mobile}
              </p>
              <h3>KYC documents</h3>
              {q.data.documents?.map((d) => (
                <div className="review-row" key={d.id}>
                  <div>
                    <strong>{d.type.replaceAll("_", " ")}</strong>
                    <small>{d.originalName}</small>
                  </div>
                  <Status value={d.status} />
                  <button
                    onClick={() =>
                      void api
                        .download(
                          `/vendor-documents/${d.id}/download`,
                          d.originalName,
                        )
                        .catch((error: unknown) =>
                          alert(
                            error instanceof Error
                              ? error.message
                              : "Document download failed",
                          ),
                        )
                    }
                  >
                    Download
                  </button>
                  {d.status !== "VERIFIED" && (
                    <>
                      <button
                        onClick={() =>
                          verify.mutate({
                            documentId: d.id,
                            status: "VERIFIED",
                          })
                        }
                      >
                        Verify
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          const reason = prompt("Document rejection reason");
                          if (reason)
                            verify.mutate({
                              documentId: d.id,
                              status: "REJECTED",
                              reason,
                            });
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              ))}
              <h3>Bank verification</h3>
              {q.data.bankAccounts?.length ? (
                q.data.bankAccounts.map((bank) => (
                  <div className="review-row" key={bank.id}>
                    <div>
                      <strong>{bank.bankName}</strong>
                      <small>
                        {bank.accountHolderName} · ••••{bank.accountNumberLast4} ·{" "}
                        {bank.ifsc}
                      </small>
                    </div>
                    <Status value={bank.status} />
                    {bank.status !== "VERIFIED" && (
                      <>
                        <button
                          onClick={() =>
                            patch.mutate({
                              path: `/admin/vendor-bank-accounts/${bank.id}/verify`,
                              body: { status: "VERIFIED" },
                            })
                          }
                        >
                          Verify
                        </button>
                        <button
                          className="danger"
                          onClick={() => {
                            const reason = prompt(
                              "Bank verification rejection reason",
                            );
                            if (reason)
                              patch.mutate({
                                path: `/admin/vendor-bank-accounts/${bank.id}/verify`,
                                body: { status: "REJECTED", reason },
                              });
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="muted">No bank account submitted.</p>
              )}
              <h3>Inspections</h3>
              {q.data.inspections?.length ? (
                q.data.inspections.map((i) => (
                  <InspectionEditor
                    key={i.id}
                    inspection={i}
                    pending={patch.isPending}
                    onSave={(body, onSuccess) =>
                      patch.mutate(
                        {
                          path: `/admin/inspections/${i.id}`,
                          body,
                        },
                        { onSuccess },
                      )
                    }
                  />
                ))
              ) : (
                <p className="muted">No inspection scheduled.</p>
              )}
              {showSchedule && !hasActiveInspection ? (
                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (scheduledAt && inspectionLocation.trim())
                      schedule.mutate();
                  }}
                >
                  <label>
                    Inspection date and time
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                    />
                  </label>
                  <label>
                    Inspection location
                    <input
                      required
                      value={inspectionLocation}
                      onChange={(event) =>
                        setInspectionLocation(event.target.value)
                      }
                    />
                  </label>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowSchedule(false)}>
                      Cancel
                    </button>
                    <button className="primary" disabled={schedule.isPending}>
                      {schedule.isPending ? "Scheduling…" : "Schedule"}
                    </button>
                  </div>
                </form>
              ) : !hasActiveInspection ? (
                <button onClick={() => setShowSchedule(true)}>
                  Schedule inspection
                </button>
              ) : null}
              <h3>Approval readiness</h3>
              <div className="readiness">
                <span>
                  <Status value={documentsReady ? "READY" : "INCOMPLETE"} />
                  Required KYC documents
                </span>
                <span>
                  <Status value={bankReady ? "READY" : "INCOMPLETE"} />
                  Verified bank account
                </span>
                <span>
                  <Status value={inspectionReady ? "READY" : "INCOMPLETE"} />
                  Passed physical inspection
                </span>
              </div>
              <h3>Status history</h3>
              {q.data.statusHistory?.map((h) => (
                <div className="history" key={h.id}>
                  <Status value={h.toStatus} />
                  <span>{h.reason}</span>
                  <time>{new Date(h.createdAt).toLocaleString("en-IN")}</time>
                </div>
              ))}
              {mutationError && (
                <p className="form-error">{mutationError.message}</p>
              )}
              {showSuspend && (
                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    action.mutate(
                      {
                        path: `/admin/vendors/${id}/suspend`,
                        body: {
                          reason: suspensionReason,
                          details: suspensionDetails.trim() || undefined,
                        },
                      },
                      { onSuccess: () => setShowSuspend(false) },
                    );
                  }}
                >
                  <label>
                    Suspension reason
                    <select
                      value={suspensionReason}
                      onChange={(event) =>
                        setSuspensionReason(event.target.value)
                      }
                    >
                      <option value="LICENSE_EXPIRED">License expired</option>
                      <option value="LICENSE_SUSPENDED">License suspended</option>
                      <option value="COUNTERFEIT_PRODUCT">
                        Counterfeit product
                      </option>
                      <option value="REPEATED_QUALITY_COMPLAINTS">
                        Repeated quality complaints
                      </option>
                      <option value="AGREEMENT_BREACH">Agreement breach</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label>
                    Details
                    <textarea
                      value={suspensionDetails}
                      onChange={(event) =>
                        setSuspensionDetails(event.target.value)
                      }
                    />
                  </label>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowSuspend(false)}>
                      Cancel
                    </button>
                    <button className="danger" disabled={action.isPending}>
                      {action.isPending ? "Suspending…" : "Confirm suspension"}
                    </button>
                  </div>
                </form>
              )}
              {!approvalReady &&
                !["APPROVED", "SUSPENDED"].includes(q.data.status) && (
                <div
                  className="approval-guidance"
                  id={`vendor-approval-help-${id}`}
                  role="status"
                >
                  <strong>Approval is locked</strong>
                  <span>{approvalBlockers[0]}</span>
                </div>
                )}
              <footer>
                {q.data.status === "APPROVED" ? (
                  <>
                    <span className="approved-note">Vendor is approved</span>
                    <button className="danger" onClick={() => setShowSuspend(true)}>
                      Suspend
                    </button>
                  </>
                ) : q.data.status === "SUSPENDED" ? (
                  <span className="approved-note">Vendor is suspended</span>
                ) : (
                  <>
                    <button
                      className="danger"
                      onClick={() => {
                        const reason = prompt("Rejection reason");
                        if (reason?.trim())
                          action.mutate({
                            path: `/admin/vendors/${id}/reject`,
                            body: { reason: reason.trim() },
                          });
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className="primary"
                      disabled={!approvalReady || action.isPending}
                      aria-describedby={
                        approvalReady ? undefined : `vendor-approval-help-${id}`
                      }
                      title={
                        approvalReady
                          ? "Approve vendor"
                          : "Complete KYC, bank verification and physical inspection first"
                      }
                      onClick={() =>
                        action.mutate({ path: `/admin/vendors/${id}/approve` })
                      }
                    >
                      {action.isPending ? "Approving…" : "Approve vendor"}
                    </button>
                  </>
                )}
              </footer>
            </>
          )}
        </Async>
      </aside>
    </div>
  );
}
function InspectionEditor({
  inspection,
  pending,
  onSave,
}: {
  inspection: NonNullable<Vendor["inspections"]>[number];
  pending: boolean;
  onSave: (body: Record<string, unknown>, onSuccess?: () => void) => void;
}) {
  const [mode, setMode] = useState<"summary" | "reschedule" | "cancel">(
    "summary",
  );
  const [result, setResult] = useState("PASSED");
  const [remarks, setRemarks] = useState(inspection.remarks ?? "");
  const [rescheduledAt, setRescheduledAt] = useState("");
  const [location, setLocation] = useState(inspection.location ?? "");
  const [documentsVerified, setDocumentsVerified] = useState(
    inspection.documentsVerified ?? false,
  );
  const [premisesVerified, setPremisesVerified] = useState(
    inspection.premisesVerified ?? false,
  );
  const [qualityVerified, setQualityVerified] = useState(
    inspection.qualityVerified ?? false,
  );
  const [businessActivityVerified, setBusinessActivityVerified] = useState(
    inspection.checklist?.businessActivityVerified ?? false,
  );
  const [validation, setValidation] = useState("");
  const verificationPayload = {
    documentsVerified,
    premisesVerified,
    qualityVerified,
    checklist: { businessActivityVerified },
  };

  if (mode === "reschedule") {
    return (
      <form
        className="inspection-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!rescheduledAt || !location.trim()) return;
          onSave(
            {
              status: "SCHEDULED",
              scheduledAt: new Date(rescheduledAt).toISOString(),
              location: location.trim(),
              ...verificationPayload,
            },
            () => setMode("summary"),
          );
        }}
      >
        <InspectionHeading inspection={inspection} />
        <label>
          New inspection date and time
          <input
            type="datetime-local"
            required
            value={rescheduledAt}
            onChange={(event) => setRescheduledAt(event.target.value)}
          />
        </label>
        <label>
          Inspection location
          <input
            required
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <div className="form-actions">
          <button type="button" onClick={() => setMode("summary")}>Back</button>
          <button className="primary" disabled={pending}>
            {pending ? "Saving…" : "Save new schedule"}
          </button>
        </div>
      </form>
    );
  }

  if (mode === "cancel") {
    return (
      <form
        className="inspection-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!remarks.trim()) {
            setValidation("A cancellation reason is required.");
            return;
          }
          onSave(
            {
              status: "CANCELLED",
              remarks: remarks.trim(),
              ...verificationPayload,
            },
            () => setMode("summary"),
          );
        }}
      >
        <InspectionHeading inspection={inspection} />
        <label>
          Cancellation reason
          <textarea
            required
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </label>
        {validation && <p className="form-error">{validation}</p>}
        <div className="form-actions">
          <button type="button" onClick={() => setMode("summary")}>Back</button>
          <button className="danger" disabled={pending}>
            {pending ? "Cancelling…" : "Cancel inspection"}
          </button>
        </div>
      </form>
    );
  }

  if (inspection.status === "SCHEDULED") {
    return (
      <article className="inspection-card">
        <InspectionHeading inspection={inspection} />
        <div className="inspection-status-row">
          <span>Inspection status</span>
          <Status value="SCHEDULED" />
        </div>
        <div className="form-actions inspection-actions">
          <button type="button" onClick={() => setMode("cancel")}>Cancel</button>
          <button type="button" onClick={() => setMode("reschedule")}>
            Reschedule
          </button>
          <button
            type="button"
            className="primary"
            disabled={pending}
            onClick={() =>
              onSave({ status: "IN_PROGRESS", ...verificationPayload })
            }
          >
            {pending ? "Starting…" : "Conduct inspection"}
          </button>
        </div>
      </article>
    );
  }

  if (["NEEDS_ACTION", "NEEDS_REVIEW"].includes(inspection.status)) {
    return (
      <article className="inspection-card">
        <InspectionHeading inspection={inspection} />
        <div className="inspection-status-row">
          <Status value={inspection.status} />
          <span>{inspection.remarks}</span>
        </div>
        <button
          type="button"
          className="primary"
          disabled={pending}
          onClick={() =>
            onSave({ status: "IN_PROGRESS", ...verificationPayload })
          }
        >
          Continue inspection
        </button>
      </article>
    );
  }

  if (["PASSED", "FAILED", "CANCELLED"].includes(inspection.status)) {
    return (
      <article className="inspection-card">
        <InspectionHeading inspection={inspection} />
        <div className="inspection-status-row">
          <Status value={inspection.status} />
          {inspection.inspectedAt && (
            <time>{new Date(inspection.inspectedAt).toLocaleString("en-IN")}</time>
          )}
        </div>
        {inspection.remarks && <p>{inspection.remarks}</p>}
      </article>
    );
  }

  return (
    <form
      className="inspection-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          result === "PASSED" &&
          (!documentsVerified ||
            !premisesVerified ||
            !businessActivityVerified ||
            !qualityVerified)
        ) {
          setValidation("All verification checks are required to pass inspection.");
          return;
        }
        if (["FAILED", "NEEDS_REVIEW"].includes(result) && !remarks.trim()) {
          setValidation("A reason is required for this inspection result.");
          return;
        }
        setValidation("");
        onSave({
          status: result,
          remarks: remarks.trim() || undefined,
          documentsVerified,
          premisesVerified,
          qualityVerified,
          checklist: { businessActivityVerified },
        });
      }}
    >
      <InspectionHeading inspection={inspection} />
      <div className="inspection-status-row">
        <span>Inspection status</span>
        <Status value="IN_PROGRESS" />
      </div>
      <fieldset className="result-options">
        <legend>Inspection result</legend>
        {["PASSED", "FAILED", "NEEDS_REVIEW"].map((value) => (
          <label key={value}>
            <input
              type="radio"
              name={`inspection-result-${inspection.id}`}
              value={value}
              checked={result === value}
              onChange={(event) => setResult(event.target.value)}
            />
            {value.replaceAll("_", " ")}
          </label>
        ))}
      </fieldset>
      <div className="check-grid">
        <label>
          <input
            type="checkbox"
            checked={documentsVerified}
            onChange={(event) => setDocumentsVerified(event.target.checked)}
          />
          Documents physically verified
        </label>
        <label>
          <input
            type="checkbox"
            checked={premisesVerified}
            onChange={(event) => setPremisesVerified(event.target.checked)}
          />
          Business/location verified
        </label>
        <label>
          <input
            type="checkbox"
            checked={businessActivityVerified}
            onChange={(event) => setBusinessActivityVerified(event.target.checked)}
          />
          Business activity verified
        </label>
        <label>
          <input
            type="checkbox"
            checked={qualityVerified}
            onChange={(event) => setQualityVerified(event.target.checked)}
          />
          Quality/compliance checked
        </label>
      </div>
      <label>
        Notes {result !== "PASSED" ? "(required)" : "(optional)"}
        <textarea
          required={result !== "PASSED"}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
        />
      </label>
      {validation && <p className="form-error">{validation}</p>}
      <button className="primary" disabled={pending}>
        {pending ? "Saving…" : "Complete inspection"}
      </button>
    </form>
  );
}

function InspectionHeading({
  inspection,
}: {
  inspection: NonNullable<Vendor["inspections"]>[number];
}) {
  return (
    <div>
      <strong>{new Date(inspection.scheduledAt).toLocaleString("en-IN")}</strong>
      <small>{inspection.location ?? "Location not recorded"}</small>
      <small>
        Inspector: {inspection.inspector?.email ?? inspection.inspector?.mobile ?? "Assigned administrator"}
      </small>
    </div>
  );
}
interface Product {
  id: string;
  name: string;
  status: string;
  productType: string;
  price: string;
  createdAt: string;
  rejectionReason?: string;
  vendor: { businessName: string; status: string };
  category: { name: string };
  inventory?: { quantity: number; reserved: number };
  images: Array<{ url: string }>;
}
function Products() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-products", page],
    queryFn: () =>
      api.get<Page<Product>>(`/admin/products?page=${page}&limit=20`),
  });
  const action = useMutation({
    mutationFn: ({
      id,
      type,
      reason,
    }: {
      id: string;
      type: "approve" | "reject";
      reason?: string;
    }) =>
      type === "approve"
        ? api.post(`/admin/products/${id}/approve`)
        : api.post(`/admin/products/${id}/reject`, {
            reason,
          }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
  return (
    <>
      <Head
        title="Product moderation"
        subtitle="Review vendor, classification, pricing, media and inventory before publication."
      />
      <Async query={q} empty={!q.data?.data.length}>
        <div className="products">
          {q.data?.data.map((p) => (
            <article className="card" key={p.id}>
              {p.images[0]?.url ? (
                <img src={p.images[0].url} alt={p.name} />
              ) : (
                <div className="product-image-placeholder" aria-label="No image">
                  <ShoppingBag />
                </div>
              )}
              <div>
                <strong>{p.name}</strong>
                <span>
                  {p.vendor.businessName} · {p.category.name}
                </span>
                <small>
                  {p.productType.replaceAll("_", " ")} · {money(p.price)} ·
                  Stock {p.inventory?.quantity ?? 0}
                </small>
                {p.rejectionReason && <em>{p.rejectionReason}</em>}
              </div>
              <Status value={p.status} />
              {p.status === "PENDING_APPROVAL" && (
                <div>
                  <button
                    className="danger"
                    onClick={() => {
                      const reason = prompt("Product rejection reason");
                      if (reason?.trim())
                        action.mutate({
                          id: p.id,
                          type: "reject",
                          reason: reason.trim(),
                        });
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="primary"
                    onClick={() => action.mutate({ id: p.id, type: "approve" })}
                  >
                    Approve
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
        {q.data && (
          <Pager
            page={page}
            total={q.data.meta.totalPages}
            onChange={setPage}
          />
        )}
        {action.error && <p className="form-error">{action.error.message}</p>}
      </Async>
    </>
  );
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  isActive?: boolean;
}
function Categories() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null | undefined>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [removeImage, setRemoveImage] = useState(false);
  const [validationError, setValidationError] = useState("");
  const q = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get<Category[]>("/admin/categories"),
  });
  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);
  const save = useMutation({
    mutationFn: async () => {
      const slug = editing?.slug ?? name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const category = editing
        ? await api.patch<Category>(`/admin/categories/${editing.id}`, { name, slug, description })
        : await api.post<Category>("/admin/categories", { name, slug, description });
      if (image) {
        const body = new FormData();
        body.set("file", image);
        return api.postForm<Category>(`/admin/categories/${category.id}/image`, body);
      }
      if (editing && removeImage && editing.imageUrl) {
        return api.delete<Category>(`/admin/categories/${editing.id}/image`);
      }
      return category;
    },
    onSuccess: () => {
      closeEditor();
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  const update = useMutation({
    mutationFn: (category: Category) =>
      api.patch(`/admin/categories/${category.id}`, {
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: category.isActive === false,
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });
  function closeEditor() {
    setEditing(undefined);
    setName("");
    setDescription("");
    setImage(undefined);
    setPreview(undefined);
    setRemoveImage(false);
    setValidationError("");
  }
  function openEditor(category: Category | null) {
    setEditing(category);
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setImage(undefined);
    setPreview(assetUrl(category?.imageUrl));
    setRemoveImage(false);
    setValidationError("");
  }
  function chooseImage(file?: File) {
    setValidationError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setValidationError("Choose a JPG, JPEG, PNG or WEBP image.");
      return;
    }
    if (file.size > 5_242_880) {
      setValidationError("Image must not exceed 5 MB.");
      return;
    }
    setImage(file);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(file));
  }
  return (
    <>
      <Head
        title="Categories"
        subtitle="Manage the configurable marketplace catalogue."
        action={
          <button className="primary" onClick={() => openEditor(null)}>
            Create category
          </button>
        }
      />
      <Async query={q} empty={!q.data?.length}>
        <Table
          columns={["Image", "Name", "Slug", "Description", "Status", "Actions"]}
          rows={
            q.data?.map((c) => [
              c.imageUrl ? <img className="category-thumb" src={assetUrl(c.imageUrl)} alt="" /> : <span className="category-thumb category-thumb--empty"><ImageIcon /></span>,
              c.name,
              c.slug,
              c.description ?? "—",
              <Status value={c.isActive === false ? "INACTIVE" : "ACTIVE"} />,
              <div>
                <button onClick={() => openEditor(c)}><Pencil /> Edit</button>
                <button onClick={() => update.mutate(c)}>{c.isActive === false ? "Activate" : "Deactivate"}</button>
              </div>,
            ]) ?? []
          }
        />
        {update.error && (
          <p className="form-error">
            {update.error.message}
          </p>
        )}
      </Async>
      {editing !== undefined && (
        <div className="drawer-bg" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !save.isPending) closeEditor(); }}>
          <form className="drawer category-editor" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) { setValidationError("Category name is required."); return; } save.mutate(); }}>
            <button className="close" type="button" aria-label="Close" onClick={closeEditor}><X /></button>
            <h2>{editing ? "Edit category" : "Create category"}</h2>
            <p>Add the category details and an optional marketplace image.</p>
            <label>Name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <div className="category-image-field">
              <strong>Category image</strong>
              {preview && !removeImage ? <img className="category-preview" src={preview} alt="Category preview" /> : <div className="category-preview category-preview--empty"><ImageIcon /><span>No image selected</span></div>}
              <div className="form-actions">
                <label className="secondary file-button"><Upload /> {preview && !removeImage ? "Replace image" : "Choose image"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>
                {preview && !removeImage && <button className="secondary danger" type="button" onClick={() => { setImage(undefined); setPreview(undefined); setRemoveImage(true); }}><Trash2 /> Remove</button>}
              </div>
              <small>JPG, JPEG, PNG or WEBP, up to 5 MB.</small>
            </div>
            {(validationError || save.error) && <p className="form-error" role="alert">{validationError || save.error?.message}</p>}
            <footer><button className="secondary" type="button" disabled={save.isPending} onClick={closeEditor}>Cancel</button><button className="primary" disabled={save.isPending}>{save.isPending ? (image ? "Optimizing & saving…" : "Saving…") : "Save category"}</button></footer>
          </form>
        </div>
      )}
    </>
  );
}
interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  payableTotal: string;
  placedAt: string;
  vendorOrders: Array<{
    id: string;
    vendorOrderNumber: string;
    status: string;
    orderTotal: string;
    vendor: { businessName: string };
    items: unknown[];
    shipment?: { status: string; awb?: string };
  }>;
}
function Orders() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const q = useQuery({
    queryKey: ["admin-orders", page],
    queryFn: () => api.get<Page<Order>>(`/admin/orders?page=${page}&limit=20`),
  });
  return (
    <>
      <Head
        title="Master orders"
        subtitle="Complete multi-vendor order visibility with independent vendor fulfilment and shipment status."
      />
      <Async query={q} empty={!q.data?.data.length}>
        <div className="orders">
          {q.data?.data.map((o) => (
            <article className="card" key={o.id}>
              <header>
                <div>
                  <strong>{o.orderNumber}</strong>
                  <span>
                    {new Date(o.placedAt).toLocaleString("en-IN")} ·{" "}
                    {o.paymentMethod}
                  </span>
                </div>
                <div>
                  <strong>{money(o.payableTotal)}</strong>
                  <Status value={o.status} />
                  <button onClick={() => setSelected(o.id)}>View details</button>
                </div>
              </header>
              {o.vendorOrders.map((v) => (
                <div className="vendor-order" key={v.id}>
                  <span>
                    <strong>{v.vendor.businessName}</strong>
                    <small>
                      {v.vendorOrderNumber} · {v.items.length} items
                    </small>
                  </span>
                  <span>{money(v.orderTotal)}</span>
                  <Status value={v.status} />
                  <span>
                    {v.shipment ? (
                      <>
                        <Truck /> {v.shipment.awb ?? v.shipment.status}
                      </>
                    ) : (
                      "No shipment"
                    )}
                  </span>
                </div>
              ))}
            </article>
          ))}
        </div>
        {q.data && (
          <Pager
            page={page}
            total={q.data.meta.totalPages}
            onChange={setPage}
          />
        )}
      </Async>
      {selected && (
        <OrderDrawer id={selected} close={() => setSelected(undefined)} />
      )}
    </>
  );
}
function OrderDrawer({ id, close }: { id: string; close: () => void }) {
  const q = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => api.get<Order>(`/admin/orders/${id}`),
  });
  return (
    <div className="drawer-bg">
      <aside className="drawer">
        <button className="close" onClick={close} aria-label="Close order details">
          <X />
        </button>
        <Async query={q}>
          {q.data && (
            <>
              <small>MASTER ORDER</small>
              <h2>{q.data.orderNumber}</h2>
              <Status value={q.data.status} />
              <p>
                {new Date(q.data.placedAt).toLocaleString("en-IN")} ·{" "}
                {q.data.paymentMethod} · {money(q.data.payableTotal)}
              </p>
              <h3>Vendor orders</h3>
              {q.data.vendorOrders.map((vendorOrder) => (
                <section className="card" key={vendorOrder.id}>
                  <strong>{vendorOrder.vendor.businessName}</strong>
                  <p>
                    {vendorOrder.vendorOrderNumber} · {money(vendorOrder.orderTotal)}
                  </p>
                  <Status value={vendorOrder.status} />
                  <p>{vendorOrder.items.length} order item(s)</p>
                  <small>
                    {vendorOrder.shipment
                      ? `Shipment ${vendorOrder.shipment.awb ?? vendorOrder.shipment.status}`
                      : "Shipment not created"}
                  </small>
                </section>
              ))}
            </>
          )}
        </Async>
      </aside>
    </div>
  );
}
const resourceConfig = {
  customers: [
    "Customers",
    "/admin/customers",
    ["name", "email", "mobile", "status", "orders", "createdAt"],
  ],
  payments: [
    "Payments",
    "/admin/payments",
    ["providerOrderId", "method", "amount", "status", "createdAt"],
  ],
  shipments: [
    "Shipments",
    "/admin/shipments",
    ["provider", "awb", "status", "estimatedDelivery", "createdAt"],
  ],
  ledger: [
    "Vendor ledger",
    "/admin/ledger",
    ["type", "direction", "amount", "balanceAfter", "createdAt"],
  ],
  replacements: [
    "Replacements",
    "/admin/replacements",
    ["reason", "status", "trackingReference", "createdAt"],
  ],
  notifications: [
    "Notification events",
    "/admin/notifications",
    [
      "channel",
      "templateKey",
      "status",
      "providerReference",
      "failureReason",
      "sentAt",
      "createdAt",
    ],
  ],
  audit: [
    "Audit logs",
    "/admin/audit-logs",
    ["action", "entityType", "entityId", "createdAt"],
  ],
} as const;
function Resource({ kind }: { kind: keyof typeof resourceConfig }) {
  const [title, path, fields] = resourceConfig[kind];
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: [kind, page],
    queryFn: () =>
      api.get<Page<Record<string, unknown>>>(`${path}?page=${page}&limit=20`),
  });
  return (
    <>
      <Head
        title={title}
        subtitle="Authoritative records returned by the marketplace backend."
      />
      <Async query={q} empty={!q.data?.data.length}>
        <Table
          columns={fields.map((f) => f.replace(/([A-Z])/g, " $1"))}
          rows={
            q.data?.data.map((row) =>
              fields.map((field) => formatCell(field, row[field])),
            ) ?? []
          }
        />
        {q.data && (
          <Pager
            page={page}
            total={q.data.meta.totalPages}
            onChange={setPage}
          />
        )}
      </Async>
    </>
  );
}
function Returns() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["returns"],
    queryFn: () => api.get<Record<string, unknown>[]>("/admin/returns"),
  });
  const action = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post(`/admin/returns/${id}/status`, { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["returns"] }),
  });
  return (
    <>
      <Head
        title="Return requests"
        subtitle="Seven-day eligibility and refund/replacement decisions remain backend-authoritative."
      />
      <Async query={q} empty={!q.data?.length}>
        <Table
          columns={["Reason", "Resolution", "Status", "Requested", "Action"]}
          rows={
            q.data?.map((r) => [
              String(r.reason),
              String(r.resolution),
              <Status value={String(r.status)} />,
              formatCell("date", r.requestedAt),
              <select
                value=""
                onChange={(e) =>
                  action.mutate({ id: String(r.id), status: e.target.value })
                }
              >
                <option value="">Update…</option>
                {[
                  "APPROVED",
                  "REJECTED",
                  "PICKUP_SCHEDULED",
                  "RECEIVED",
                  "RESOLVED",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>,
            ]) ?? []
          }
        />
      </Async>
    </>
  );
}
function Reviews() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.get<Record<string, unknown>[]>("/admin/reviews"),
  });
  const action = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post(`/admin/reviews/${id}/moderate`, { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
  return (
    <>
      <Head
        title="Review moderation"
        subtitle="Publish or reject customer reviews through audited backend permissions."
      />
      <Async query={q} empty={!q.data?.length}>
        <Table
          columns={["Rating", "Comment", "Status", "Created", "Moderation"]}
          rows={
            q.data?.map((r) => [
              `${safeText(r.rating)}/5`,
              String(r.comment),
              <Status value={String(r.status)} />,
              formatCell("date", r.createdAt),
              <div>
                <button
                  onClick={() =>
                    action.mutate({ id: String(r.id), status: "PUBLISHED" })
                  }
                >
                  Publish
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    action.mutate({ id: String(r.id), status: "REJECTED" })
                  }
                >
                  Reject
                </button>
              </div>,
            ]) ?? []
          }
        />
      </Async>
    </>
  );
}
function Complaints() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>();
  const q = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api.get<Record<string, unknown>[]>("/complaints/admin/all"),
  });
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown }) =>
      api.post(path, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
  const complaint = q.data?.find((item) => item.id === selected);
  return (
    <>
      <Head
        title="Complaints"
        subtitle="Marketplace-wide customer, vendor, order and shipment complaint visibility."
      />
      <Async query={q} empty={!q.data?.length}>
        <Table
          columns={[
            "Reference",
            "Category",
            "Subject",
            "Status",
            "Created",
            "Action",
          ]}
          rows={
            q.data?.map((r) => [
              String(r.referenceNumber),
              String(r.category),
              String(r.subject),
              <Status value={String(r.status)} />,
              formatCell("date", r.createdAt),
              <button onClick={() => setSelected(String(r.id))}>Manage</button>,
            ]) ?? []
          }
        />
      </Async>
      {complaint && (
        <div className="drawer-bg">
          <aside className="drawer">
            <button className="close" onClick={() => setSelected(undefined)}>
              <X />
            </button>
            <small>COMPLAINT {safeText(complaint.referenceNumber)}</small>
            <h2>{safeText(complaint.subject)}</h2>
            <Status value={safeText(complaint.status)} />
            <p>{safeText(complaint.description)}</p>
            <h3>Conversation</h3>
            {Array.isArray(complaint.messages) && complaint.messages.length ? (
              complaint.messages.map((message: Record<string, unknown>) => (
                <div className="history" key={safeText(message.id)}>
                  <Status value={safeText(message.authorRole)} />
                  <span>{safeText(message.message)}</span>
                  <time>{formatCell("date", message.createdAt)}</time>
                </div>
              ))
            ) : (
              <p className="muted">No replies yet.</p>
            )}
            {action.error && <p className="form-error">{action.error.message}</p>}
            <footer>
              <button
                onClick={() => {
                  const message = prompt("Reply to this complaint");
                  if (message)
                    action.mutate({
                      path: `/complaints/${safeText(complaint.id)}/staff-messages`,
                      body: { message },
                    });
                }}
              >
                Reply
              </button>
              <select
                value=""
                aria-label="Update complaint status"
                onChange={(event) => {
                  const status = event.target.value;
                  if (!status) return;
                  const resolution =
                    status === "RESOLVED" || status === "CLOSED"
                      ? prompt("Resolution")
                      : undefined;
                  if ((status === "RESOLVED" || status === "CLOSED") && !resolution)
                    return;
                  action.mutate({
                    path: `/complaints/${safeText(complaint.id)}/status`,
                    body: { status, resolution },
                  });
                }}
              >
                <option value="">Update status…</option>
                {["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(
                  (status) => (
                    <option key={status}>{status}</option>
                  ),
                )}
              </select>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
function Settlements() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settlements"],
    queryFn: () => api.get<Record<string, unknown>[]>("/admin/settlements"),
  });
  const action = useMutation({
    mutationFn: ({
      id,
      type,
      providerReference,
    }: {
      id: string;
      type: "process" | "complete";
      providerReference?: string;
    }) =>
      type === "process"
        ? api.post(`/admin/settlements/${id}/process`)
        : api.post(`/admin/settlements/${id}/complete`, {
            providerReference,
          }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settlements"] }),
  });
  const refreshEligibility = useMutation({
    mutationFn: () => api.post("/admin/settlements/refresh-eligibility"),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settlements"] }),
  });
  return (
    <>
      <Head
        title="Individual-order settlements"
        subtitle="Eligibility is calculated by the backend seven days after delivery."
        action={
          <button
            className="secondary"
            disabled={refreshEligibility.isPending}
            onClick={() => refreshEligibility.mutate()}
          >
            {refreshEligibility.isPending ? "Refreshing…" : "Refresh eligibility"}
          </button>
        }
      />
      <Async query={q} empty={!q.data?.length}>
        <Table
          columns={["Reference", "Amount", "Status", "Created", "Action"]}
          rows={
            q.data?.map((s) => [
              String(s.reference),
              money(s.amount),
              <Status value={String(s.status)} />,
              formatCell("date", s.createdAt),
              <div>
                <button
                  onClick={() =>
                    action.mutate({ id: String(s.id), type: "process" })
                  }
                >
                  Process
                </button>
                <button
                  onClick={() => {
                    const providerReference = prompt("Payout reference");
                    if (providerReference?.trim())
                      action.mutate({
                        id: String(s.id),
                        type: "complete",
                        providerReference: providerReference.trim(),
                      });
                  }}
                >
                  Complete
                </button>
              </div>,
            ]) ?? []
          }
        />
        {(action.error || refreshEligibility.error) && (
          <p className="form-error">
            {(action.error ?? refreshEligibility.error)?.message}
          </p>
        )}
      </Async>
    </>
  );
}
function Refunds() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["refunds"],
    queryFn: () => api.get<Record<string, unknown>[]>("/admin/refunds"),
  });
  const action = useMutation({
    mutationFn: ({
      id,
      type,
      providerReference,
    }: {
      id: string;
      type: "process" | "complete";
      providerReference?: string;
    }) => {
      if (type === "process") return api.post(`/admin/refunds/${id}/process`);
      return api.post(`/admin/refunds/${id}/complete-bank-transfer`, {
        providerReference,
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["refunds"] }),
  });
  return (
    <>
      <Head
        title="Refunds"
        subtitle="Partial prepaid and COD refund records with provider status."
      />
      <Async query={q} empty={!q.data?.length}>
        <Table
          columns={[
            "Method",
            "Amount",
            "Reason",
            "Status",
            "Created",
            "Action",
          ]}
          rows={
            q.data?.map((r) => [
              String(r.method),
              money(r.amount),
              String(r.reason),
              <Status value={String(r.status)} />,
              formatCell("date", r.createdAt),
              <div>
                <button
                  onClick={() =>
                    action.mutate({ id: String(r.id), type: "process" })
                  }
                >
                  Process
                </button>
                {r.method === "BANK_TRANSFER" && r.status === "PROCESSING" && (
                  <button
                    onClick={() => {
                      const providerReference = prompt("Bank transfer reference");
                      if (providerReference?.trim())
                        action.mutate({
                          id: String(r.id),
                          type: "complete",
                          providerReference: providerReference.trim(),
                        });
                    }}
                  >
                    Complete transfer
                  </button>
                )}
              </div>,
            ]) ?? []
          }
        />
        {action.error && <p className="form-error">{action.error.message}</p>}
      </Async>
    </>
  );
}
function Commission() {
  const qc = useQueryClient();
  const [productType, setProductType] = useState("RAW_COMMODITY");
  const [percentage, setPercentage] = useState("");
  const q = useQuery({
    queryKey: ["commission-rules"],
    queryFn: () =>
      api.get<Record<string, unknown>[]>("/admin/commission/rules"),
  });
  const create = useMutation({
    mutationFn: () =>
      api.post("/admin/commission/rules", {
        productType,
        percentage: Number(percentage),
        effectiveFrom: new Date().toISOString(),
        isActive: true,
      }),
    onSuccess: () => {
      setPercentage("");
      void qc.invalidateQueries({ queryKey: ["commission-rules"] });
    },
  });
  return (
    <>
      <Head
        title="Commission configuration"
        subtitle="Effective-dated category and product-type rules; percentages are never hardcoded here."
        action={
          <form
            className="inline"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            <select
              value={productType}
              onChange={(event) => setProductType(event.target.value)}
            >
              <option value="RAW_COMMODITY">Raw commodity</option>
              <option value="VALUE_ADDED">Value added</option>
            </select>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              placeholder="Rate %"
              value={percentage}
              onChange={(event) => setPercentage(event.target.value)}
            />
            <button className="primary">Add rule</button>
          </form>
        }
      />
      <Async query={q} empty={!q.data?.length}>
        <Table
          columns={[
            "Product type",
            "Percentage",
            "Effective from",
            "Effective to",
            "Status",
          ]}
          rows={
            q.data?.map((r) => [
              safeText(r.productType, "Category rule"),
              `${safeText(r.percentage)}%`,
              formatCell("date", r.effectiveFrom),
              formatCell("date", r.effectiveTo),
              <Status value={r.isActive ? "ACTIVE" : "INACTIVE"} />,
            ]) ?? []
          }
        />
        {create.error && <p className="form-error">{create.error.message}</p>}
      </Async>
    </>
  );
}
function Reports() {
  const q = useQuery({
    queryKey: ["reports"],
    queryFn: () =>
      api.get<
        Record<string, { _sum: Record<string, unknown>; _count: number }>
      >("/admin/reports"),
  });
  return (
    <>
      <Head
        title="Reports"
        subtitle="Current backend aggregates for orders, commission, refunds and settlements."
      />
      <Async query={q}>
        {q.data && (
          <div className="metrics">
            {Object.entries(q.data).map(([key, value]) => (
              <article key={key}>
                <span>{key}</span>
                <strong>{value._count} records</strong>
                <small>{money(Object.values(value._sum)[0])}</small>
              </article>
            ))}
          </div>
        )}
      </Async>
    </>
  );
}
function System() {
  const client = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["integration-settings"],
    queryFn: () => api.get<IntegrationSetting[]>("/admin/integration-settings"),
  });
  const save = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api.patch<IntegrationSetting[]>("/admin/integration-settings", body),
    onSuccess: (data) => {
      client.setQueryData(["integration-settings"], data);
      setValues({});
    },
  });
  const remove = useMutation({
    mutationFn: (key: string) =>
      api.delete<IntegrationSetting[]>(
        `/admin/integration-settings/${encodeURIComponent(key)}`,
      ),
    onSuccess: (data) => client.setQueryData(["integration-settings"], data),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const changed = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value.trim()),
    );
    if (Object.keys(changed).length) save.mutate(changed);
  };
  return (
    <>
      <Head
        title="System configuration"
        subtitle="Securely configure external services without editing server environment files."
      />
      <Async query={q}>
        {q.data && (
          <form className="integration-settings" onSubmit={submit} autoComplete="off">
            <section className="security-note">
              <ShieldCheck />
              <div>
                <strong>Encrypted credential storage</strong>
                <p>
                  Existing values are never sent back to the browser. Enter only
                  values you want to add or replace; blank fields remain unchanged.
                </p>
              </div>
            </section>
            {(["RAZORPAY", "SHIPROCKET", "INTERAKT", "MSG91"] as const).map(
              (provider) => {
                const settings = q.data.filter(
                  (setting) => setting.provider === provider,
                );
                const requiredSettings = settings.filter((setting) => setting.required !== false);
                const ready = requiredSettings.length > 0 && requiredSettings.every((setting) => setting.configured);
                return (
                  <section className="card integration-card" key={provider}>
                    <div className="integration-heading">
                      <div>
                        <small>EXTERNAL INTEGRATION</small>
                        <h2>{provider[0] + provider.slice(1).toLowerCase()}</h2>
                      </div>
                      <Status value={ready ? "CONFIGURED" : "INCOMPLETE"} />
                    </div>
                    <div className="credential-grid">
                      {settings.map((setting) => (
                        <label key={setting.key}>
                          <span>{setting.label}</span>
                          <input
                            type={setting.secret ? "password" : setting.key.endsWith("EMAIL") ? "email" : "text"}
                            value={values[setting.key] ?? ""}
                            placeholder={setting.configured ? setting.maskedValue ?? "Configured" : "Not configured"}
                            autoComplete="new-password"
                            onChange={(event) =>
                              setValues((current) => ({
                                ...current,
                                [setting.key]: event.target.value,
                              }))
                            }
                          />
                          <small>
                            {setting.configured
                              ? `Stored via ${setting.source.toLowerCase()}`
                              : setting.required === false ? "Optional" : "Required"}
                            {setting.updatedAt
                              ? ` · Updated ${new Date(setting.updatedAt).toLocaleString("en-IN")}`
                              : ""}
                          </small>
                          {setting.source === "DATABASE" && (
                            <button
                              type="button"
                              className="danger-link"
                              disabled={remove.isPending}
                              onClick={() => {
                                if (window.confirm(`Remove the stored ${setting.label}?`)) {
                                  remove.mutate(setting.key);
                                }
                              }}
                            >
                              Remove stored value
                            </button>
                          )}
                        </label>
                      ))}
                    </div>
                  </section>
                );
              },
            )}
            {(save.error || remove.error) && (
              <p className="form-error">{(save.error ?? remove.error)?.message}</p>
            )}
            <div className="configuration-actions">
              <span>Changes take effect for new provider requests immediately.</span>
              <button
                className="primary"
                disabled={save.isPending || !Object.values(values).some((value) => value.trim())}
              >
                {save.isPending ? "Saving securely…" : "Save configuration"}
              </button>
            </div>
          </form>
        )}
      </Async>
    </>
  );
}

interface IntegrationSetting {
  key: string;
  provider: "RAZORPAY" | "SHIPROCKET" | "INTERAKT" | "MSG91";
  label: string;
  secret: boolean;
  required?: boolean;
  configured: boolean;
  source: "DATABASE" | "ENVIRONMENT" | "NONE";
  maskedValue: string | null;
  updatedAt: string | null;
}
function Table({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function formatCell(field: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—";
  if (field.toLowerCase().includes("amount") || field === "balanceAfter")
    return money(value);
  if (field.toLowerCase().includes("status"))
    return <Status value={safeText(value)} />;
  if (field.toLowerCase().includes("date") || field.endsWith("At")) {
    const date = new Date(safeText(value));
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN");
  }
  return typeof value === "object" ? JSON.stringify(value) : safeText(value);
}
function safeText(value: unknown, fallback = "—"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return `${value}`;
  return fallback;
}
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="customers" element={<Resource kind="customers" />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="homepage" element={<HomeHeroSlides />} />
          <Route path="orders" element={<Orders />} />
          <Route path="payments" element={<Resource kind="payments" />} />
          <Route path="shipments" element={<Resource kind="shipments" />} />
          <Route path="commission" element={<Commission />} />
          <Route path="ledger" element={<Resource kind="ledger" />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="refunds" element={<Refunds />} />
          <Route path="returns" element={<Returns />} />
          <Route
            path="replacements"
            element={<Resource kind="replacements" />}
          />
          <Route path="reviews" element={<Reviews />} />
          <Route path="complaints" element={<Complaints />} />
          <Route
            path="notifications"
            element={<Resource kind="notifications" />}
          />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<Resource kind="audit" />} />
          <Route path="settings" element={<System />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
