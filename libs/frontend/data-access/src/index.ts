export interface ApiEnvelope<T> { data: T; meta?: { page?: number; pageSize?: number; total?: number } }
export interface ApiPage<T> { data: T[]; page: number; pageSize: number; total: number }

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
  }
}

const apiUrl = import.meta.env.VITE_API_URL || '/api';
let accessToken = typeof localStorage === 'undefined' ? null : localStorage.getItem('erp_access_token');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('erp_access_token', token);
    else localStorage.removeItem('erp_access_token');
  }
}

export function hasStoredToken() { return Boolean(accessToken); }

async function parse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const body = await response.json().catch(() => null) as (ApiEnvelope<T> & { error?: { code?: string; message?: string; details?: unknown } }) | null;
  if (!response.ok) {
    const details=body?.error?.details;
    const issue=Array.isArray(details)?details[0] as {path?:unknown[];message?:string}:null;
    const base=body?.error?.message ?? `API request failed: ${response.status}`;
    const message=issue?.message?`${base}: ${issue.path?.join('.') ? `${issue.path.join('.')}: ` : ''}${issue.message}`:base;
    if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("erp:toast",{detail:{type:"error",message}}));
    throw new ApiRequestError(response.status, body?.error?.code ?? 'REQUEST_FAILED', message, details);
  }
  return body as ApiEnvelope<T>;
}

export async function apiPublicRequest<T>(path: string, init: RequestInit = {}) {
  return (await apiPublicEnvelopeRequest<T>(path, init)).data;
}

export async function apiPublicEnvelopeRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  return parse<T>(response);
}

export async function apiEnvelopeRequest<T>(path: string, init: RequestInit = {}) {
  if (!accessToken) throw new ApiRequestError(401, 'UNAUTHORIZED', 'Authentication is required');
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401) {
    setAccessToken(null);
    window.dispatchEvent(new Event('erp:unauthorized'));
  }
  if (response.status === 204) {
    if(init.method&&init.method!=="GET")window.dispatchEvent(new CustomEvent("erp:toast",{detail:{type:"success",message:"Operation completed successfully."}}));
    return { data: undefined as T };
  }
  const result=await parse<T>(response);
  if(init.method&&init.method!=="GET")window.dispatchEvent(new CustomEvent("erp:toast",{detail:{type:"success",message:"Operation completed successfully."}}));
  return result;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) { return (await apiEnvelopeRequest<T>(path, init)).data; }
export async function apiDownload(path: string) {
  if (!accessToken) throw new ApiRequestError(401, 'UNAUTHORIZED', 'Authentication is required');
  const response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) await parse<never>(response);
  return { blob: await response.blob(), filename: response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'download.csv' };
}
export function apiGet<T>(path: string) { return apiRequest<T>(path); }
export async function apiPageRequest<T>(path: string): Promise<ApiPage<T>> {
  const envelope = await apiEnvelopeRequest<T[]>(path);
  return { data: envelope.data, page: envelope.meta?.page ?? 1, pageSize: envelope.meta?.pageSize ?? envelope.data.length, total: envelope.meta?.total ?? envelope.data.length };
}
