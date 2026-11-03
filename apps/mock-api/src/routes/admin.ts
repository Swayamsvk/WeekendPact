import type { FastifyInstance } from 'fastify';
import { db, resetDb } from '../store.js';
import { SCENARIOS, getGlobalScenario, isScenario, setGlobalScenario } from '../scenarios.js';
import { sendError } from '../errors.js';

export async function adminRoutes(app: FastifyInstance) {
  // POST /__mock/reset → fresh data + happy scenario
  app.post('/__mock/reset', async () => {
    resetDb();
    setGlobalScenario('happy');
    return { ok: true };
  });

  // GET /__mock/scenario → current scenario
  app.get('/__mock/scenario', async () => {
    return { scenario: getGlobalScenario(), available: SCENARIOS };
  });

  // POST /__mock/scenario { "scenario": "server_error" }
  app.post<{ Body: { scenario?: unknown } }>('/__mock/scenario', async (request, reply) => {
    const scenario = request.body?.scenario;
    if (!isScenario(scenario)) {
      return sendError(reply, 400, 'INVALID_SCENARIO', `Use one of: ${SCENARIOS.join(', ')}`);
    }
    setGlobalScenario(scenario);
    return { ok: true, scenario };
  });

  // POST /__mock/payments/complete-pending { "status": "succeeded" | "failed" }
  // Finishes every payment that's still pending: simulates a late bank response.
  app.post<{ Body: { status?: unknown } }>('/__mock/payments/complete-pending', async (request, reply) => {
    const status = request.body?.status;
    if (status !== 'succeeded' && status !== 'failed') {
      return sendError(reply, 400, 'VALIDATION', 'status must be "succeeded" or "failed"');
    }

    let completed = 0;
    for (const payment of db.payments.values()) {
      if (payment.status !== 'pending') continue;
      payment.status = status;
      if (status === 'failed') {
        payment.failureCode = 'DECLINED';
        payment.failureMessage = 'Your bank declined this payment';
      }
      payment.updatedAt = new Date().toISOString();
      completed++;
    }
    return { ok: true, completed };
  });
}
