import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { marketplaceApi, runtimeConfig } from "../api";
import { getErrorMessage } from "../api/errors";
import type {
  CheckoutSummary,
  MasterOrder,
  PaymentMethod,
  PaymentRecord,
} from "../api/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/ui/AsyncState";
import { formatMoney } from "../components/ui/format";
import { StatusBadge } from "../components/ui/StatusBadge";
import { cartKey, useCart } from "../features/cart/hooks";
import { orderKeys } from "../features/orders/hooks";
import {
  openRazorpayCheckout,
  type RazorpayOutcome,
} from "../payments/razorpay";
import { addressesKey } from "./AddressesPage";

interface PaymentAttemptResult {
  order: MasterOrder;
  outcome: RazorpayOutcome;
  payment: PaymentRecord;
}

export function CheckoutPage() {
  const cart = useCart();
  const addresses = useQuery({
    queryKey: addressesKey,
    queryFn: () => marketplaceApi.getAddresses(),
  });
  const [addressId, setAddressId] = useState("");
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [pendingOrder, setPendingOrder] = useState<MasterOrder | null>(null);
  const [paymentId, setPaymentId] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const preferred =
      addresses.data?.find((address) => address.isDefault) ??
      addresses.data?.[0];
    if (preferred && !addressId) setAddressId(preferred.id);
  }, [addressId, addresses.data]);

  const validate = useMutation({
    mutationFn: (selectedAddress: string) =>
      marketplaceApi.validateCheckout(selectedAddress, paymentMethod),
    onSuccess: (quote) => {
      setSummary(quote);
      setPaymentNotice("");
    },
  });
  const finishOrder = (order: MasterOrder) => {
    queryClient.setQueryData(orderKeys.detail(order.masterOrderId), order);
    void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    void navigate(`/order-confirmation/${order.masterOrderId}`, {
      replace: true,
      state: { confirmation: order },
    });
  };

  const paymentAttempt = useMutation({
    mutationFn: async (order: MasterOrder): Promise<PaymentAttemptResult> => {
      const session = await marketplaceApi.createPayment(order.masterOrderId);
      setPaymentId(session.paymentId);
      const outcome = await openRazorpayCheckout(session);
      if (outcome.kind === "CANCELLED")
        setPaymentNotice(
          "The payment window was closed. Checking the backend payment status…",
        );
      if (outcome.kind === "FAILED")
        setPaymentNotice(
          `${outcome.message} Checking the backend payment status…`,
        );
      if (outcome.kind === "SUCCESS") {
        setPaymentNotice(
          "Payment response received. Waiting for secure backend verification…",
        );
        await marketplaceApi.verifyPayment({
          paymentId: session.paymentId,
          providerOrderId: outcome.providerOrderId,
          providerPaymentId: outcome.providerPaymentId,
          providerSignature: outcome.providerSignature,
        });
      }
      const payment = await marketplaceApi.getPaymentStatus(session.paymentId);
      return { order, outcome, payment };
    },
    onSuccess: ({ order, outcome, payment }) => {
      if (payment.status === "PAID")
        return finishOrder({ ...order, paymentStatus: "PAID" });
      if (outcome.kind === "CANCELLED")
        setPaymentNotice(
          "The payment window was closed. The order remains payment pending until the backend confirms otherwise.",
        );
      else if (outcome.kind === "FAILED") setPaymentNotice(outcome.message);
      else
        setPaymentNotice(
          `The provider response was received, but backend status is ${payment.status.replaceAll("_", " ")}. Refresh the status before retrying.`,
        );
    },
  });

  const createOrder = useMutation({
    mutationFn: () => {
      if (!summary)
        throw new Error("Validate checkout before placing the order.");
      return marketplaceApi.createOrder({
        quoteId: summary.quoteId,
        addressId,
        paymentMethod,
      });
    },
    onSuccess: (order) => {
      setPendingOrder(order);
      void queryClient.invalidateQueries({ queryKey: cartKey });
      if (order.paymentMethod === "COD") finishOrder(order);
      else paymentAttempt.mutate(order);
    },
  });

  const refreshPayment = useMutation({
    mutationFn: () => marketplaceApi.getPaymentStatus(paymentId),
    onSuccess: (payment) => {
      if (payment.status === "PAID" && pendingOrder)
        finishOrder({ ...pendingOrder, paymentStatus: "PAID" });
      else
        setPaymentNotice(
          `Backend payment status: ${payment.status.replaceAll("_", " ")}.`,
        );
    },
  });

  if (cart.isLoading || addresses.isLoading)
    return (
      <div className="page shell">
        <LoadingState label="Preparing checkout" />
      </div>
    );
  if (cart.isError || addresses.isError)
    return (
      <div className="page shell">
        <ErrorState
          message={getErrorMessage(cart.error ?? addresses.error)}
          onRetry={() => {
            void cart.refetch();
            void addresses.refetch();
          }}
        />
      </div>
    );
  if (!cart.data?.itemCount && !pendingOrder)
    return (
      <div className="page shell">
        <EmptyState
          title="Your cart is empty"
          message="Add products before starting checkout."
          action={
            <Link className="button button--primary" to="/products">
              Browse products
            </Link>
          }
        />
      </div>
    );

  const busy =
    createOrder.isPending ||
    paymentAttempt.isPending ||
    refreshPayment.isPending;
  const vendorGroups = summary?.vendors ?? cart.data?.groups ?? [];
  return (
    <div className="page shell checkout-page">
      <div className="checkout-steps" aria-label="Checkout progress">
        <span className="complete">
          <CheckCircle2 /> Cart
        </span>
        <ArrowRight />
        <span className="active">Address & quote</span>
        <ArrowRight />
        <span>Payment</span>
        <ArrowRight />
        <span>Confirmation</span>
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Secure checkout</span>
          <h1>Review your delivery</h1>
          <p>One customer checkout, grouped vendor-wise for fulfilment.</p>
        </div>
      </div>
      <div className="checkout-layout">
        <section className="checkout-main">
          <div className="checkout-card">
            <div className="card-title">
              <MapPin />
              <div>
                <h2>Delivery address</h2>
                <p>Select a saved address for the backend shipping quote.</p>
              </div>
              <Link to="/addresses">Manage</Link>
            </div>
            {addresses.data?.length ? (
              <div className="checkout-addresses">
                {addresses.data.map((address) => (
                  <label
                    key={address.id}
                    className={addressId === address.id ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="address"
                      disabled={Boolean(pendingOrder)}
                      checked={addressId === address.id}
                      onChange={() => {
                        setAddressId(address.id);
                        setSummary(null);
                      }}
                    />
                    <span>
                      <strong>
                        {address.label} · {address.recipientName}
                      </strong>
                      <small>
                        {address.line1}, {address.city}, {address.state} —{" "}
                        {address.pincode}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No address saved"
                message="Add an address before checkout."
                action={
                  <Link className="button button--secondary" to="/addresses">
                    Add address
                  </Link>
                }
              />
            )}
          </div>
          <div className="checkout-card">
            <div className="card-title">
              <Truck />
              <div>
                <h2>Items by vendor</h2>
                <p>Each vendor group receives its own shipment and tracking.</p>
              </div>
            </div>
            {vendorGroups.map((group) => (
              <div className="checkout-vendor" key={group.vendor.id}>
                <div>
                  <strong>{group.vendor.name}</strong>
                  <span>
                    {group.items.length} product
                    {group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <span>{formatMoney(group.productSubtotal)}</span>
              </div>
            ))}
          </div>
          {summary && (
            <div className="checkout-card">
              <div className="card-title">
                <CreditCard />
                <div>
                  <h2>Payment method</h2>
                  <p>
                    The backend quote is valid until{" "}
                    {new Date(summary.expiresAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    .
                  </p>
                </div>
              </div>
              <label
                className={`payment-choice ${paymentMethod === "COD" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="payment"
                  disabled={Boolean(pendingOrder)}
                  checked={paymentMethod === "COD"}
                  onChange={() => {
                    setPaymentMethod("COD");
                    setSummary(null);
                  }}
                />
                <span>
                  <strong>Cash on delivery</strong>
                  <small>
                    Tracked separately; never shown as prepaid success.
                  </small>
                </span>
              </label>
              <label
                className={`payment-choice ${paymentMethod === "PREPAID" ? "selected" : ""} ${runtimeConfig.isMock ? "disabled" : ""}`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="PREPAID"
                  disabled={runtimeConfig.isMock || Boolean(pendingOrder)}
                  checked={paymentMethod === "PREPAID"}
                  onChange={() => {
                    setPaymentMethod("PREPAID");
                    setSummary(null);
                  }}
                />
                <span>
                  <strong>Razorpay · UPI / card / net banking</strong>
                  <small>
                    {runtimeConfig.isMock
                      ? "Available when the backend payment APIs are connected."
                      : "Payment success is accepted only after backend verification."}
                  </small>
                </span>
              </label>
            </div>
          )}
          {pendingOrder && (
            <div className="checkout-card payment-recovery">
              <div className="card-title">
                <ShieldCheck />
                <div>
                  <h2>Payment verification</h2>
                  <p>Order #{pendingOrder.masterOrderNumber}</p>
                </div>
                <StatusBadge status={pendingOrder.paymentStatus} />
              </div>
              {paymentNotice && <p>{paymentNotice}</p>}
              {paymentAttempt.isError && (
                <p className="form-error">
                  {getErrorMessage(paymentAttempt.error)}
                </p>
              )}
              {refreshPayment.isError && (
                <p className="form-error">
                  {getErrorMessage(refreshPayment.error)}
                </p>
              )}
              <div className="form-actions">
                <button
                  className="button button--secondary"
                  disabled={!paymentId || busy}
                  type="button"
                  onClick={() => refreshPayment.mutate()}
                >
                  <RefreshCw size={16} /> Refresh backend status
                </button>
                <button
                  className="button button--primary"
                  disabled={busy}
                  type="button"
                  onClick={() => paymentAttempt.mutate(pendingOrder)}
                >
                  Retry secure payment
                </button>
              </div>
              <small>
                Closing or failing the Razorpay window does not mark this order
                paid.
              </small>
            </div>
          )}
        </section>
        <aside className="order-summary checkout-summary">
          <h2>Price details</h2>
          {summary ? (
            <>
              <div>
                <span>Product subtotal</span>
                <strong>{formatMoney(summary.productSubtotal)}</strong>
              </div>
              {summary.vendors.map((group) => (
                <div key={group.vendor.id}>
                  <span>Shipping · {group.vendor.name}</span>
                  <strong>{formatMoney(group.shipping)}</strong>
                </div>
              ))}
              <div>
                <span>Total shipping</span>
                <strong>{formatMoney(summary.totalShipping)}</strong>
              </div>
              <div className="summary-total">
                <span>Final payable amount</span>
                <strong>{formatMoney(summary.payableTotal)}</strong>
              </div>
              <small>
                GST-inclusive product prices. Every amount is supplied by the
                checkout API.
              </small>
              {!pendingOrder && (
                <button
                  className="button button--primary button--full"
                  disabled={busy}
                  onClick={() => createOrder.mutate()}
                >
                  {createOrder.isPending
                    ? "Creating order…"
                    : runtimeConfig.isMock
                      ? "Place development COD order"
                      : paymentMethod === "COD"
                        ? "Place COD order"
                        : "Create order & pay securely"}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="summary-note">
                Select an address, then request a fresh backend quote for price,
                stock and vendor-wise shipping.
              </p>
              <button
                className="button button--primary button--full"
                type="button"
                disabled={!addressId || validate.isPending}
                onClick={() => validate.mutate(addressId)}
              >
                {validate.isPending ? "Validating…" : "Get checkout quote"}
              </button>
            </>
          )}
          {(validate.isError || createOrder.isError) && (
            <p className="form-error" role="alert">
              {getErrorMessage(validate.error ?? createOrder.error)}
            </p>
          )}
          <span className="secure-note">
            <ShieldCheck size={17} /> Backend remains the source of truth.
          </span>
        </aside>
      </div>
    </div>
  );
}
