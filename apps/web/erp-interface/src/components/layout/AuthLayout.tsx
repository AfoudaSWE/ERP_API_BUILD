import { type ReactNode } from 'react';
import { PanelsTopLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AuthLayout({
  headline,
  children,
}: {
  headline: ReactNode;
  children: ReactNode;
}) {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');

  return (
    <div className="flex min-h-screen flex-col bg-navy-50 text-navy-950">
      <header className="flex shrink-0 items-center justify-between border-b border-navy-200 bg-white px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-950">
            <PanelsTopLeft className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-[-0.02em]">ClubGenies</span>
        </div>
        <button
          type="button"
          className="rounded-md px-3 py-2 text-xs font-semibold text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-950"
          onClick={() => void i18n.changeLanguage(ar ? 'en' : 'ar')}
        >
          {ar ? 'English' : 'العربية'}
        </button>
      </header>

      <main className="relative grid flex-1 overflow-hidden lg:grid-cols-2">
        <section className="relative flex flex-col justify-center px-6 py-16 sm:px-10 lg:py-24">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -start-10 top-1/2 -translate-y-1/2 select-none font-sans text-[22rem] font-black leading-none text-primary-900/[0.035]"
          >
            CG
          </span>
          <h1 className="relative max-w-lg text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            {headline}
          </h1>
        </section>

        <section className="flex items-center justify-center border-t border-navy-200 bg-white px-6 py-16 sm:px-10 lg:border-t-0 lg:border-s lg:py-24">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </main>

      <footer className="shrink-0 border-t border-navy-200 bg-white px-6 py-5 sm:px-10">
        <p className="text-xs text-navy-500">
          ClubGenies © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
