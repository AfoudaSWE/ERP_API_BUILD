import { Fragment, useEffect, useMemo, useState } from 'react';
import { Filter, Save, Search, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiRequest } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { CustomRoleManager } from './CustomRoleManager';

type Role = { role: string; name?: string; nameAr?: string; description?: string; descriptionAr?: string; scopeLevel?: string; accessRank?: number; permissions: string[]; isDefault: boolean; isActive?: boolean };
type Permission = { code: string; description: string; module: string; action: string };
type ManagedUser = { id: string; name: string; email: string; role: string; isActive: boolean };

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
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function load() {
    try {
      const [roleData, permissionData, userData] = await Promise.all([apiRequest<Role[]>('/roles'), apiRequest<Permission[]>('/roles/permissions'), apiRequest<ManagedUser[]>('/roles/users')]);
      setRoles(roleData); setPermissions(permissionData); setUsers(userData); setError('');
      setSelectedRole((current) => current || roleData[0]?.role || '');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load roles'); }
  }
  useEffect(() => { const timer = can('roles.read') ? window.setTimeout(() => void load(), 0) : undefined; return () => window.clearTimeout(timer); }, [can]);

  const modules = useMemo(() => [...new Set(permissions.map((permission) => permission.module))].sort(), [permissions]);
  const actorRank = roles.find((role) => role.role === user?.role)?.accessRank ?? 100;
  const assignableRoles = roles.filter((role) => user?.role === 'super_admin' || (role.accessRank !== undefined ? role.accessRank >= actorRank : role.permissions.every((permission) => user?.permissions.includes(permission))));
  const activeRole = roles.find((role) => role.role === selectedRole);
  const filteredPermissions = useMemo(() => permissions.filter((permission) => {
    const matchesModule = !moduleFilter || permission.module === moduleFilter;
    const term = search.toLowerCase();
    const matchesSearch = !term || permission.code.toLowerCase().includes(term) || permission.description.toLowerCase().includes(term);
    return matchesModule && matchesSearch;
  }), [permissions, moduleFilter, search]);
  const groupedPermissions = useMemo(() => groupByModule(filteredPermissions), [filteredPermissions]);
  const canEditRole = can('roles.manage') && !!activeRole && selectedRole !== 'super_admin';

  const [loadedRoleKey, setLoadedRoleKey] = useState<string | null>(null);
  const roleKey = activeRole ? `${activeRole.role}:${activeRole.permissions.join(',')}` : null;
  if (roleKey !== null && roleKey !== loadedRoleKey) {
    setLoadedRoleKey(roleKey);
    setSelectedCodes(activeRole?.permissions ?? []);
    setDirty(false);
  }

  if (!can('roles.read')) return <AppLayout><div className="card p-8 text-center"><h1 className="text-xl font-bold">403 — {ar ? 'غير مصرح' : 'Permission denied'}</h1></div></AppLayout>;

  async function changeRole(userId: string, role: string) {
    if (!window.confirm(ar ? 'تغيير الدور قد يمنح صلاحيات حساسة. هل تريد المتابعة؟' : 'Changing this role may grant sensitive permissions. Continue?')) return;
    setSaving(true);
    try { await apiRequest(`/roles/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role, confirmSensitive: true }) }); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to change role'); }
    finally { setSaving(false); }
  }

  function toggleCode(code: string) {
    setSelectedCodes((current) => current.includes(code) ? current.filter((c) => c !== code) : [...current, code]);
    setDirty(true);
  }
  function toggleModule(items: Permission[]) {
    const allSelected = items.every((item) => selectedCodes.includes(item.code));
    setSelectedCodes((current) => allSelected ? current.filter((code) => !items.some((item) => item.code === code)) : [...new Set([...current, ...items.map((item) => item.code)])]);
    setDirty(true);
  }
  async function savePermissions() {
    if (!activeRole || !selectedCodes.length) return;
    setSaving(true); setError('');
    try { await apiRequest(`/roles/${activeRole.role}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionCodes: selectedCodes }) }); setDirty(false); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save permissions'); }
    finally { setSaving(false); }
  }

  return <AppLayout>
    <div className="mb-6 flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-primary-600" /><div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'الأدوار والصلاحيات' : 'Roles & permissions'}</h1><p className="text-navy-500">{ar ? 'صلاحيات مجمعة حسب الوحدة والإجراء' : 'Permissions grouped by module and action'}</p></div></div>
    {error && <div role="alert" className="mb-5 rounded-xl bg-danger-50 p-4 text-danger-700">{error}</div>}
    {can('roles.manage') && <CustomRoleManager roles={roles} permissions={permissions} ar={ar} saving={saving} setSaving={setSaving} reload={load} />}
    <section className="card mb-6"><div className="card-header"><h2 className="font-semibold">{ar ? 'المستخدمون' : 'Users'}</h2></div><div className="table-container"><table className="table"><thead><tr><th>{ar ? 'المستخدم' : 'User'}</th><th>{ar ? 'البريد' : 'Email'}</th><th>{ar ? 'الدور' : 'Role'}</th></tr></thead><tbody>{users.map((managed) => <tr key={managed.id}><td>{managed.name}</td><td>{managed.email}</td><td>{can('roles.manage') ? <select disabled={saving} className="select max-w-64" value={managed.role} onChange={(event) => void changeRole(managed.id, event.target.value)}>{assignableRoles.map((role) => <option key={role.role} value={role.role}>{ar ? role.nameAr || role.name || role.role : role.name || role.role}</option>)}</select> : <span className="badge badge-primary">{managed.role}</span>}</td></tr>)}</tbody></table></div></section>

    <section className="card">
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{ar ? 'جدول الصلاحيات' : 'Permission table'}</h2>
        {canEditRole && <button disabled={saving || !dirty || !selectedCodes.length} onClick={() => void savePermissions()} className="btn btn-primary btn-sm"><Save className="h-4 w-4" />{ar ? 'حفظ التعديلات' : 'Save changes'}</button>}
      </div>
      <div className="grid grid-cols-1 gap-3 border-b border-navy-200 p-4 dark:border-navy-700 md:grid-cols-3">
        <select className="select" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
          {roles.map((role) => <option key={role.role} value={role.role}>{ar ? role.nameAr || role.name || role.role : role.name || role.role}</option>)}
        </select>
        <label className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-navy-400" /><input className="input ps-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={ar ? 'بحث عن صلاحية' : 'Search permission'} /></label>
        <label className="relative"><Filter className="absolute start-3 top-3 h-4 w-4 text-navy-400" /><select className="select ps-9" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}><option value="">{ar ? 'كل الوحدات' : 'All modules'}</option>{modules.map((module) => <option key={module}>{module}</option>)}</select></label>
      </div>
      {activeRole && <div className="flex flex-wrap items-center gap-2 border-b border-navy-200 p-4 dark:border-navy-700"><span className="badge badge-gray">{activeRole.scopeLevel || 'custom'}</span><span className="badge badge-primary">{activeRole.isDefault ? (ar ? 'افتراضي / موروث' : 'Default / inherited') : (ar ? 'مخصص' : 'Custom')}</span><p className="text-sm text-navy-500">{ar ? activeRole.descriptionAr || activeRole.description : activeRole.description}</p>{selectedRole === 'super_admin' && <span className="badge badge-gray">{ar ? 'غير قابل للتعديل' : 'Not editable'}</span>}</div>}
      <div className="table-container">
        <table className="table">
          <thead><tr><th className="w-10"></th><th>{ar ? 'الوحدة' : 'Module'}</th><th>{ar ? 'الإجراء' : 'Action'}</th><th>{ar ? 'الوصف' : 'Description'}</th></tr></thead>
          <tbody>
            {groupedPermissions.map(([module, items]) => <Fragment key={module}>
              <tr className="bg-navy-50 dark:bg-navy-900/40">
                <td>{canEditRole && <input type="checkbox" checked={items.every((item) => selectedCodes.includes(item.code))} onChange={() => toggleModule(items)} aria-label={ar ? `تحديد كل صلاحيات ${module}` : `Select all ${module} permissions`} />}</td>
                <td colSpan={3} className="font-semibold capitalize">{module}</td>
              </tr>
              {items.map((permission) => <tr key={permission.code}>
                <td><input type="checkbox" disabled={!canEditRole} checked={selectedCodes.includes(permission.code)} onChange={() => toggleCode(permission.code)} aria-label={permission.code} /></td>
                <td className="text-navy-400">{permission.module}</td>
                <td className="font-medium">{permission.action}</td>
                <td className="text-sm text-navy-500">{permission.description}</td>
              </tr>)}
            </Fragment>)}
          </tbody>
        </table>
        {!groupedPermissions.length && <p className="p-6 text-center text-navy-500">{ar ? 'لا توجد صلاحيات مطابقة.' : 'No matching permissions.'}</p>}
      </div>
    </section>
  </AppLayout>;
}
