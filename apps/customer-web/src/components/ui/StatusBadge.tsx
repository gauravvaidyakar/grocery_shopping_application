const positive = new Set(['PAID', 'DELIVERED', 'PUBLISHED', 'RESOLVED', 'REPLACED', 'REFUNDED', 'COMPLETED']);
const warning = new Set(['PENDING', 'PAYMENT_PENDING', 'COD_PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'IN_REVIEW', 'REQUESTED', 'RETURN_REQUESTED', 'REPLACEMENT_REQUESTED', 'REFUND_PENDING', 'PENDING_MODERATION']);
const negative = new Set(['FAILED', 'CANCELLED', 'REJECTED', 'EXCEPTION']);

export function StatusBadge({ status }: { status: string }) {
  const tone = positive.has(status) ? 'positive' : negative.has(status) ? 'negative' : warning.has(status) ? 'warning' : 'neutral';
  return <span className={`status-badge status-badge--${tone}`}>{status.replaceAll('_', ' ')}</span>;
}
