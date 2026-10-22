import type { FastifyReply } from 'fastify';
import type { ApiErrorBody } from './types.js';

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  errors?: Record<string, string>,
) {
  const body: ApiErrorBody = errors ? { code, message, errors } : { code, message };
  return reply.code(status).send(body);
}
