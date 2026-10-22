import type { FastifyInstance } from 'fastify';
import { db } from '../store.js';
import { sendError } from '../errors.js';

export async function productRoutes(app: FastifyInstance) {
  // GET /products → all products
  app.get('/products', async () => {
    return { items: db.products };
  });

  // GET /products/:id → one product, or 404
  app.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const product = db.products.find(p => p.id === request.params.id);
    if (!product) {
      return sendError(reply, 404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    return product;
  });
}
