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
    <div className="flex min-h-screen flex-col bg-white text-navy-950">
      <header className="flex shrink-0 items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-950">
            <PanelsTopLeft className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-[-0.02em]">ClubGenies</span>
        </div>
        <button
          type="button"
          className="rounded-full border border-navy-200 bg-white px-4 py-2 text-xs font-semibold text-navy-600 transition-colors duration-200 hover:border-navy-300 hover:bg-navy-50 hover:text-navy-950"
          onClick={() => void i18n.changeLanguage(ar ? 'en' : 'ar')}
        >
          {ar ? 'English' : 'العربية'}
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <section className="w-full max-w-md">
          <h1 className="text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-navy-950 sm:text-4xl">
            {headline}
          </h1>
          <div className="mt-8">{children}</div>
        </section>
      </main>

      <footer className="shrink-0 px-6 py-5 text-center sm:px-10">
        <p className="text-xs text-navy-400">
          ClubGenies © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
