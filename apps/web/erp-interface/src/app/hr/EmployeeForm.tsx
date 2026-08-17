import { Loader2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

type Option = { id: string; name: string; nameAr?: string; isActive: boolean };
type ManagerOption = { userId: string; employeeCode: string; name: string; nameAr: string };
type RoleOption = { role: string; name?: string; nameAr?: string };
export type Employee = {
  userId: string;
  employeeCode: string;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  jobTitle: string;
  nationalId?: string | null;
  departmentId?: string | null;
  departmentName?: string;
  departmentNameAr?: string;
  managerId?: string | null;
  managerName?: string | null;
  managerCode?: string | null;
  hireDate: string;
  baseSalary: number;
  employmentStatus: string;
  isActive: boolean;
  branches: { id: string; name: string; nameAr: string }[];
  shift?: { id: string; name: string; nameAr: string } | null;
  shiftId?: string | null;
  workplaces: { id: string; name: string }[];
};

export function EmployeeForm({
  ar,
  busy,
  employee,
  departments,
  shifts,
  branches,
  workplaces,
  managers,
  roles,
  onSubmit,
  onCancel,
}: {
  ar: boolean;
  busy: boolean;
  employee: Employee | null;
  departments: Option[];
  shifts: Option[];
  branches: Option[];
  workplaces: Option[];
  managers: ManagerOption[];
  roles: RoleOption[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const editing = !!employee;
  const employeeBranchIds = employee?.branches.map((b) => b.id) ?? [];
  const employeeWorkplaceIds = employee?.workplaces.map((w) => w.id) ?? [];
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form onSubmit={onSubmit} className="card mx-auto my-6 w-full max-w-4xl p-6">
        <h2 className="mb-6 text-xl font-bold">
          {editing
            ? ar
              ? "تعديل بيانات الموظف"
              : "Edit employee"
            : ar
              ? "إضافة موظف جديد"
              : "Onboard employee"}
        </h2>

        <FormSection title={ar ? "البيانات الشخصية" : "Personal details"}>
          <label className="block text-sm">
            {ar ? "الاسم" : "Name"}
            <input
              required
              className="input mt-1 w-full"
              name="name"
              type="text"
              defaultValue={employee?.name}
            />
          </label>
          <label className="block text-sm">
            {ar ? "الاسم بالعربية" : "Arabic name"}
            <input
              className="input mt-1 w-full"
              name="nameAr"
              type="text"
              defaultValue={employee?.nameAr}
            />
          </label>
          {!editing && (
            <>
              <label className="block text-sm">
                {ar ? "البريد" : "Email"}
                <input required className="input mt-1 w-full" name="email" type="email" />
              </label>
              <label className="block text-sm">
                {ar ? "كلمة مرور مؤقتة" : "Temporary password"}
                <input required className="input mt-1 w-full" name="password" type="password" />
              </label>
              {roles.length > 0 && (
                <label className="block text-sm">
                  {ar ? "الدور / الصلاحية" : "Role / permission"}
                  <select className="select mt-1 w-full" name="role" defaultValue="employee">
                    {roles.map((r) => (
                      <option key={r.role} value={r.role}>
                        {ar ? r.nameAr || r.name || r.role : r.name || r.role}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <label className="block text-sm">
            {ar ? "الرقم القومي" : "National ID"}
            <input
              className="input mt-1 w-full"
              name="nationalId"
              type="text"
              defaultValue={employee?.nationalId ?? ""}
            />
          </label>
          <label className="block text-sm">
            {ar ? "الهاتف" : "Phone"}
            <input
              className="input mt-1 w-full"
              name="phone"
              type="text"
              defaultValue={employee?.phone}
            />
          </label>
        </FormSection>

        <FormSection title={ar ? "بيانات التوظيف" : "Employment details"}>
          <label className="block text-sm">
            {ar ? "كود الموظف" : "Employee code"}
            <input
              required
              className="input mt-1 w-full"
              name="employeeCode"
              type="text"
              defaultValue={employee?.employeeCode}
            />
          </label>
          <label className="block text-sm">
            {ar ? "المسمى الوظيفي" : "Job title"}
            <input
              className="input mt-1 w-full"
              name="jobTitle"
              type="text"
              defaultValue={employee?.jobTitle}
            />
          </label>
          <label className="block text-sm">
            {ar ? "تاريخ التعيين" : "Hire date"}
            <input
              required
              className="input mt-1 w-full"
              name="hireDate"
              type="date"
              defaultValue={employee?.hireDate?.slice(0, 10)}
            />
          </label>
          <label className="block text-sm">
            {ar ? "الراتب الأساسي" : "Base salary"}
            <input
              required
              min={0}
              className="input mt-1 w-full"
              name="baseSalary"
              type="number"
              defaultValue={employee?.baseSalary}
            />
          </label>
          <Select
            name="departmentId"
            label={ar ? "القسم" : "Department"}
            rows={departments}
            ar={ar}
            defaultValue={employee?.departmentId ?? ""}
          />
          <label className="block text-sm">
            {ar ? "المدير المباشر" : "Manager"}
            <select
              className="select mt-1 w-full"
              name="managerId"
              defaultValue={employee?.managerId ?? ""}
            >
              <option value="">{ar ? "بدون" : "None"}</option>
              {managers
                .filter((m) => m.userId !== employee?.userId)
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.employeeCode} — {ar ? m.nameAr || m.name : m.name}
                  </option>
                ))}
            </select>
          </label>
          {editing && (
            <label className="block text-sm">
              {ar ? "حالة التوظيف" : "Employment status"}
              <select
                className="select mt-1 w-full"
                name="employmentStatus"
                defaultValue={employee?.employmentStatus}
              >
                <option value="active">{ar ? "نشط" : "Active"}</option>
                <option value="suspended">{ar ? "موقوف" : "Suspended"}</option>
                <option value="terminated">{ar ? "منتهي الخدمة" : "Terminated"}</option>
              </select>
            </label>
          )}
        </FormSection>

        <FormSection title={ar ? "الفروع والوردية" : "Assignment"} last>
          <Select
            name="shiftId"
            label={ar ? "الوردية" : "Shift"}
            rows={shifts}
            ar={ar}
            defaultValue={employee?.shift?.id ?? ""}
          />
          <Checks
            name="branchIds"
            label={ar ? "الفروع (مطلوب)" : "Branches (required)"}
            rows={branches.filter((x) => x.isActive)}
            ar={ar}
            defaultChecked={employeeBranchIds}
          />
          <Checks
            name="workplaceIds"
            label={ar ? "مواقع العمل" : "Workplaces"}
            rows={workplaces.filter((x) => x.isActive)}
            ar={ar}
            defaultChecked={employeeWorkplaceIds}
          />
        </FormSection>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button disabled={busy} className="btn btn-primary">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? (ar ? "حفظ التعديلات" : "Save changes") : ar ? "إنشاء وربط الموظف" : "Create & assign employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  last,
  children,
}: {
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className={`grid gap-4 md:grid-cols-2 ${last ? "" : "mb-6 border-b border-navy-100 pb-6 dark:border-navy-800"}`}>
      <legend className="col-span-full mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Select({
  name,
  label,
  rows,
  ar,
  defaultValue,
}: {
  name: string;
  label: string;
  rows: Option[];
  ar: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select className="select mt-1 w-full" name={name} defaultValue={defaultValue ?? ""}>
        <option value="">{ar ? "بدون" : "None"}</option>
        {rows
          .filter((x) => x.isActive)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {ar ? x.nameAr || x.name : x.name}
            </option>
          ))}
      </select>
    </label>
  );
}
function Checks({
  name,
  label,
  rows,
  ar,
  defaultChecked,
}: {
  name: string;
  label: string;
  rows: Option[];
  ar: boolean;
  defaultChecked: string[];
}) {
  return (
    <fieldset className="rounded-xl border p-3">
      <legend className="px-2 text-sm">{label}</legend>
      <div className="max-h-32 space-y-2 overflow-y-auto">
        {rows.map((x) => (
          <label className="flex gap-2 text-sm" key={x.id}>
            <input
              type="checkbox"
              name={name}
              value={x.id}
              defaultChecked={defaultChecked.includes(x.id)}
            />
            {ar ? x.nameAr || x.name : x.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
