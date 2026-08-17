import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApiData } from "@/lib/api-data";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft } from "lucide-react";
import type { LeadStatus } from "@/types";

const STAGES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
const STAGE_LABEL: Record<LeadStatus, { en: string; ar: string }> = {
  new: { en: "New", ar: "جديد" }, contacted: { en: "Contacted", ar: "تم التواصل" }, qualified: { en: "Qualified", ar: "مؤهل" },
  proposal: { en: "Proposal", ar: "عرض سعر" }, negotiation: { en: "Negotiation", ar: "تفاوض" }, won: { en: "Won", ar: "تم الفوز" }, lost: { en: "Lost", ar: "خسارة" },
};

export default function PipelinePage() {
  const { leads, refresh } = useApiData();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [busy, setBusy] = useState(false);

  async function move(leadId: string, nextStatus: LeadStatus) {
    setBusy(true);
    try { await apiRequest(`/crm/leads/${leadId}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }); await refresh(); }
    finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "خط سير المبيعات" : "Pipeline"}</h1>
          <p className="text-sm text-navy-500">{ar ? "تتبع الصفقات عبر مراحل خط السير" : "Track deals across pipeline stages"}</p>
        </header>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage, stageIndex) => {
            const stageLeads = leads.filter((lead) => lead.status === stage);
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-bold">{ar ? STAGE_LABEL[stage].ar : STAGE_LABEL[stage].en}</h2>
                  <span className="badge badge-gray">{stageLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="card space-y-2 p-3">
                      <p className="font-medium">{ar ? lead.nameAr || lead.name : lead.name}</p>
                      {lead.value ? <p className="text-sm text-navy-500">{lead.value.toLocaleString()} EGP</p> : null}
                      <div className="flex justify-between">
                        <button disabled={busy || stageIndex === 0} className="btn btn-ghost btn-icon btn-sm" onClick={() => void move(lead.id, STAGES[stageIndex - 1])} aria-label={ar ? "رجوع" : "Move back"}>
                          {ar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </button>
                        <button disabled={busy || stageIndex === STAGES.length - 1} className="btn btn-ghost btn-icon btn-sm" onClick={() => void move(lead.id, STAGES[stageIndex + 1])} aria-label={ar ? "تقدم" : "Move forward"}>
                          {ar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!stageLeads.length && <p className="rounded-lg border border-dashed border-navy-200 p-4 text-center text-xs text-navy-400 dark:border-navy-700">{ar ? "لا توجد صفقات" : "No deals"}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
}
