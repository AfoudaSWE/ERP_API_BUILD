import { useCallback, useEffect, useState } from "react";
import { Ban, CalendarPlus, CheckCircle2, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";

type Company = {
  id: string;
  name: string;
  nameAr: string;
  subscriptionStatus: "pending_approval" | "trial" | "active" | "suspended" | "canceled";
  trialEndsAt: string | null;
  createdAt: string;
  tenantSlug: string;
  userCount: number;
  owner: { name: string; email: string } | null;
};

const STATUS_BADGE: Record<Company["subscriptionStatus"], string> = {
  pending_approval: "badge badge-warning",
  trial: "badge badge-warning",
  active: "badge badge-success",
  suspended: "badge badge-danger",
  canceled: "badge badge-gray",
};

export default function PlatformAdminPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setCompanies(await apiRequest<Company[]>("/platform/companies"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  async function setStatus(id: string, subscriptionStatus: Company["subscriptionStatus"]) {
    setBusyId(id);
    setError("");
    try {
      await apiRequest(`/platform/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ subscriptionStatus }),
      });
      await load();
      setMessage(ar ? "تم تحديث حالة الاشتراك." : "Subscription status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function approveCompany(id: string) {
    setBusyId(id);
    setError("");
    try {
      await apiRequest(`/platform/companies/${id}/approve`, { method: "POST" });
      await load();
      setMessage(ar ? "تم اعتماد الشركة وبدء فترة التجربة." : "Company approved and trial started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function extendTrial(id: string) {
    setBusyId(id);
    setError("");
    try {
      await apiRequest(`/platform/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ extendTrialDays: 14 }),
      });
      await load();
      setMessage(ar ? "تم تمديد التجربة 14 يوم." : "Trial extended by 14 days.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeCompany(company: Company) {
    const confirmText = ar
      ? `متأكد إنك عايز تمسح "${company.name}"؟ لو مفيش نشاط مسجّل عليها هتتمسح نهائيًا، ولو فيها سجل تدقيق هيتم إلغاؤها ومنع كل مستخدميها من الدخول بدل الحذف الكامل (حفاظًا على سجل التدقيق).`
      : `Delete "${company.name}"? If it has no recorded activity it will be permanently erased; if it has audit history it will be canceled and all its users locked out instead (to preserve the audit trail).`;
    if (!confirm(confirmText)) return;
    setBusyId(company.id);
    setError("");
    try {
      const result = await apiRequest<{ hardDeleted: boolean }>(`/platform/companies/${company.id}`, { method: "DELETE" });
      await load();
      setMessage(
        result.hardDeleted
          ? (ar ? "تم حذف الشركة نهائيًا." : "Company permanently deleted.")
          : (ar ? "الشركة عندها سجل تدقيق، فتم إلغاؤها ومنع دخول كل مستخدميها بدل الحذف الكامل." : "The company had audit history, so it was canceled and all its users were locked out instead of a hard delete."),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldAlert className="h-6 w-6 text-primary-600" />
            {ar ? "إدارة المنصة" : "Platform administration"}
          </h1>
          <p className="text-sm text-navy-500">
            {ar ? "كل الشركات المشتركة في ClubGenies ERP" : "Every company subscribed to ClubGenies ERP"}
          </p>
        </header>
        {message && <div role="status" className="rounded-xl bg-primary-50 p-3 text-primary-700">{message}</div>}
        {error && <div role="alert" className="rounded-xl bg-danger-50 p-3 text-danger-700">{error}</div>}
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الشركة" : "Company"}</th>
                  <th>{ar ? "المالك" : "Owner"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th>{ar ? "نهاية التجربة" : "Trial ends"}</th>
                  <th>{ar ? "المستخدمون" : "Users"}</th>
                  <th>{ar ? "تاريخ التسجيل" : "Signed up"}</th>
                  <th className="w-56">{ar ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{ar ? c.nameAr || c.name : c.name}</strong>
                      <small className="block text-navy-500">{c.tenantSlug}</small>
                    </td>
                    <td>
                      {c.owner ? (
                        <>
                          {c.owner.name}
                          <small className="block text-navy-500">{c.owner.email}</small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className={STATUS_BADGE[c.subscriptionStatus]}>{c.subscriptionStatus}</span>
                    </td>
                    <td>{c.trialEndsAt ? new Date(c.trialEndsAt).toLocaleDateString(ar ? "ar-EG" : "en-EG") : "—"}</td>
                    <td>{c.userCount}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString(ar ? "ar-EG" : "en-EG")}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {c.subscriptionStatus === "pending_approval" && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={busyId === c.id}
                            onClick={() => void approveCompany(c.id)}
                            aria-label={ar ? "اعتماد" : "Approve"}
                            title={ar ? "اعتماد الشركة وبدء التجربة" : "Approve company and start trial"}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {ar ? "اعتماد" : "Approve"}
                          </button>
                        )}
                        {c.subscriptionStatus !== "pending_approval" && c.subscriptionStatus !== "active" && (
                          <button
                            className="btn btn-ghost btn-sm text-success-600"
                            disabled={busyId === c.id}
                            onClick={() => void setStatus(c.id, "active")}
                            aria-label={ar ? "تفعيل" : "Activate"}
                            title={ar ? "تفعيل" : "Activate"}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {c.subscriptionStatus !== "pending_approval" && c.subscriptionStatus !== "suspended" && (
                          <button
                            className="btn btn-ghost btn-sm text-warning-600"
                            disabled={busyId === c.id}
                            onClick={() => void setStatus(c.id, "suspended")}
                            aria-label={ar ? "إيقاف" : "Suspend"}
                            title={ar ? "إيقاف" : "Suspend"}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {c.subscriptionStatus === "trial" && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={busyId === c.id}
                            onClick={() => void extendTrial(c.id)}
                            aria-label={ar ? "تمديد التجربة" : "Extend trial"}
                            title={ar ? "تمديد التجربة 14 يوم" : "Extend trial 14 days"}
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm text-danger-600"
                          disabled={busyId === c.id}
                          onClick={() => void removeCompany(c)}
                          aria-label={ar ? "حذف" : "Delete"}
                          title={ar ? "حذف نهائي" : "Delete permanently"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!companies.length && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-navy-500">
                      {ar ? "لا يوجد شركات مشتركة بعد." : "No subscribed companies yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
