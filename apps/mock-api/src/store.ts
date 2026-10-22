import { seedProducts } from './data/products.js';
import type { Scenario } from './scenarios.js';
import type { Order, PaymentAttempt, Product, Quote } from './types.js';

// What the server keeps internally for each payment (extra fields stay private)
export type StoredPayment = PaymentAttempt & {
  scenario: Scenario; // decides how this payment ends
  createdAtMs: number;
};

// What we remember about each idempotency key
export type IdempotencyRecord = {
  orderId: string;
  fingerprint: string; // the request data the key was first used with
};

function freshState() {
  return {
    products: seedProducts.map(p => ({ ...p })) as Product[],
    quotes: new Map<string, Quote>(),
    payments: new Map<string, StoredPayment>(),
    orders: new Map<string, Order>(),
    ordersByIdempotencyKey: new Map<string, IdempotencyRecord>(),
    orderIdByPaymentId: new Map<string, string>(),
  };
}

export let db = freshState();

export function resetDb() {
  db = freshState();
}
