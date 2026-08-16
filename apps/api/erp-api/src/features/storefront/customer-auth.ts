import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { query } from '../../db/client.js';
import { HttpError } from '../../lib/http.js';

type CustomerToken = { sub: string; companyId: string; kind: 'customer' };

export function signCustomerToken(customerId: string, companyId: string) {
  return jwt.sign({ companyId, kind: 'customer' }, env.JWT_SECRET, { subject: customerId, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export async function authenticateCustomer(request: Request, _response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new HttpError(401, 'CUSTOMER_AUTH_REQUIRED', 'Customer authentication is required'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as CustomerToken;
    if (payload.kind !== 'customer') throw new Error('Wrong token kind');
    const customer = await query('SELECT 1 FROM customers WHERE id=$1 AND company_id=$2 AND is_active=true AND password_hash IS NOT NULL', [payload.sub, payload.companyId]);
    if (!customer.rowCount) return next(new HttpError(401, 'CUSTOMER_INACTIVE', 'Customer account is unavailable'));
    request.customerAuth = { customerId: payload.sub, companyId: payload.companyId };
    next();
  } catch {
    next(new HttpError(401, 'INVALID_CUSTOMER_TOKEN', 'Customer access token is invalid or expired'));
  }
}
