import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { db, type StoredPayment } from "../store.js";
import { sendError } from "../errors.js";
import { scenarioFor } from "../scenarios.js";
import type {
  CreatePaymentAttemptRequest,
  NextAction,
  PaymentAttempt,
  PaymentMethod,
} from "../types.js";

const PAYMENT_METHODS: PaymentMethod[] = ["upi", "card", "cod"];
const PROCESSING_TIME_MS = 2000; // how long a payment stays "pending"

// Only send public fields to the app
function toPublic(payment: StoredPayment): PaymentAttempt {
  // A made-up merchant UPI address. It is NOT a real account.
  const {
    scenario: _scenario,
    createdAtMs: _createdAtMs,
    ...publicFields
  } = payment;
  return publicFields;
}
const MERCHANT_VPA = "checkoutlab@mockbank";

function nextActionFor(
  method: PaymentMethod,
  paymentId: string,
  amountMinor: number,
): NextAction {
  if (method === "upi") {
    const params: Record<string, string> = {
      pa: MERCHANT_VPA, // payee address
      pn: "Checkout Lab", // payee name
      am: (amountMinor / 100).toFixed(2), // amount in rupees, e.g. "2710.46"
      cu: "INR",
      tr: paymentId, // our reference, so the payment can be matched later
      tn: "Checkout Lab order", // note shown in the UPI app
    };
    const query = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    return { type: "upi_intent", uri: `upi://pay?${query}` };
  }
  if (method === "card") {
    return { type: "card_form" };
  }
  return { type: "none" };
}

// Decide the outcome once the processing time has passed
export function settle(payment: StoredPayment) {
  if (payment.status !== "pending") return;
  if (Date.now() - payment.createdAtMs < PROCESSING_TIME_MS) return;
  if (payment.scenario === "payment_timeout") return; // stays pending forever

  if (payment.scenario === "payment_declined") {
    payment.status = "failed";
    payment.failureCode = "DECLINED";
    payment.failureMessage = "Your bank declined this payment";
  } else {
    payment.status = "succeeded";
  }
  payment.updatedAt = new Date().toISOString();
}

export async function paymentRoutes(app: FastifyInstance) {
  // Start a payment
  app.post<{ Body: CreatePaymentAttemptRequest }>(
    "/payments/attempts",
    async (request, reply) => {
      const body = request.body;

      if (!body || typeof body.quoteId !== "string") {
        return sendError(reply, 400, "VALIDATION", "quoteId is required", {
          quoteId: "Required",
        });
      }
      if (!PAYMENT_METHODS.includes(body.method)) {
        return sendError(
          reply,
          400,
          "VALIDATION",
          `method must be one of: ${PAYMENT_METHODS.join(", ")}`,
          {
            method: "Invalid payment method",
          },
        );
      }

      const quote = db.quotes.get(body.quoteId);
      if (!quote) {
        return sendError(reply, 404, "QUOTE_NOT_FOUND", "Quote not found");
      }
      if (new Date(quote.expiresAt) < new Date()) {
        return sendError(
          reply,
          410,
          "QUOTE_EXPIRED",
          "Prices may have changed. Please review your cart.",
        );
      }

      const now = new Date();
      const id = `pay_${randomUUID()}`;
      const payment: StoredPayment = {
        id,
        quoteId: quote.quoteId,
        method: body.method,
        amountMinor: quote.totalMinor, // amount always comes from the server's quote
        currency: "INR",
        // Cash on delivery needs no online payment, so it succeeds right away
        status: body.method === "cod" ? "succeeded" : "pending",
        failureCode: null,
        failureMessage: null,
        nextAction: nextActionFor(body.method, id, quote.totalMinor),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        scenario: scenarioFor(request),
        createdAtMs: now.getTime(),
      };
      db.payments.set(payment.id, payment);

      return reply.code(201).send(toPublic(payment));
    },
  );

  // Check a payment's status (the app keeps asking until it's no longer pending)
  app.get<{ Params: { id: string } }>(
    "/payments/attempts/:id",
    async (request, reply) => {
      const payment = db.payments.get(request.params.id);
      if (!payment) {
        return sendError(
          reply,
          404,
          "PAYMENT_NOT_FOUND",
          "Payment attempt not found",
        );
      }
      settle(payment);
      return toPublic(payment);
    },
  );

  // Cancel a payment that hasn't finished yet
  app.post<{ Params: { id: string } }>(
    "/payments/attempts/:id/cancel",
    async (request, reply) => {
      const payment = db.payments.get(request.params.id);
      if (!payment) {
        return sendError(
          reply,
          404,
          "PAYMENT_NOT_FOUND",
          "Payment attempt not found",
        );
      }
      settle(payment); // it may have finished in the meantime
      if (payment.status !== "pending") {
        return sendError(
          reply,
          409,
          "PAYMENT_NOT_CANCELLABLE",
          `Payment is already ${payment.status} and can't be cancelled`,
        );
      }
      payment.status = "cancelled";
      payment.updatedAt = new Date().toISOString();
      return toPublic(payment);
    },
  );
}
