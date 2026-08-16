export const ROLE_PERMISSIONS = {
  'Super Admin':['*'],
  'Company Owner':['agentWorkflow.view','agentWorkflow.create','agentWorkflow.edit','agentWorkflow.publish','agentWorkflow.activate','agentWorkflow.execute','agentWorkflow.delete','agentWorkflow.viewExecutions','agentWorkflow.approveActions'],
  'System Admin':['agentWorkflow.view','agentWorkflow.create','agentWorkflow.edit','agentWorkflow.publish','agentWorkflow.activate','agentWorkflow.execute','agentWorkflow.viewExecutions','agentWorkflow.manageConnections','agentWorkflow.manageTools'],
  'Branch Manager':['agentWorkflow.view','agentWorkflow.execute','agentWorkflow.viewExecutions','agentWorkflow.approveActions'],
  'Inventory Manager':['agentWorkflow.view','agentWorkflow.execute','agentWorkflow.viewExecutions','agentWorkflow.approveActions'],
  'Operations Manager':['agentWorkflow.view','agentWorkflow.execute','agentWorkflow.viewExecutions','agentWorkflow.approveActions'],
  Cashier:[],
};
export const can = (role, permission) => ROLE_PERMISSIONS[role]?.includes('*') || ROLE_PERMISSIONS[role]?.includes(permission);
export function assertToolAccess(tool, context) {
  if (!tool.enabled) throw new Error('Tool is disabled.');
  if (tool.allowedRoles?.length && !tool.allowedRoles.includes(context.role)) throw new Error('Your role cannot execute this tool.');
  if (tool.allowedStores?.length && !tool.allowedStores.includes(context.storeId)) throw new Error('Tool is outside your store scope.');
  return true;
}
