import { describe,expect,it } from 'vitest';
import { findCycle,resolveExpression,validateWorkflow } from '../domain/graph';

const node=(id,category='retail',nodeType=id,config={})=>({id,data:{label:id,category,nodeType,config}});
describe('safe workflow expressions',()=>{
  it('resolves allow-listed property paths',()=>expect(resolveExpression('Wait {{ trigger.payload.queueLength }}', {trigger:{payload:{queueLength:8}}})).toBe('Wait 8'));
  it('rejects executable expressions',()=>expect(()=>resolveExpression('{{ globalThis.process.exit() }}',{})).toThrow('Unsafe expression'));
});
describe('workflow graph validation',()=>{
  it('detects cycles',()=>{const nodes=[node('trigger','trigger'),node('work')];const edges=[{id:'a',source:'trigger',target:'work'},{id:'b',source:'work',target:'trigger'}];expect(findCycle(nodes,edges)).toBeTruthy();expect(validateWorkflow(nodes,edges).errors.some(e=>e.code==='CYCLE')).toBe(true)});
  it('accepts a connected acyclic workflow',()=>{const nodes=[node('trigger','trigger'),node('work')];expect(validateWorkflow(nodes,[{id:'a',source:'trigger',target:'work'}]).valid).toBe(true)});
});
