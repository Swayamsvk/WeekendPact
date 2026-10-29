import type { FastifyInstance } from 'fastify';
import { sendError } from '../errors.js';
import { buildDeliveryOptions, isServiceable, isValidPincode } from '../delivery.js';
import type { DeliveryOptionsResponse } from '../types.js';

type Query = { pincode?: string; subtotalMinor?: string };

export async function deliveryRoutes(app: FastifyInstance) {
  // GET /delivery/options?pincode=560038&subtotalMinor=229700
  app.get<{ Querystring: Query }>('/delivery/options', async (request, reply) => {
    const pincode = request.query.pincode ?? '';
    const subtotalMinor = Number(request.query.subtotalMinor ?? 0);

    if (!isValidPincode(pincode)) {
      return sendError(reply, 400, 'VALIDATION', 'Pincode must be 6 digits', {
        pincode: 'Pincode must be 6 digits',
      });
    }
    if (!Number.isInteger(subtotalMinor) || subtotalMinor < 0) {
      return sendError(reply, 400, 'VALIDATION', 'subtotalMinor must be a whole number');
    }
    if (!isServiceable(pincode)) {
      return sendError(reply, 422, 'PINCODE_NOT_SERVICEABLE', "Sorry, we don't deliver to this pincode yet", {
        pincode: "We don't deliver here yet",
      });
    }

    const response: DeliveryOptionsResponse = {
      pincode,
      options: buildDeliveryOptions(pincode, subtotalMinor),
    };
    return response;
  });
}
