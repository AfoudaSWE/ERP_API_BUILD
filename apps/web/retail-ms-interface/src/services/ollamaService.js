const DEFAULT_CONFIG = {
  endpoint: import.meta.env.DEV ? '/ollama' : 'http://127.0.0.1:11434',
  model: 'qwen2.5-coder:7b',
};

export function getOllamaConfig() {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const saved = JSON.parse(window.localStorage.getItem('retail-twin-ollama') || '{}');
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveOllamaConfig(config) {
  const next = { ...DEFAULT_CONFIG, ...config };
  window.localStorage.setItem('retail-twin-ollama', JSON.stringify(next));
  warmupPromise = null;
  return next;
}

const cleanEndpoint = endpoint => endpoint.replace(/\/+$/, '');
let warmupPromise = null;

async function ollamaFetch(path, options = {}, timeoutMs = 600000) {
  const { endpoint } = getOllamaConfig();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${cleanEndpoint(endpoint)}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Ollama returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Ollama did not respond within 10 minutes');
    throw new Error(`${error.message}. Ensure Ollama is running and OLLAMA_ORIGINS allows this app.`);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkOllama(modelOverride) {
  const config = getOllamaConfig();
  const model = modelOverride || config.model;
  const data = await ollamaFetch('/api/tags', {}, 8000);
  const models = (data.models || []).map(item => item.name);
  const available = models.some(name => name === model || name.startsWith(`${model}:`));
  return { online: true, available, models, config: { ...config, model } };
}

export async function warmOllama() {
  if (warmupPromise) return warmupPromise;
  const { model } = getOllamaConfig();
  warmupPromise = ollamaFetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model,
      prompt: 'Reply READY',
      stream: false,
      think: false,
      keep_alive: '30m',
      options: { temperature: 0, num_predict: 4, num_ctx: 2048 },
    }),
  }, 600000);
  try {
    await warmupPromise;
    return true;
  } catch (error) {
    warmupPromise = null;
    throw error;
  }
}

export async function chatWithOllama(messages, operationalContext, options = {}) {
  const config = getOllamaConfig();
  const model = options.model || config.model;
  const system = `You are RetailTwin AI, a concise retail operations copilot. Analyze only the provided aggregated store data. Never claim to identify people or use facial recognition. Give specific, numerical, practical recommendations. Currency is EGP. If evidence is insufficient, say so.\n\nCURRENT STORE CONTEXT:\n${JSON.stringify(operationalContext)}`;
  const request = {
    model,
    stream: false,
    think: false,
    keep_alive: '30m',
    messages: [{ role: 'system', content: system }, ...messages],
    options: {
      temperature: options.temperature ?? 0.25,
      num_predict: options.numPredict ?? 700,
      num_ctx: 8192,
    },
  };
  const data = await ollamaFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  }, 600000);
  return data.message?.content?.trim() || 'The local model returned an empty response.';
}

export async function streamChatWithOllama(messages, operationalContext, onToken, options = {}) {
  if (warmupPromise) await warmupPromise.catch(() => undefined);
  const { endpoint, model } = getOllamaConfig();
  const controller = new AbortController();
  const startupTimeout = window.setTimeout(() => controller.abort(), 600000);
  const system = `You are RetailTwin AI, a concise retail operations copilot. Analyze only the provided aggregated store data. Never claim to identify people or use facial recognition. Give specific, numerical, practical recommendations. Currency is EGP. If evidence is insufficient, say so.\n\nCURRENT STORE CONTEXT:\n${JSON.stringify(operationalContext)}`;

  try {
    const response = await fetch(`${cleanEndpoint(endpoint)}/api/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        think: false,
        keep_alive: '30m',
        messages: [{ role: 'system', content: system }, ...messages],
        options: {
          temperature: options.temperature ?? 0.25,
          num_predict: options.numPredict ?? 600,
          num_ctx: 8192,
        },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Ollama returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    if (!response.body) throw new Error('Streaming is not supported by this browser');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let inactivityTimeout;
    const resetInactivityTimeout = () => {
      window.clearTimeout(inactivityTimeout);
      inactivityTimeout = window.setTimeout(() => controller.abort(), 180000);
    };
    window.clearTimeout(startupTimeout);
    resetInactivityTimeout();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      resetInactivityTimeout();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);
        if (chunk.error) throw new Error(chunk.error);
        const token = chunk.message?.content || '';
        if (token) {
          fullText += token;
          onToken?.(fullText, token);
        }
      }
    }
    window.clearTimeout(inactivityTimeout);
    return fullText.trim() || 'The local model returned an empty response.';
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Qwen stopped responding. The model may still be loading; check available RAM and retry.');
    throw new Error(`${error.message}. Ensure Ollama is running and the selected model is installed.`);
  } finally {
    window.clearTimeout(startupTimeout);
  }
}

export async function generateOperationsBrief(context) {
  return chatWithOllama([
    {
      role: 'user',
      content: 'Create a concise operations brief with: Executive summary, top 3 risks, top 3 opportunities, and an action plan for the next four hours. Use markdown bullets and cite the metrics you used.',
    },
  ], context, { temperature: 0.2, numPredict: 900 });
}
