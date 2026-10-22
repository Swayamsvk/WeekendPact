import Fastify from 'fastify';
import { scenarioFor } from './scenarios.js';
import { sendError } from './errors.js';
import { productRoutes } from './routes/products.js';
import { pricingRoutes } from './routes/pricing.js';
import { paymentRoutes } from './routes/payments.js';
import { orderRoutes } from './routes/orders.js';
import { adminRoutes } from './routes/admin.js';

const app = Fastify({ logger: true });

// Runs before every endpoint: applies "slow" and "server_error"
app.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/__mock') || request.url === '/health') {
    return; // never break the controls
  }
  const scenario = scenarioFor(request);
  if (scenario === 'slow') {
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  if (scenario === 'server_error') {
    return sendError(reply, 500, 'INTERNAL', 'Mock server error');
  }
});

app.get('/health', async () => ({ ok: true }));

await app.register(productRoutes);
await app.register(pricingRoutes);
await app.register(paymentRoutes);
await app.register(orderRoutes);
await app.register(adminRoutes);

await app.listen({ host: '0.0.0.0', port: 4000 });
