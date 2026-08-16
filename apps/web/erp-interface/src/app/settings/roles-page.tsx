import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Filter, Search, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiRequest } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { CustomRoleManager } from './CustomRoleManager';

type Role = { role: string; name?: string; nameAr?: string; description?: string; descriptionAr?: string; scopeLevel?: string; accessRank?: number; permissions: string[]; isDefault: boolean; isActive?: boolean };
type Permission = { code: string; description: string; module: string; action: string };
type ManagedUser = { id: string; name: string; email: string; role: string; isActive: boolean };

const readActions = new Set(['read', 'view']);
const approvalActions = new Set(['approve', 'post', 'close', 'reopen', 'process']);
function accessLabel(actions: string[], ar: boolean) {
  if (!actions.length) return ar ? 'لا وصول' : 'No access';
  if (actions.includes('manage') || actions.includes('delete')) return ar ? 'وصول كامل' : 'Full access';
  if (actions.some((action) => approvalActions.has(action))) return ar ? 'وصول اعتماد' : 'Approval access';
  if (actions.every((action) => readActions.has(action))) return ar ? 'قراءة فقط' : 'Read only';
  return ar ? 'وصول تعديل' : 'Edit access';
}
function groupByModule(items: Permission[]) {
  return Object.entries(items.reduce<Record<string, Permission[]>>((groups, permission) => {
    (groups[permission.module] ??= []).push(permission);
    return groups;
  }, {}));
}

export default function RolesPage() {
  const { can, user } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [roleData, permissionData, userData] = await Promise.all([apiRequest<Role[]>('/roles'), apiRequest<Permission[]>('/roles/permissions'), apiRequest<ManagedUser[]>('/roles/users')]);
      setRoles(roleData); setPermissions(permissionData); setUsers(userData); setError('');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load roles'); }
  }
  useEffect(() => { const timer = can('roles.read') ? window.setTimeout(() => void load(), 0) : undefined; return () => window.clearTimeout(timer); }, [can]);

  const visibleRoles = useMemo(() => roles.filter((role) => !roleFilter || role.role === roleFilter).filter((role) => {
    const term = search.toLowerCase();
    return !term || [role.role, role.name, role.nameAr, role.description, role.descriptionAr, ...role.permissions].some((value) => value?.toLowerCase().includes(term));
  }), [roleFilter, roles, search]);
  const modules = useMemo(() => [...new Set(permissions.map((permission) => permission.module))].sort(), [permissions]);
  const actorRank = roles.find((role) => role.role === user?.role)?.accessRank ?? 100;
  const assignableRoles = roles.filter((role) => user?.role === 'super_admin' || (role.accessRank !== undefined ? role.accessRank >= actorRank : role.permissions.every((permission) => user?.permissions.includes(permission))));

  if (!can('roles.read')) return <AppLayout><div className="card p-8 text-center"><h1 className="text-xl font-bold">403 — {ar ? 'غير مصرح' : 'Permission denied'}</h1></div></AppLayout>;

  async function changeRole(userId: string, role: string) {
    if (!window.confirm(ar ? 'تغيير الدور قد يمنح صلاحيات حساسة. هل تريد المتابعة؟' : 'Changing this role may grant sensitive permissions. Continue?')) return;
    setSaving(true);
    try { await apiRequest(`/roles/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role, confirmSensitive: true }) }); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to change role'); }
    finally { setSaving(false); }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    try { await apiRequest('/roles/users', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); event.currentTarget.reset(); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create user'); }
    finally { setSaving(false); }
  }

  return <AppLayout>
    <div className="mb-6 flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-primary-600" /><div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'الأدوار والصلاحيات' : 'Roles & permissions'}</h1><p className="text-navy-500">{ar ? 'صلاحيات مجمعة حسب الوحدة والإجراء' : 'Permissions grouped by module and action'}</p></div></div>
    {error && <div role="alert" className="mb-5 rounded-xl bg-danger-50 p-4 text-danger-700">{error}</div>}
    {can('roles.manage') && <CustomRoleManager roles={roles} permissions={permissions} ar={ar} saving={saving} setSaving={setSaving} reload={load} />}
    <div className="card mb-6 grid grid-cols-1 gap-3 p-4 md:grid-cols-3"><label className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-navy-400" /><input className="input ps-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={ar ? 'بحث عن دور أو صلاحية' : 'Search role or permission'} /></label><select className="select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">{ar ? 'كل الأدوار' : 'All roles'}</option>{roles.map((role) => <option key={role.role} value={role.role}>{ar ? role.nameAr || role.name || role.role : role.name || role.role}</option>)}</select><label className="relative"><Filter className="absolute start-3 top-3 h-4 w-4 text-navy-400" /><select className="select ps-9" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}><option value="">{ar ? 'كل الوحدات' : 'All modules'}</option>{modules.map((module) => <option key={module}>{module}</option>)}</select></label></div>
    {can('roles.manage') && <form onSubmit={createUser} className="card mb-6"><div className="card-header"><h2 className="font-semibold">{ar ? 'إنشاء مستخدم' : 'Create user'}</h2></div><div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4"><input className="input" name="name" placeholder={ar ? 'الاسم الكامل' : 'Full name'} required minLength={2} /><input className="input" name="email" type="email" placeholder={ar ? 'البريد الإلكتروني' : 'Email'} required /><input className="input" name="password" type="password" placeholder={ar ? 'كلمة مرور مؤقتة' : 'Temporary password'} required minLength={8} /><select className="select" name="role" required><option value="">{ar ? 'اختر الدور' : 'Select role'}</option>{assignableRoles.map((role) => <option key={role.role} value={role.role}>{ar ? role.nameAr || role.name || role.role : role.name || role.role}</option>)}</select></div><div className="flex justify-end border-t border-navy-200 p-5"><button disabled={saving} className="btn btn-primary btn-sm">{ar ? 'إنشاء' : 'Create'}</button></div></form>}
    <section className="card mb-6"><div className="card-header"><h2 className="font-semibold">{ar ? 'المستخدمون' : 'Users'}</h2></div><div className="table-container"><table className="table"><thead><tr><th>{ar ? 'المستخدم' : 'User'}</th><th>{ar ? 'البريد' : 'Email'}</th><th>{ar ? 'الدور' : 'Role'}</th></tr></thead><tbody>{users.map((managed) => <tr key={managed.id}><td>{managed.name}</td><td>{managed.email}</td><td>{can('roles.manage') ? <select disabled={saving} className="select max-w-64" value={managed.role} onChange={(event) => void changeRole(managed.id, event.target.value)}>{assignableRoles.map((role) => <option key={role.role} value={role.role}>{ar ? role.nameAr || role.name || role.role : role.name || role.role}</option>)}</select> : <span className="badge badge-primary">{managed.role}</span>}</td></tr>)}</tbody></table></div></section>
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">{visibleRoles.map((role) => { const grouped = groupByModule(role.permissions.map((code) => permissions.find((permission) => permission.code === code) ?? { code, description: code, module: code.split('.')[0], action: code.split('.')[1] ?? '' }).filter((permission) => !moduleFilter || permission.module === moduleFilter)); return <article key={role.role} className="card p-5"><div className="mb-4"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-navy-900 dark:text-white">{ar ? role.nameAr || role.name || role.role : role.name || role.role}</h2><span className="badge badge-gray">{role.scopeLevel || 'custom'}</span><span className="badge badge-primary">{role.isDefault ? (ar ? 'افتراضي / موروث' : 'Default / inherited') : (ar ? 'مخصص' : 'Custom')}</span></div><p className="mt-1 text-sm text-navy-500">{ar ? role.descriptionAr || role.description : role.description}</p></div><div className="space-y-4">{grouped.map(([module, items]) => { const actions = items.map((item) => item.action); return <div key={module} className="rounded-lg border border-navy-200 p-3 dark:border-navy-700"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-medium capitalize">{module}</h3><span className="badge badge-gray">{accessLabel(actions, ar)}</span></div><div className="flex flex-wrap gap-2">{items.map((permission) => <span title={permission.description} key={permission.code} className="badge badge-gray">{permission.action}</span>)}</div></div>; })}{!grouped.length && <p className="text-sm text-navy-500">{ar ? 'لا توجد صلاحيات مطابقة.' : 'No matching permissions.'}</p>}</div></article>; })}</section>
  </AppLayout>;
}
