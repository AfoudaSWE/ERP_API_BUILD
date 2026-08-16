import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { HttpError, validate } from '../../lib/http.js';
import { getActiveStore } from './store.js';
import { listPublicProducts } from './catalog-service.js';

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(1200),
  })).min(1).max(10),
});

type OllamaResult = { model?: string; done?: boolean; message?: { content?: string } };

export const storefrontRouter = Router();

const requestWindows = new Map<string, { count: number; resetAt: number }>();
storefrontRouter.use((request, response, next) => {
  const key = request.ip || 'unknown';
  const now = Date.now();
  const current = requestWindows.get(key);
  const window = !current || current.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : current;
  window.count += 1;
  requestWindows.set(key, window);
  response.setHeader('RateLimit-Limit', '20');
  response.setHeader('RateLimit-Remaining', String(Math.max(0, 20 - window.count)));
  if (window.count > 20) {
    response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait before asking Nova again' } });
    return;
  }
  next();
});

storefrontRouter.get('/status', async (_request, response) => {
  try {
    const result = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    response.json({ data: { connected: result.ok, model: env.OLLAMA_MODEL } });
  } catch {
    response.json({ data: { connected: false, model: env.OLLAMA_MODEL } });
  }
});

storefrontRouter.post('/chat', async (request, response) => {
  const input = validate(requestSchema, request.body);
  const store = await getActiveStore();
  const catalog = (await listPublicProducts(store.company_id, { page: 1, pageSize: 50, sort: 'newest' })).products.map((product) => ({
    name: product.name, category: product.categoryName, brand: product.brand, price: product.price, currency: product.currency,
    availability: product.availability, description: product.description,
  }));
  const systemPrompt = `You are Nova, a concise shopping concierge for a premium design store.
Recommend only products in the supplied catalog. Ask one helpful question when the request is unclear.
Respect the shopper's budget and explain trade-offs honestly. Never invent product capabilities, prices, discounts, inventory, or policies.
Keep answers friendly and useful, normally under 90 words. Do not output HTML.
PUBLISHED CATALOG: ${JSON.stringify(catalog)}`;

  let ollamaResponse: globalThis.Response;
  try {
    ollamaResponse = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        stream: false,
        think: false,
        messages: [{ role: 'system', content: systemPrompt }, ...input.messages],
        options: { temperature: 0.35 },
      }),
      signal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name);
    throw new HttpError(timedOut ? 504 : 503, timedOut ? 'OLLAMA_TIMEOUT' : 'OLLAMA_UNAVAILABLE', timedOut ? 'The shopping assistant timed out' : 'The shopping assistant is unavailable');
  }
  if (!ollamaResponse.ok) throw new HttpError(502, 'OLLAMA_ERROR', 'The shopping assistant could not generate a response');
  const result = await ollamaResponse.json() as OllamaResult;
  const content = typeof result.message?.content === 'string'
    ? result.message.content.replace(/<[^>]*>/g, ' ').split('').filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    }).join('').trim().slice(0, 2000)
    : '';
  if (!result.done || !content) throw new HttpError(502, 'INVALID_AI_RESPONSE', 'The shopping assistant returned an invalid response');
  response.json({ data: { content, model: result.model || env.OLLAMA_MODEL } });
});
