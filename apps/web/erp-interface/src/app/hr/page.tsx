import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Clock3,
  Pencil,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { HrSetupCrud } from "./HrSetupCrud";
import { HrBranchCrud } from "./HrBranchCrud";
import { EmployeeForm, type Employee } from "./EmployeeForm";
import { EmployeeCsvImport } from "./EmployeeCsvImport";
import { showToast } from "@/components/shared/toast";
import Link from "@/components/router/Link";

type Option = {
  id: string;
  name: string;
  nameAr?: string;
  isActive: boolean;
  branchId?: string;
};
type Bootstrap = {
  branches: Option[];
  departments: Option[];
  shifts: Option[];
  workplaces: Option[];
};
type RoleOption = { role: string; name?: string; nameAr?: string; accessRank?: number; permissions: string[] };

export default function HRPage() {
  const { can, user } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const manage = can("hr.employees.manage") || can("hr.write");
  const [employees, setEmployees] = useState<Employee[]>([]),
    [options, setOptions] = useState<Bootstrap>({
      branches: [],
      departments: [],
      shifts: [],
      workplaces: [],
    }),
    [roles, setRoles] = useState<RoleOption[]>([]),
    [tab, setTab] = useState<"employees" | "departments" | "shifts" | "branches">("employees"),
    [editing, setEditing] = useState<Employee | null | undefined>(undefined),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [search, setSearch] = useState(""),
    [departmentFilter, setDepartmentFilter] = useState("");
  const load = useCallback(async () => {
    try {
      const [e, b] = await Promise.all([
        apiRequest<Employee[]>("/hr/employees"),
        apiRequest<Bootstrap>("/hr/bootstrap"),
      ]);
      setEmployees(e);
      setOptions(b);
      if (can("roles.read")) {
        try { setRoles(await apiRequest<RoleOption[]>("/roles")); } catch { /* role assignment stays optional */ }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }, [can]);
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const actorRank = roles.find((role) => role.role === user?.role)?.accessRank ?? 100;
  const assignableRoles = useMemo(
    () => roles.filter((role) => user?.role === "super_admin" || (role.accessRank !== undefined ? role.accessRank >= actorRank : role.permissions.every((permission) => user?.permissions.includes(permission)))),
    [roles, user, actorRank],
  );

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((x) => {
      if (departmentFilter && x.departmentId !== departmentFilter && x.departmentName !== departmentFilter)
        return false;
      if (!term) return true;
      return (
        x.name.toLowerCase().includes(term) ||
        x.nameAr?.toLowerCase().includes(term) ||
        x.employeeCode.toLowerCase().includes(term) ||
        x.email.toLowerCase().includes(term) ||
        x.jobTitle?.toLowerCase().includes(term)
      );
    });
  }, [employees, search, departmentFilter]);

  async function submitEmployee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const branchIds = f.getAll("branchIds") as string[];
    if (!branchIds.length) {
      const error = ar ? "يجب اختيار فرع واحد على الأقل للموظف." : "Select at least one branch for the employee.";
      setMessage(error);
      showToast({ type: "error", message: error });
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await apiRequest(`/hr/employees/${editing.userId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: f.get("name"),
            nameAr: f.get("nameAr"),
            employeeCode: f.get("employeeCode"),
            nationalId: f.get("nationalId") || null,
            phone: f.get("phone"),
            jobTitle: f.get("jobTitle"),
            departmentId: f.get("departmentId") || null,
            hireDate: f.get("hireDate"),
            baseSalary: Number(f.get("baseSalary")),
            branchIds,
            shiftId: f.get("shiftId") || null,
            workplaceIds: f.getAll("workplaceIds"),
            managerId: f.get("managerId") || null,
            employmentStatus: f.get("employmentStatus"),
          }),
        });
        setMessage(ar ? "تم تحديث بيانات الموظف." : "Employee updated.");
      } else {
        await apiRequest("/hr/employees", {
          method: "POST",
          body: JSON.stringify({
            name: f.get("name"),
            nameAr: f.get("nameAr"),
            email: f.get("email"),
            password: f.get("password"),
            employeeCode: f.get("employeeCode"),
            nationalId: f.get("nationalId") || null,
            phone: f.get("phone"),
            jobTitle: f.get("jobTitle"),
            departmentId: f.get("departmentId") || null,
            hireDate: f.get("hireDate"),
            baseSalary: Number(f.get("baseSalary")),
            branchIds,
            shiftId: f.get("shiftId") || null,
            workplaceIds: f.getAll("workplaceIds"),
            managerId: f.get("managerId") || null,
            role: f.get("role") || "employee",
          }),
        });
        setMessage(ar ? "تم إنشاء الموظف وربطه بنجاح." : "Employee onboarded successfully.");
      }
      setEditing(undefined);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {ar ? "الموارد البشرية" : "Human resources"}
            </h1>
            <p className="text-sm text-navy-500">
              {ar
                ? "الموظفون والفروع والورديات ومواقع العمل في دورة واحدة"
                : "Employees, branches, shifts and workplaces in one workflow"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {can("roles.read") && (
              <Link href="/settings/roles" className="btn btn-secondary">
                <ShieldCheck className="h-4 w-4" />
                {ar ? "المستخدمون والأدوار" : "Users & roles"}
              </Link>
            )}
            {manage && <EmployeeCsvImport ar={ar} onImported={load} />}
            {manage && (
              <button className="btn btn-primary" onClick={() => setEditing(null)}>
                <UserPlus className="h-4 w-4" />
                {ar ? "إضافة موظف" : "Add employee"}
              </button>
            )}
          </div>
        </header>
        {message && (
          <div
            role="status"
            className="rounded-xl bg-primary-50 p-3 text-primary-700"
          >
            {message}
          </div>
        )}
        <nav className="flex flex-wrap gap-2">
          <button
            className={tab === "employees" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab("employees")}
          >
            <Users className="h-4 w-4" />
            {ar ? "الموظفون" : "Employees"}
          </button>
          {manage && (
            <button
              className={tab === "departments" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setTab("departments")}
            >
              <Building2 className="h-4 w-4" />
              {ar ? "الأقسام والورديات" : "Departments & shifts"}
            </button>
          )}
          {manage && can("branches.manage") && (
            <button
              className={tab === "branches" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setTab("branches")}
            >
              <Clock3 className="h-4 w-4" />
              {ar ? "الفروع" : "Branches"}
            </button>
          )}
        </nav>
        {tab === "employees" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  className="input w-full pl-9"
                  placeholder={ar ? "بحث بالاسم أو الكود أو البريد" : "Search by name, code or email"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                className="select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">{ar ? "كل الأقسام" : "All departments"}</option>
                {options.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {ar ? d.nameAr || d.name : d.name}
                  </option>
                ))}
              </select>
            </div>
            <section className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{ar ? "الكود" : "Code"}</th>
                      <th>{ar ? "الموظف" : "Employee"}</th>
                      <th>{ar ? "الوظيفة / القسم" : "Job / department"}</th>
                      <th>{ar ? "المدير المباشر" : "Manager"}</th>
                      <th>{ar ? "الفروع" : "Branches"}</th>
                      <th>{ar ? "الوردية" : "Shift"}</th>
                      <th>{ar ? "مواقع العمل" : "Workplaces"}</th>
                      <th>{ar ? "الحالة" : "Status"}</th>
                      {manage && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((x) => (
                      <tr key={x.userId}>
                        <td>{x.employeeCode}</td>
                        <td>
                          <strong>{ar ? x.nameAr || x.name : x.name}</strong>
                          <small className="block text-navy-500">{x.email}</small>
                        </td>
                        <td>
                          {x.jobTitle || "—"}
                          <small className="block">
                            {ar ? x.departmentNameAr || x.departmentName : x.departmentName}
                          </small>
                        </td>
                        <td>
                          {x.managerName ? `${x.managerCode ?? ""} ${x.managerName}`.trim() : "—"}
                        </td>
                        <td>
                          {x.branches.map((b) => (ar ? b.nameAr || b.name : b.name)).join(", ") || "—"}
                        </td>
                        <td>
                          {x.shift ? (ar ? x.shift.nameAr || x.shift.name : x.shift.name) : "—"}
                        </td>
                        <td>{x.workplaces.map((w) => w.name).join(", ") || "—"}</td>
                        <td>
                          <span className={x.isActive ? "badge badge-success" : "badge badge-gray"}>
                            {x.employmentStatus}
                          </span>
                        </td>
                        {manage && (
                          <td>
                            <button
                              className="btn btn-ghost btn-sm"
                              aria-label={ar ? "تعديل" : "Edit"}
                              onClick={() => setEditing(x)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {!filteredEmployees.length && (
                      <tr>
                        <td colSpan={manage ? 9 : 8} className="p-10 text-center text-navy-500">
                          {ar ? "لا يوجد موظفون بعد." : "No employees yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {tab === "departments" && (
          <HrSetupCrud ar={ar} onChanged={load} />
        )}
        {tab === "branches" && <HrBranchCrud ar={ar} onChanged={load} />}
        {editing !== undefined && (
          <EmployeeForm
            ar={ar}
            busy={busy}
            employee={editing}
            departments={options.departments}
            shifts={options.shifts}
            branches={options.branches}
            workplaces={options.workplaces}
            managers={employees.map((x) => ({
              userId: x.userId,
              employeeCode: x.employeeCode,
              name: x.name,
              nameAr: x.nameAr,
            }))}
            roles={assignableRoles}
            onSubmit={(e) => void submitEmployee(e)}
            onCancel={() => setEditing(undefined)}
          />
        )}
      </main>
    </AppLayout>
  );
}
