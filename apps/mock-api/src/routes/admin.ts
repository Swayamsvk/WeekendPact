import type { FastifyInstance } from 'fastify';
import { resetDb } from '../store.js';
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
}
