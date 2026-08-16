import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestContext(request: Request, response: Response, next: NextFunction) {
  const requestId = typeof request.headers['x-request-id'] === 'string' && request.headers['x-request-id'].length <= 100 ? request.headers['x-request-id'] : randomUUID();
  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  const started = performance.now();
  response.on('finish', () => console.info(JSON.stringify({ event: 'http_request', requestId, method: request.method, path: request.path, status: response.statusCode, durationMs: Math.round(performance.now() - started), companyId: request.auth?.companyId })));
  next();
}
