import { type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthShowcaseSlider } from '@/components/auth/AuthShowcaseSlider';

export function AuthLayout({
  headline,
  eyebrow,
  children,
}: {
  headline: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
}) {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');

  return (
    <div className="flex min-h-screen flex-col bg-white text-navy-950">
      <header className="flex shrink-0 items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-md shadow-primary-500/20">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-[-0.02em] text-navy-950">ClubGenies</span>
        </div>
        <button
          type="button"
          className="rounded-full border border-navy-200 bg-white px-4 py-2 text-xs font-semibold text-navy-600 transition-colors duration-200 hover:border-navy-300 hover:bg-navy-50 hover:text-navy-950"
          onClick={() => void i18n.changeLanguage(ar ? 'en' : 'ar')}
        >
          {ar ? 'English' : 'العربية'}
        </button>
      </header>

      <main className="grid flex-1 items-center gap-10 px-6 py-8 sm:px-10 lg:grid-cols-2 lg:gap-14 lg:py-12">
        <div className="animate-auth-pop hidden h-full max-h-[38rem] lg:block">
          <AuthShowcaseSlider ar={ar} />
        </div>

        <section className="mx-auto w-full max-w-md py-6 lg:py-0">
          {eyebrow && (
            <div className="animate-auth-rise mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-primary-700">
              {eyebrow}
            </div>
          )}
          <h1 className="animate-auth-rise text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-navy-950 sm:text-4xl" style={{ animationDelay: '60ms' }}>
            {headline}
          </h1>
          <div className="animate-auth-rise mt-8" style={{ animationDelay: '100ms' }}>
            {children}
          </div>
        </section>
      </main>

      <footer className="shrink-0 px-6 py-5 sm:px-10">
        <p className="text-xs text-navy-400">
          ClubGenies © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
