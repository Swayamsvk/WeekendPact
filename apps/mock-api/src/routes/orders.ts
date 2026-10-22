import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { db } from '../store.js';
import { sendError } from '../errors.js';
import { settle } from './payments.js';
import type { CreateOrderRequest, Order } from '../types.js';

export async function orderRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateOrderRequest }>('/orders', async (request, reply) => {
    const body = request.body;

    // 1. Every order request must carry an idempotency key
    const key = request.headers['idempotency-key'];
    if (typeof key !== 'string' || key.trim() === '') {
      return sendError(reply, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Missing Idempotency-Key header');
    }

    // 2. Seen this key before?
    const fingerprint = `${body?.quoteId}|${body?.paymentAttemptId}`;
    const existing = db.ordersByIdempotencyKey.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        // Same key, different data: a bug in the app, never silently accept it
        return sendError(
          reply,
          422,
          'IDEMPOTENCY_KEY_REUSED',
          'This Idempotency-Key was already used for a different order',
        );
      }
      // Same key, same data: a retry. Return the SAME order, don't create another
      return reply.code(200).send(db.orders.get(existing.orderId));
    }

    // 3. Check the request data
    if (!body || typeof body.quoteId !== 'string' || typeof body.paymentAttemptId !== 'string') {
      return sendError(reply, 400, 'VALIDATION', 'quoteId and paymentAttemptId are required');
    }

    // 4. The payment must exist, belong to this quote, and have succeeded
    const payment = db.payments.get(body.paymentAttemptId);
    if (!payment) {
      return sendError(reply, 404, 'PAYMENT_NOT_FOUND', 'Payment attempt not found');
    }
    if (payment.quoteId !== body.quoteId) {
      return sendError(reply, 409, 'PAYMENT_QUOTE_MISMATCH', 'This payment is for a different quote');
    }
    settle(payment); // it may have finished since the app last checked
    if (payment.status !== 'succeeded') {
      return sendError(
        reply,
        402,
        'PAYMENT_NOT_CONFIRMED',
        `Payment is ${payment.status}. The order can only be placed after payment succeeds.`,
      );
    }

    // 5. One payment can only ever pay for one order, even with a new key
    const orderForPayment = db.orderIdByPaymentId.get(payment.id);
    if (orderForPayment) {
      return sendError(
        reply,
        409,
        'PAYMENT_ALREADY_USED',
        `This payment was already used for order ${orderForPayment}`,
      );
    }

    // 6. The quote must exist. Its expiry isn't checked again here:
    //    the successful payment locked in the quoted price.
    const quote = db.quotes.get(body.quoteId);
    if (!quote) {
      return sendError(reply, 404, 'QUOTE_NOT_FOUND', 'Quote not found');
    }

    // 7. Create the order
    const order: Order = {
      id: `ord_${randomUUID()}`,
      status: 'confirmed',
      quoteId: quote.quoteId,
      paymentAttemptId: payment.id,
      paymentMethod: payment.method,
      lines: quote.lines,
      totalMinor: quote.totalMinor,
      currency: 'INR',
      createdAt: new Date().toISOString(),
    };

    // Reduce stock for each item ordered
    for (const line of quote.lines) {
      const product = db.products.find(p => p.id === line.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - line.quantity);
      }
    }

    // Remember the order under its id, its key and its payment
    db.orders.set(order.id, order);
    db.ordersByIdempotencyKey.set(key, { orderId: order.id, fingerprint });
    db.orderIdByPaymentId.set(payment.id, order.id);

    return reply.code(201).send(order);
  });

  app.get<{ Params: { id: string } }>('/orders/:id', async (request, reply) => {
    const order = db.orders.get(request.params.id);
    if (!order) {
      return sendError(reply, 404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    return order;
  });
}
