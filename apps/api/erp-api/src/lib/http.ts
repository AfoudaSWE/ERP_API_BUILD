import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function validate<T>(schema: ZodType<T>, input: unknown): T {
  return schema.parse(input);
}

export function notFound(_request: Request, _response: Response, next: NextFunction) {
  next(new HttpError(404, 'NOT_FOUND', 'The requested resource was not found'));
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.issues } });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  const databaseError = error as { code?: string; detail?: string };
  if (databaseError.code === '23505') {
    response.status(409).json({ error: { code: 'DUPLICATE', message: 'A record with this unique value already exists' } });
    return;
  }
  console.error(error);
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}
