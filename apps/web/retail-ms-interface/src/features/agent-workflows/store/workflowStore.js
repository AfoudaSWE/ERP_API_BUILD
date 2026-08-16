import { create } from 'zustand';
import { WORKFLOW_TEMPLATES } from '../domain/templates';

const STORAGE='retail-twin-agent-workflows-v1', EXECUTIONS='retail-twin-workflow-executions-v1', CONNECTIONS='retail-twin-agent-connections-v1';
const read=(key,fallback)=>{ try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback} };
const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const seed=()=>WORKFLOW_TEMPLATES.slice(0,2).map((template,index)=>({ ...structuredClone(template),id:`workflow_${index+1}`,name:template.name,description:template.description,status:index?'draft':'active',version:index?1:3,owner:'Retail Manager',tags:index?['inventory']:['queue','operations'],updatedAt:new Date(Date.now()-index*86400000).toISOString(),lastExecution:index?null:new Date(Date.now()-3600000).toISOString(),successRate:index?null:96,averageDuration:index?null:4200,executionsToday:index?0:7 }));

export const useWorkflowStore=create((set,get)=>({
  workflows:read(STORAGE,seed()), executions:read(EXECUTIONS,[]), connections:read(CONNECTIONS,[{id:'ollama_local',type:'ollama',name:'Local Ollama',status:'unknown',baseUrl:'Server-managed',model:'qwen2.5-coder:7b',lastTestedAt:null}]),
  saveWorkflow:workflow=>set(state=>{ const exists=state.workflows.some(w=>w.id===workflow.id); const next={...workflow,updatedAt:new Date().toISOString()}; const workflows=exists?state.workflows.map(w=>w.id===next.id?next:w):[next,...state.workflows]; save(STORAGE,workflows); return {workflows}; }),
  deleteWorkflow:id=>set(state=>{const workflows=state.workflows.filter(w=>w.id!==id);save(STORAGE,workflows);return{workflows}}),
  addExecution:execution=>set(state=>{const executions=[execution,...state.executions.filter(e=>e.id!==execution.id)].slice(0,100);save(EXECUTIONS,executions);return{executions}}),
  updateExecution:execution=>set(state=>{const executions=[execution,...state.executions.filter(e=>e.id!==execution.id)].slice(0,100);save(EXECUTIONS,executions);return{executions}}),
  resetExecutions:()=>{save(EXECUTIONS,[]);set({executions:[]})},
  addConnection:connection=>set(state=>{const connections=[connection,...state.connections];save(CONNECTIONS,connections);return{connections}}),
  updateConnection:(id,updates)=>set(state=>{const connections=state.connections.map(connection=>connection.id===id?{...connection,...updates}:connection);save(CONNECTIONS,connections);return{connections}}),
  removeConnection:id=>set(state=>{const connections=state.connections.filter(c=>c.id!==id);save(CONNECTIONS,connections);return{connections}}),
  getWorkflow:id=>get().workflows.find(w=>w.id===id),
}));
