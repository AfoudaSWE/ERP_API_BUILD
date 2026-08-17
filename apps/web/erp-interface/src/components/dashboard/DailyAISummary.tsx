import { useEffect, useState } from "react";
import { ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import Link from "@/components/router/Link";
import { apiGet } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Summary = { items: string[]; model: string };
const requests = new Map<string, Promise<Summary>>();

function requestSummary(key: string, locale: "ar" | "en", retry = false) {
  if (retry) requests.delete(key);
  const current = requests.get(key);
  if (current) return current;
  const pending = apiGet<Summary>(`/ai/daily-summary?locale=${locale}`).catch(
    (error) => {
      requests.delete(key);
      throw error;
    },
  );
  requests.set(key, pending);
  return pending;
}

export function DailyAISummary({
  companyId,
  locale,
}: {
  companyId: string;
  locale: "ar" | "en";
}) {
  const ar = locale === "ar";
  const key = `${companyId}:${locale}`;
  const [state, setState] = useState<{
    loading: boolean;
    data?: Summary;
    error?: string;
  }>({ loading: true });

  function load(retry = false) {
    setState({ loading: true });
    void requestSummary(key, locale, retry)
      .then((data) => setState({ loading: false, data }))
      .catch(() =>
        setState({
          loading: false,
          error: ar
            ? "تعذر الاتصال بخدمة Ollama. حاول مرة أخرى لاحقاً."
            : "Ollama is unavailable. Please try again later.",
        }),
      );
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(
      () => active && setState({ loading: true }),
      0,
    );
    void requestSummary(key, locale)
      .then((data) => active && setState({ loading: false, data }))
      .catch(
        () =>
          active &&
          setState({
            loading: false,
            error: ar
              ? "تعذر الاتصال بخدمة Ollama. حاول مرة أخرى لاحقاً."
              : "Ollama is unavailable. Please try again later.",
          }),
      );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [ar, key, locale]);

  return (
    <section className="mb-8 min-h-48 rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-950 md:p-6">
      <div className="flex items-start gap-4">
        <span className="shrink-0 rounded-lg bg-primary-700 p-2">
          <Sparkles className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="mb-3 font-semibold text-navy-900 dark:text-white">
            {ar ? "ملخص الذكاء الاصطناعي اليومي" : "AI daily summary"}
          </h2>
          {state.loading && (
            <div
              role="status"
              className="space-y-2"
              aria-label={ar ? "جارٍ إنشاء الملخص" : "Generating summary"}
            >
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-4 animate-pulse rounded bg-navy-200/70 dark:bg-navy-700"
                />
              ))}
            </div>
          )}
          {!state.loading && state.error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700"
            >
              <p>{state.error}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-3"
                onClick={() => load(true)}
              >
                <RefreshCw className="h-4 w-4" />
                {ar ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          )}
          {!state.loading && !state.error && !state.data?.items.length && (
            <p className="text-sm text-navy-500">
              {ar
                ? "لا توجد بيانات مخولة كافية لإنشاء ملخص اليوم."
                : "There is not enough authorized data for today’s summary."}
            </p>
          )}
          {!state.loading && Boolean(state.data?.items.length) && (
            <ul className="space-y-2">
              {state.data!.items.map((item, index) => (
                <li
                  key={`${index}-${item}`}
                  className="flex items-start gap-2 text-sm text-navy-600 dark:text-navy-300"
                >
                  <span className="mt-1 text-ai-500">•</span>
                  <span className="break-words">{item}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/ai-assistant"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ai-600 hover:text-ai-700"
          >
            {ar ? "اسأل المساعد الذكي" : "Ask AI assistant"}
            <ChevronRight className={cn("h-4 w-4", ar && "rotate-180")} />
          </Link>
        </div>
      </div>
    </section>
  );
}
