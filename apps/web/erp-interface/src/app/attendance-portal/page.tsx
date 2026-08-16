import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Clock3,
  Fingerprint,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { apiRequest, ApiRequestError } from "@erp/shared-frontend-data-access";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

type RecordRow = {
  id: string;
  businessDate: string;
  timezone: string;
  checkInAt: string;
  checkOutAt?: string | null;
  workedMinutes?: number | null;
  lateMinutes: number;
  status: string;
  branchName?: string;
};
type Today = {
  serverTime: string;
  timezone: string;
  businessDate: string;
  state: "not_checked_in" | "present" | "late" | "checked_out";
  record: RecordRow | null;
  identity: {
    employeeName: string;
    companyName: string;
    branchName?: string | null;
  };
};
const errorText: Record<string, { ar: string; en: string }> = {
  LOCATION_REQUIRED: {
    ar: "اسمح بالوصول إلى موقعك ثم حاول مجددًا.",
    en: "Allow location access and try again.",
  },
  LOCATION_ACCURACY_LOW: {
    ar: "دقة الموقع ضعيفة. انتقل إلى مكان مفتوح وحاول مجددًا.",
    en: "Location accuracy is too low. Move to an open area and retry.",
  },
  LOCATION_STALE: {
    ar: "قراءة الموقع قديمة. حاول مجددًا.",
    en: "The location reading is stale. Try again.",
  },
  OUTSIDE_WORKPLACE: {
    ar: "لا يمكنك التسجيل من هذا المكان.",
    en: "You cannot record attendance from this location.",
  },
  NO_WORKPLACE_ASSIGNED: {
    ar: "لا يوجد موقع عمل مرتبط بحسابك.",
    en: "No workplace is assigned to your account.",
  },
  ATTENDANCE_DAY_COMPLETED: {
    ar: "تم إكمال دوام اليوم.",
    en: "Today’s attendance is complete.",
  },
};
const time = (
  value: string | null | undefined,
  locale: string,
  timezone: string,
) =>
  value
    ? new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(value))
    : "—";
function locate() {
  return new Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  }>((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("GPS is not available"));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: new Date(p.timestamp).toISOString(),
        }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export function AttendancePortalLogin() {
  const { login } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ar
            ? "تعذر تسجيل الدخول"
            : "Unable to sign in",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      dir={ar ? "rtl" : "ltr"}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4"
    >
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <button
          className="mb-6 text-sm text-blue-700"
          onClick={() => void i18n.changeLanguage(ar ? "en" : "ar")}
        >
          {ar ? "English" : "العربية"}
        </button>
        <div className="mb-8 flex items-center gap-3">
          <span className="rounded-2xl bg-blue-600 p-3 text-white">
            <Clock3 />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              {ar ? "بوابة الحضور" : "Attendance Portal"}
            </h1>
            <p className="text-sm text-slate-500">
              {ar
                ? "استخدم حساب الموظف في نظام ERP"
                : "Use your ERP employee account"}
            </p>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <label className="block text-sm font-medium">
            {ar ? "البريد الإلكتروني" : "Email"}
            <input
              className="input mt-2 w-full"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            {ar ? "كلمة المرور" : "Password"}
            <input
              className="input mt-2 w-full"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          <button
            disabled={busy}
            className="btn btn-primary w-full justify-center"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {ar ? "تسجيل الدخول" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function AttendancePortal() {
  const { user, logout, can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar"),
    locale = ar ? "ar-EG" : "en-US";
  const [today, setToday] = useState<Today | null>(null),
    [history, setHistory] = useState<RecordRow[]>([]),
    [now, setNow] = useState(new Date()),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const allowed =
    can("attendance.self.view") ||
    can("attendance.punch") ||
    can("attendance.read");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [day, rows] = await Promise.all([
        apiRequest<Today>("/attendance/me/today"),
        apiRequest<RecordRow[]>("/attendance/me/history?pageSize=7"),
      ]);
      setToday(day);
      setHistory(rows);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  async function punch() {
    if (!today || busy) return;
    const checkout = today.state === "present" || today.state === "late";
    if (
      checkout &&
      !confirm(ar ? "هل تريد تسجيل الانصراف الآن؟" : "Check out now?")
    )
      return;
    setBusy(true);
    setNotice(null);
    try {
      const geo = await locate();
      const row = await apiRequest<RecordRow>(
        checkout ? "/attendance/check-out" : "/attendance/check-in",
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify(geo),
        },
      );
      setNotice({
        ok: true,
        text: checkout
          ? ar
            ? `تم تسجيل انصرافك الساعة ${time(row.checkOutAt, locale, row.timezone)}`
            : `Checked out at ${time(row.checkOutAt, locale, row.timezone)}`
          : ar
            ? `تم تسجيل حضورك الساعة ${time(row.checkInAt, locale, row.timezone)}`
            : `Checked in at ${time(row.checkInAt, locale, row.timezone)}`,
      });
      await load();
    } catch (e) {
      const code = e instanceof ApiRequestError ? e.code : "";
      const details =
        e instanceof ApiRequestError &&
        e.details &&
        typeof e.details === "object"
          ? (e.details as { distanceM?: number; workplace?: string })
          : undefined;
      const distanceMessage =
        code === "OUTSIDE_WORKPLACE" && details?.distanceM !== undefined
          ? ar
            ? ` أنت تبعد ${details.distanceM} مترًا عن ${details.workplace ?? "موقع العمل المسموح"}.`
            : ` You are ${details.distanceM} meters from ${details.workplace ?? "the allowed workplace"}.`
          : "";
      setNotice({
        ok: false,
        text:
          (errorText[code]?.[ar ? "ar" : "en"] ||
            (e instanceof Error ? e.message : "Failed")) + distanceMessage,
      });
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
        <div className="max-w-md text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12" />
          <h1 className="text-2xl font-bold">403</h1>
          <p>
            {ar
              ? "هذا الحساب غير مخول لتسجيل الحضور."
              : "This account cannot record attendance."}
          </p>
          <button className="btn mt-5" onClick={logout}>
            {ar ? "تسجيل الخروج" : "Sign out"}
          </button>
        </div>
      </main>
    );
  if (loading || !today)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </main>
    );
  const active = today.state === "present" || today.state === "late";
  return (
    <main
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-7"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {today.identity.companyName}
              {today.identity.branchName
                ? ` · ${today.identity.branchName}`
                : ""}
            </p>
            <h1 className="text-xl font-bold">
              {today.identity.employeeName || user?.name}
            </h1>
          </div>
          <button className="btn btn-ghost" onClick={logout}>
            <LogOut className="h-4 w-4" />
            {ar ? "خروج" : "Sign out"}
          </button>
        </header>
        {notice && (
          <div
            role="status"
            className={`rounded-2xl p-4 ${notice.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
          >
            {notice.text}
          </div>
        )}
        <section className="rounded-3xl bg-white p-6 text-center shadow-sm sm:p-10">
          <p className="text-slate-500">
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "full",
              timeZone: today.timezone,
            }).format(now)}
          </p>
          <p className="my-3 font-mono text-4xl font-bold tabular-nums sm:text-5xl">
            {new Intl.DateTimeFormat(locale, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: today.timezone,
            }).format(now)}
          </p>
          <span
            className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-emerald-100 text-emerald-700" : today.state === "checked_out" ? "bg-slate-200" : "bg-amber-100 text-amber-800"}`}
          >
            {active
              ? ar
                ? "حاضر الآن"
                : "Present now"
              : today.state === "checked_out"
                ? ar
                  ? "اكتمل دوام اليوم"
                  : "Day complete"
                : ar
                  ? "لم يسجل الحضور"
                  : "Not checked in"}
          </span>
          <button
            disabled={busy || today.state === "checked_out"}
            onClick={() => void punch()}
            className="mx-auto mt-7 flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-xl disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-16 w-16 animate-spin" />
            ) : (
              <Fingerprint className="h-20 w-20" />
            )}
            <strong>
              {active
                ? ar
                  ? "تسجيل الانصراف"
                  : "Check out"
                : ar
                  ? "تسجيل الحضور"
                  : "Check in"}
            </strong>
          </button>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
            <MapPin className="h-4 w-4" />
            {ar
              ? "يتم التحقق من موقع العمل في الخادم"
              : "Workplace validation is performed by the server"}
          </p>
        </section>
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold">
            {ar ? "آخر السجلات" : "Recent records"}
          </h2>
          <div className="space-y-3">
            {history.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-sm"
              >
                <span>{r.businessDate}</span>
                <span>{time(r.checkInAt, locale, r.timezone)}</span>
                <span>{time(r.checkOutAt, locale, r.timezone)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
