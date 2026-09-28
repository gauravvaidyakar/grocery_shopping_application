import type { Money } from '../../api/types';

export function formatMoney(value: Money): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: value.currency,
    maximumFractionDigits: 0,
  }).format(value.amount);
}

export function discountPercentage(price: Money, mrp?: Money): number | null {
  if (!mrp || mrp.amount <= price.amount) return null;
  return Math.round(((mrp.amount - price.amount) / mrp.amount) * 100);
}
