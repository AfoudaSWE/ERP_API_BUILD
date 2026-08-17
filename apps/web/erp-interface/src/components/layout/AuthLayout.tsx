import { type ReactNode } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const highlights = [
  { en: 'Sales, inventory, and accounting in one workspace', ar: 'المبيعات والمخزون والمحاسبة في مكان واحد' },
  { en: 'Role-based access for every branch and team', ar: 'صلاحيات مخصّصة لكل فرع وفريق' },
  { en: 'Arabic and English, right out of the box', ar: 'عربي وإنجليزي بشكل كامل من أول استخدام' },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-navy-950 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.18), transparent 40%)',
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">ClubGenies ERP</span>
        </div>
        <div className="relative space-y-8">
          <p className="max-w-sm text-3xl font-bold leading-tight">
            {ar ? 'شغّل شركتك من مكان واحد، بثقة.' : 'Run your business from one place, with confidence.'}
          </p>
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item.en} className="flex items-start gap-3 text-sm text-white/85">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white/70" />
                <span>{ar ? item.ar : item.en}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} ClubGenies ERP
        </p>
      </section>

      <section className="flex items-center justify-center bg-navy-50 p-4 dark:bg-navy-950 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
