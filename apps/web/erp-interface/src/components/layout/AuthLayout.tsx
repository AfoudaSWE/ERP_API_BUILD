import { type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    <div className="flex min-h-screen flex-col bg-navy-950 text-white">
      <header className="relative z-10 flex shrink-0 items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-[-0.02em] text-white">ClubGenies</span>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-navy-200 backdrop-blur-sm transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
          onClick={() => void i18n.changeLanguage(ar ? 'en' : 'ar')}
        >
          {ar ? 'English' : 'العربية'}
        </button>
      </header>

      <main className="relative grid flex-1 overflow-hidden lg:grid-cols-2">
        {/* Ambient animated background, shared across both panels */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="animate-auth-grid absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
          <div className="animate-auth-blob-a absolute -start-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-primary-400/40 blur-[100px]" />
          <div className="animate-auth-blob-b absolute -end-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-primary-300/30 blur-[100px]" />
          <div className="animate-auth-blob-a absolute bottom-[-10rem] start-1/4 h-[28rem] w-[28rem] rounded-full bg-primary-600/35 blur-[110px]" style={{ animationDelay: '-9s' }} />
        </div>

        <section className="relative flex flex-col justify-center px-6 py-16 sm:px-10 lg:py-24">
          {eyebrow && (
            <div className="animate-auth-rise relative mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-primary-200 backdrop-blur-sm">
              {eyebrow}
            </div>
          )}
          <h1
            className="animate-auth-rise relative max-w-lg text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl"
            style={{ animationDelay: '80ms' }}
          >
            {headline}
          </h1>
          <p
            className="animate-auth-rise relative mt-5 max-w-sm text-sm leading-relaxed text-navy-300 sm:text-base"
            style={{ animationDelay: '160ms' }}
          >
            {ar
              ? 'إدارة المبيعات والمخزون والفريق من مكان واحد، بدون تعقيد.'
              : 'Run sales, inventory, and your team from one place — no complexity.'}
          </p>
        </section>

        <section className="relative flex items-center justify-center px-6 py-16 sm:px-10 lg:py-24">
          <div
            className="animate-auth-pop w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 text-navy-950 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] sm:p-9"
            style={{ animationDelay: '120ms' }}
          >
            {children}
          </div>
        </section>
      </main>

      <footer className="relative z-10 shrink-0 px-6 py-5 sm:px-10">
        <p className="text-xs text-navy-400">
          ClubGenies © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
