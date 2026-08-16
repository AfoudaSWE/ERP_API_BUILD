import { checkOllama, chatWithOllama, getOllamaConfig } from '../../../services/ollamaService';

const AGENT_NODE_TYPES = new Set([
  'aiAgent',
  'retailAnalystAgent',
  'inventoryAgent',
  'storeOperationsAgent',
  'queueOptimizationAgent',
  'salesAnalystAgent',
  'summarizer',
  'classifier',
]);

export function isOllamaAgentNode(nodeType) {
  return AGENT_NODE_TYPES.has(nodeType);
}

function parseStructuredResponse(text) {
  const candidate = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || text;
  try {
    const parsed = JSON.parse(candidate.trim());
    return {
      recommendation: parsed.recommendation || parsed.summary || text,
      reasoning: parsed.reasoning || parsed.rationale || null,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
      structured: parsed,
    };
  } catch {
    return { recommendation: text, reasoning: null, actions: [], confidence: null, structured: null };
  }
}

export const ollamaWorkflowProvider = {
  async run({ node, workflowContext, signal }) {
    if (signal?.aborted) throw new DOMException('Workflow execution cancelled.', 'AbortError');
    const config = getOllamaConfig();
    const model = node.data.config?.model || config.model;
    let health;
    try {
      health = await checkOllama(model);
    } catch (error) {
      throw new Error(`Ollama is unavailable. Start it with: ollama serve. ${error.message}`);
    }
    if (!health.available) {
      throw new Error(`Model ${model} is not available. Run: ollama pull ${model}`);
    }

    const systemInstruction = node.data.config?.systemInstruction
      || `Act as ${node.data.config?.role || 'a retail operations analyst'}. Analyze the supplied RetailTwin workflow data. Recommend only safe, store-scoped operational actions. Do not claim an action was executed.`;
    const prompt = `${systemInstruction}\n\nReturn concise JSON with keys: recommendation, reasoning, actions, confidence. Do not include credentials or request unrestricted access.`;
    const startedAt = performance.now();
    const text = await chatWithOllama([
      { role: 'user', content: prompt },
    ], workflowContext, {
      temperature: node.data.config?.temperature ?? 0.2,
      numPredict: 700,
      model,
    });
    if (signal?.aborted) throw new DOMException('Workflow execution cancelled.', 'AbortError');
    const parsed = parseStructuredResponse(text);
    return {
      demoData: false,
      provider: 'ollama',
      model,
      durationMs: Math.round(performance.now() - startedAt),
      rawResponse: text,
      ...parsed,
    };
  },
};
