import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { db } from '../store.js';
import { sendError } from '../errors.js';
import { scenarioFor } from '../scenarios.js';
import { applyCoupon, calculateTotals, type PricedLine } from '../pricing.js';
import { buildDeliveryOptions, isServiceable, isValidPincode } from '../delivery.js';
import type { DeliveryOptionId, Quote, QuoteRequest } from '../types.js';

const QUOTE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_QUANTITY = 10;

export async function pricingRoutes(app: FastifyInstance) {
  app.post<{ Body: QuoteRequest }>('/pricing/quote', async (request, reply) => {
    const body = request.body;
    const scenario = scenarioFor(request);

    // 1. Check the request shape
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return sendError(reply, 400, 'VALIDATION', 'Cart is empty');
    }

    const fieldErrors: Record<string, string> = {};
    body.items.forEach((item, index) => {
      if (typeof item.productId !== 'string') {
        fieldErrors[`items.${index}.productId`] = 'Product id is required';
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
        fieldErrors[`items.${index}.quantity`] = `Quantity must be between 1 and ${MAX_QUANTITY}`;
      }
    });
    if (Object.keys(fieldErrors).length > 0) {
      return sendError(reply, 400, 'VALIDATION', 'Please check the items in your cart', fieldErrors);
    }

    // 2. Look up products and check stock
    const lines: PricedLine[] = [];
    const stockErrors: Record<string, string> = {};

    for (const [index, item] of body.items.entries()) {
      const product = db.products.find(p => p.id === item.productId);
      if (!product) {
        return sendError(reply, 404, 'PRODUCT_NOT_FOUND', `Product ${item.productId} not found`);
      }
      const forcedOutOfStock = scenario === 'out_of_stock' && index === 0;
      if (forcedOutOfStock || product.stock < item.quantity) {
        stockErrors[`items.${index}`] =
          product.stock === 0 || forcedOutOfStock
            ? `${product.name} is out of stock`
            : `Only ${product.stock} left of ${product.name}`;
      }
      lines.push({
        productId: product.id,
        name: product.name,
        unitPriceMinor: product.priceMinor,
        quantity: item.quantity,
      });
    }
    if (Object.keys(stockErrors).length > 0) {
      return sendError(reply, 409, 'OUT_OF_STOCK', 'Some items are no longer available', stockErrors);
    }

    // 3. Apply the coupon, if any
    const subtotalMinor = lines.reduce((sum, l) => sum + l.unitPriceMinor * l.quantity, 0);
    let discountMinor = 0;
    const couponCode = body.couponCode ? body.couponCode.trim().toUpperCase() : null;

    if (couponCode) {
      if (scenario === 'coupon_invalid') {
        return sendError(reply, 400, 'COUPON_INVALID', 'This coupon has expired', {
          couponCode: 'This coupon has expired',
        });
      }
      const result = applyCoupon(couponCode, subtotalMinor);
      if (!result.ok) {
        const code = result.reason === 'INVALID' ? 'COUPON_INVALID' : 'COUPON_NOT_ELIGIBLE';
        return sendError(reply, 400, code, result.message, { couponCode: result.message });
      }
      discountMinor = result.discountMinor;
    }

    // 4. Delivery fee from the chosen option (same rules as GET /delivery/options)
    let shippingMinor: number | undefined;
    let deliveryOptionId: DeliveryOptionId | null = null;

    if (body.deliveryOptionId) {
      const pincode = body.pincode ?? '';
      if (!isValidPincode(pincode)) {
        return sendError(reply, 400, 'VALIDATION', 'A valid pincode is required to choose delivery', {
          pincode: 'Pincode must be 6 digits',
        });
      }
      if (!isServiceable(pincode)) {
        return sendError(reply, 422, 'PINCODE_NOT_SERVICEABLE', "Sorry, we don't deliver to this pincode yet");
      }
      const option = buildDeliveryOptions(pincode, subtotalMinor - discountMinor).find(
        o => o.id === body.deliveryOptionId,
      );
      if (!option) {
        return sendError(
          reply,
          422,
          'DELIVERY_OPTION_UNAVAILABLE',
          "This delivery option isn't available for your address",
        );
      }
      shippingMinor = option.feeMinor;
      deliveryOptionId = option.id;
    }

    // 5. Calculate and save the quote
    const totals = calculateTotals(lines, discountMinor, shippingMinor);
    const quote: Quote = {
      quoteId: `qt_${randomUUID()}`,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
      currency: 'INR',
      couponCode,
      deliveryOptionId,
      ...totals,
    };
    db.quotes.set(quote.quoteId, quote);

    return reply.code(201).send(quote);
  });

  app.get<{ Params: { id: string } }>('/pricing/quotes/:id', async (request, reply) => {
    const quote = db.quotes.get(request.params.id);
    if (!quote) {
      return sendError(reply, 404, 'QUOTE_NOT_FOUND', 'Quote not found');
    }
    if (new Date(quote.expiresAt) < new Date()) {
      return sendError(reply, 410, 'QUOTE_EXPIRED', 'Prices may have changed. Please review your cart.');
    }
    return quote;
  });
}
