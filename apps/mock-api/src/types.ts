// Prices are in paise (minor units): 49900 = ₹499.00
export type Product = {
  id: string;
  name: string;
  priceMinor: number;
  currency: 'INR';
  image: string;
  stock: number;
};

// Every error response has this shape
export type ApiErrorBody = {
  code: string;
  message: string;
  errors?: Record<string, string>;
};

// ---------- Pricing ----------

export type QuoteRequest = {
  items: { productId: string; quantity: number }[];
  couponCode?: string;
};

export type QuoteLine = {
  productId: string;
  name: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
};

export type Quote = {
  quoteId: string;
  expiresAt: string; // ISO date
  currency: 'INR';
  lines: QuoteLine[];
  couponCode: string | null;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
};

// ---------- Payments ----------

export type PaymentMethod = 'upi' | 'card' | 'cod';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';

export type CreatePaymentAttemptRequest = {
  quoteId: string;
  method: PaymentMethod;
};

export type PaymentAttempt = {
  id: string;
  quoteId: string;
  method: PaymentMethod;
  amountMinor: number;
  currency: 'INR';
  status: PaymentStatus;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------- Orders ----------

export type CreateOrderRequest = {
  quoteId: string;
  paymentAttemptId: string;
};

export type Order = {
  id: string;
  status: 'confirmed';
  quoteId: string;
  paymentAttemptId: string;
  paymentMethod: PaymentMethod;
  lines: QuoteLine[];
  totalMinor: number;
  currency: 'INR';
  createdAt: string;
};
