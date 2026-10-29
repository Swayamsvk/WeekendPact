// All amounts are integers in paise. Never use decimals for money.

export const FREE_SHIPPING_THRESHOLD_MINOR = 99900; // ₹999
export const SHIPPING_FEE_MINOR = 4900; // ₹49
export const GST_PERCENT = 18;

type Coupon =
  | { type: 'percent'; percent: number; maxDiscountMinor: number }
  | { type: 'flat'; amountMinor: number; minSubtotalMinor: number };

export const COUPONS: Record<string, Coupon> = {
  SAVE10: { type: 'percent', percent: 10, maxDiscountMinor: 20000 }, // 10%, max ₹200
  FLAT100: { type: 'flat', amountMinor: 10000, minSubtotalMinor: 99900 }, // ₹100 off from ₹999
};

export type PricedLine = {
  productId: string;
  name: string;
  unitPriceMinor: number;
  quantity: number;
};

export type CouponResult =
  | { ok: true; discountMinor: number }
  | { ok: false; reason: 'INVALID' | 'NOT_ELIGIBLE'; message: string };

export function applyCoupon(code: string, subtotalMinor: number): CouponResult {
  const coupon = COUPONS[code.toUpperCase()];
  if (!coupon) {
    return { ok: false, reason: 'INVALID', message: 'This coupon code is not valid' };
  }
  if (coupon.type === 'percent') {
    const discount = Math.round((subtotalMinor * coupon.percent) / 100);
    return { ok: true, discountMinor: Math.min(discount, coupon.maxDiscountMinor) };
  }
  if (subtotalMinor < coupon.minSubtotalMinor) {
    return { ok: false, reason: 'NOT_ELIGIBLE', message: 'Add items worth ₹999 or more to use this coupon' };
  }
  return { ok: true, discountMinor: Math.min(coupon.amountMinor, subtotalMinor) };
}

/**
 * @param shippingMinor the chosen delivery option's fee.
 *   Leave it out to use the default rule (free from ₹999, otherwise ₹49).
 */
export function calculateTotals(lines: PricedLine[], discountMinor: number, shippingMinor?: number) {
  const pricedLines = lines.map(line => ({
    ...line,
    lineTotalMinor: line.unitPriceMinor * line.quantity,
  }));

  const subtotalMinor = pricedLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const afterDiscountMinor = subtotalMinor - discountMinor;
  const shipping =
    shippingMinor ??
    (afterDiscountMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : SHIPPING_FEE_MINOR);
  const taxMinor = Math.round((afterDiscountMinor * GST_PERCENT) / 100);
  const totalMinor = afterDiscountMinor + shipping + taxMinor;

  return {
    lines: pricedLines,
    subtotalMinor,
    discountMinor,
    shippingMinor: shipping,
    taxMinor,
    totalMinor,
  };
}
