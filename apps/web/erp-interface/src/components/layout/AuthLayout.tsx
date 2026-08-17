import { type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AuthLayout({
  headline,
  meta,
  children,
}: {
  headline: ReactNode;
  meta: string;
  children: ReactNode;
}) {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');

  return (
    <div className="dark flex min-h-screen flex-col bg-navy-950 text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-navy-800 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">ClubGenies ERP</span>
        </div>
        <button
          type="button"
          className="font-mono text-xs uppercase tracking-wider text-navy-400 transition-colors hover:text-white"
          onClick={() => void i18n.changeLanguage(ar ? 'en' : 'ar')}
        >
          {ar ? 'English' : 'العربية'}
        </button>
      </header>

      <main className="relative grid flex-1 overflow-hidden lg:grid-cols-2">
        <section className="relative flex flex-col justify-center px-6 py-16 sm:px-10 lg:py-24">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -start-10 top-1/2 -translate-y-1/2 select-none font-sans text-[22rem] font-black leading-none text-white/[0.03]"
          >
            CG
          </span>
          <p className="relative mb-4 font-mono text-xs uppercase tracking-[0.2em] text-navy-500">
            {meta}
          </p>
          <h1 className="relative max-w-lg text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            {headline}
          </h1>
        </section>

        <section className="flex items-center justify-center border-t border-navy-800 bg-navy-950 px-6 py-16 sm:px-10 lg:border-t-0 lg:border-s lg:py-24">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </main>

      <footer className="shrink-0 border-t border-navy-800 px-6 py-5 sm:px-10">
        <p className="font-mono text-xs uppercase tracking-wider text-navy-600">
          ClubGenies ERP © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
