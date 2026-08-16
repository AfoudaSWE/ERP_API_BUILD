import { useState, type FormEvent } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await login(String(values.email), String(values.password));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-navy-950 p-4">
    <section className="w-full max-w-md rounded-2xl border border-navy-700 bg-white p-8 shadow-2xl dark:bg-navy-900">
      <div className="mb-4 flex justify-end"><button type="button" className="btn btn-ghost btn-sm" onClick={() => void i18n.changeLanguage(i18n.language.startsWith('ar') ? 'en' : 'ar')}>{i18n.language.startsWith('ar') ? 'English' : 'العربية'}</button></div>
      <div className="mb-7 flex items-center gap-3"><div className="rounded-xl bg-primary-600 p-3 text-white"><LockKeyhole className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{t('auth.title')}</h1><p className="text-sm text-navy-500">{t('auth.subtitle')}</p></div></div>
      {error && <div role="alert" className="mb-5 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
      <form onSubmit={submit} className="space-y-5">
        <div><label className="label" htmlFor="email">{t('auth.email')}</label><input id="email" name="email" type="email" className="input" required autoComplete="email" defaultValue="owner@demo.erp" /></div>
        <div><label className="label" htmlFor="password">{t('auth.password')}</label><input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="current-password" defaultValue="Demo1234!" /></div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full justify-center"><LogIn className="h-4 w-4" />{loading ? t('auth.signingIn') : t('auth.signIn')}</button>
      </form>
    </section>
  </main>;
}
