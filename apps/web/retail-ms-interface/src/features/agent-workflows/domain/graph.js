const PATH = /^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/;

export function resolveExpression(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
    if (!PATH.test(path)) throw new Error(`Unsafe expression: ${path}`);
    const value = path.split('.').reduce((current, key) => current?.[key], context);
    if (value === undefined) throw new Error(`Unknown variable: ${path}`);
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

export function findCycle(nodes, edges) {
  const graph = new Map(nodes.map(node => [node.id, []]));
  edges.forEach(edge => graph.get(edge.source)?.push(edge.target));
  const visiting = new Set(), visited = new Set(), path = [];
  const visit = id => {
    if (visiting.has(id)) return [...path.slice(path.indexOf(id)), id];
    if (visited.has(id)) return null;
    visiting.add(id); path.push(id);
    for (const next of graph.get(id) || []) { const cycle = visit(next); if (cycle) return cycle; }
    path.pop(); visiting.delete(id); visited.add(id); return null;
  };
  for (const node of nodes) { const cycle = visit(node.id); if (cycle) return cycle; }
  return null;
}

export function validateWorkflow(nodes, edges) {
  const errors = [];
  if (!nodes.length) errors.push({ code:'EMPTY_GRAPH', message:'Add at least one node.' });
  const triggers = nodes.filter(n => n.data.category === 'trigger');
  if (!triggers.length) errors.push({ code:'MISSING_TRIGGER', message:'Workflow requires a trigger.' });
  if (triggers.length > 1) errors.push({ code:'MULTIPLE_TRIGGERS', message:'Workflow can have only one trigger.' });
  const ids = new Set(nodes.map(n => n.id));
  edges.forEach(edge => { if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push({ code:'INVALID_EDGE', message:`Edge ${edge.id} references a missing node.` }); });
  const cycle = findCycle(nodes, edges);
  if (cycle && !cycle.some(id => nodes.find(n=>n.id===id)?.data.nodeType === 'loop')) errors.push({ code:'CYCLE', message:'Cycles require an explicit Loop node.' });
  nodes.forEach(node => {
    if (!node.data.label?.trim()) errors.push({ code:'INVALID_NODE', nodeId:node.id, message:'Node label is required.' });
    if (node.data.nodeType === 'retailEventTrigger' && !node.data.config?.eventType) errors.push({ code:'INVALID_CONFIG', nodeId:node.id, message:'Retail event type is required.' });
  });
  return { valid:errors.length===0, errors };
}

export function topologicalOrder(nodes, edges) {
  const incoming = new Map(nodes.map(n=>[n.id,0]));
  const outgoing = new Map(nodes.map(n=>[n.id,[]]));
  edges.forEach(e=>{ incoming.set(e.target,(incoming.get(e.target)||0)+1); outgoing.get(e.source)?.push(e.target); });
  const queue = nodes.filter(n=>(incoming.get(n.id)||0)===0).map(n=>n.id), result=[];
  while(queue.length){ const id=queue.shift(); result.push(id); for(const next of outgoing.get(id)||[]){ incoming.set(next,incoming.get(next)-1); if(incoming.get(next)===0) queue.push(next); } }
  return result;
}
