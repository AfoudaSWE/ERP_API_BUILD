import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";

type JobOpening = { id: string; title: string; status: string };
type Candidate = { id: string; name: string; email?: string; phone?: string; stage: string; jobOpeningId: string };

const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;

export default function RecruitmentPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedOpening, setSelectedOpening] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openingForm, setOpeningForm] = useState({ title: "" });
  const [candidateForm, setCandidateForm] = useState({ name: "", email: "", phone: "" });

  const load = useCallback(async () => {
    const openingRows = await apiRequest<JobOpening[]>("/hr/job-openings");
    setOpenings(openingRows);
    if (!selectedOpening && openingRows[0]) setSelectedOpening(openingRows[0].id);
  }, [selectedOpening]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  const loadCandidates = useCallback(async (openingId: string) => {
    if (!openingId) { setCandidates([]); return; }
    setCandidates(await apiRequest<Candidate[]>(`/hr/candidates?jobOpeningId=${openingId}`));
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadCandidates(selectedOpening).catch(() => undefined); }, [selectedOpening, loadCandidates]);

  async function createOpening(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const created = await apiRequest<JobOpening>("/hr/job-openings", { method: "POST", body: JSON.stringify({ title: openingForm.title }) });
      setOpeningForm({ title: "" });
      await load();
      setSelectedOpening(created.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  async function addCandidate(e: FormEvent) {
    e.preventDefault(); if (!selectedOpening) return; setBusy(true); setError("");
    try {
      await apiRequest("/hr/candidates", { method: "POST", body: JSON.stringify({ jobOpeningId: selectedOpening, name: candidateForm.name, email: candidateForm.email || undefined, phone: candidateForm.phone || undefined }) });
      setCandidateForm({ name: "", email: "", phone: "" });
      await loadCandidates(selectedOpening);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  async function moveStage(candidate: Candidate, stage: string) {
    setBusy(true); setError("");
    try { await apiRequest(`/hr/candidates/${candidate.id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) }); await loadCandidates(selectedOpening); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "التوظيف" : "Recruitment"}</h1>
          <p className="text-sm text-navy-500">{ar ? "الوظائف الشاغرة والمرشحون" : "Job openings and candidate tracking"}</p>
        </header>
        {error && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <form onSubmit={(e) => void createOpening(e)} className="card space-y-3 p-4">
              <h2 className="font-bold">{ar ? "وظيفة شاغرة جديدة" : "New opening"}</h2>
              <input required className="input w-full" placeholder={ar ? "المسمى الوظيفي" : "Job title"} value={openingForm.title} onChange={(e) => setOpeningForm({ title: e.target.value })} />
              <button disabled={busy} className="btn btn-primary w-full justify-center">{ar ? "إضافة" : "Add"}</button>
            </form>
            <div className="card overflow-hidden">
              <h2 className="border-b p-4 font-bold">{ar ? "الوظائف الشاغرة" : "Openings"}</h2>
              {openings.map((opening) => (
                <button key={opening.id} onClick={() => setSelectedOpening(opening.id)} className={`block w-full border-b p-3 text-start ${selectedOpening === opening.id ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}>
                  {opening.title} <span className="badge badge-primary ms-2">{opening.status}</span>
                </button>
              ))}
              {!openings.length && <p className="p-4 text-center text-navy-500">{ar ? "لا توجد وظائف" : "No openings yet"}</p>}
            </div>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <form onSubmit={(e) => void addCandidate(e)} className="card grid gap-3 p-4 md:grid-cols-3">
              <input required className="input" placeholder={ar ? "اسم المرشح" : "Candidate name"} value={candidateForm.name} onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })} />
              <input className="input" placeholder={ar ? "البريد الإلكتروني" : "Email"} value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} />
              <input className="input" placeholder={ar ? "الهاتف" : "Phone"} value={candidateForm.phone} onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })} />
              <button disabled={busy || !selectedOpening} className="btn btn-primary md:col-span-3">{ar ? "إضافة مرشح" : "Add candidate"}</button>
            </form>
            <div className="card overflow-x-auto">
              <table className="table min-w-[650px]">
                <thead><tr><th>{ar ? "الاسم" : "Name"}</th><th>{ar ? "البريد" : "Email"}</th><th>{ar ? "المرحلة" : "Stage"}</th></tr></thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td>{candidate.name}</td>
                      <td>{candidate.email || "—"}</td>
                      <td>
                        <select className="select" value={candidate.stage} onChange={(e) => void moveStage(candidate, e.target.value)} disabled={busy}>
                          {STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!candidates.length && <p className="p-6 text-center text-navy-500">{ar ? "لا يوجد مرشحون" : "No candidates yet"}</p>}
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
