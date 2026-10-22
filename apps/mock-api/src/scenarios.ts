import type { FastifyRequest } from 'fastify';

export const SCENARIOS = [
  'happy',
  'slow',
  'server_error',
  'out_of_stock',
  'coupon_invalid',
  'payment_declined',
  'payment_timeout',
] as const;

export type Scenario = (typeof SCENARIOS)[number];

export function isScenario(value: unknown): value is Scenario {
  return typeof value === 'string' && (SCENARIOS as readonly string[]).includes(value);
}

let globalScenario: Scenario = 'happy';

export function getGlobalScenario(): Scenario {
  return globalScenario;
}

export function setGlobalScenario(scenario: Scenario) {
  globalScenario = scenario;
}

// A request header wins over the global setting
export function scenarioFor(request: FastifyRequest): Scenario {
  const header = request.headers['x-mock-scenario'];
  return isScenario(header) ? header : globalScenario;
}
