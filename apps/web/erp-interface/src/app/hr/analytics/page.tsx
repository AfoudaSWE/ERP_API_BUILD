import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";
import { BarChart3, Users, CalendarCheck, GraduationCap } from "lucide-react";

type Employee = { userId: string; employmentStatus: string; departmentName?: string };
type LeaveRequest = { id: string; status: string };
type Enrollment = { id: string; status: string };

export default function HrAnalyticsPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([
        apiRequest<Employee[]>("/hr/employees").catch(() => []),
        apiRequest<LeaveRequest[]>("/hr/leave-requests").catch(() => []),
        apiRequest<Enrollment[]>("/hr/training-enrollments").catch(() => []),
      ]).then(([e, l, t]) => { setEmployees(e); setLeaves(l); setEnrollments(t); });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const active = employees.filter((e) => e.employmentStatus === "active").length;
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const completedTrainings = enrollments.filter((e) => e.status === "completed").length;
  const byDepartment = employees.reduce<Record<string, number>>((acc, emp) => {
    const key = emp.departmentName || (ar ? "بدون قسم" : "Unassigned");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "تحليلات الموارد البشرية" : "HR Analytics"}</h1>
          <p className="text-sm text-navy-500">{ar ? "نظرة عامة على القوى العاملة" : "Workforce overview at a glance"}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary-600" /><div><p className="stat-label">{ar ? "الموظفون النشطون" : "Active employees"}</p><p className="stat-value">{active}</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-3"><CalendarCheck className="h-5 w-5 text-warning-600" /><div><p className="stat-label">{ar ? "إجازات معلقة" : "Pending leave requests"}</p><p className="stat-value">{pendingLeaves}</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-success-600" /><div><p className="stat-label">{ar ? "دورات مكتملة" : "Trainings completed"}</p><p className="stat-value">{completedTrainings}</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-primary-600" /><div><p className="stat-label">{ar ? "إجمالي الموظفين" : "Total employees"}</p><p className="stat-value">{employees.length}</p></div></div></div>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-bold">{ar ? "التوزيع حسب القسم" : "Headcount by department"}</h2>
          <div className="space-y-2">
            {Object.entries(byDepartment).map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm">{name}</span>
                <div className="h-2 flex-1 rounded-full bg-navy-100 dark:bg-navy-800">
                  <div className="h-2 rounded-full bg-primary-500" style={{ width: `${employees.length ? (count / employees.length) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-end text-sm font-semibold">{count}</span>
              </div>
            ))}
            {!Object.keys(byDepartment).length && <p className="text-center text-navy-500">{ar ? "لا توجد بيانات" : "No data yet"}</p>}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
