import { useState, type FormEvent } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import Link from '@/components/router/Link';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function LoginPage() {
  const { login } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
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
      setError(requestError instanceof Error ? requestError.message : (ar ? 'تعذّر تسجيل الدخول' : 'Unable to sign in'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void i18n.changeLanguage(ar ? 'en' : 'ar')}
        >
          {ar ? 'English' : 'العربية'}
        </button>
      </div>
      <div className="card p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-xl bg-primary-600 p-3 text-white">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              {ar ? 'تسجيل الدخول' : 'Welcome back'}
            </h1>
            <p className="text-sm text-navy-500">
              {ar ? 'سجّل الدخول لمتابعة عملك' : 'Sign in to pick up where you left off'}
            </p>
          </div>
        </div>
        {error && (
          <div role="alert" className="mb-5 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label" htmlFor="email">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" defaultValue="owner@demo.erp" />
          </div>
          <div>
            <label className="label" htmlFor="password">{ar ? 'كلمة المرور' : 'Password'}</label>
            <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="current-password" defaultValue="Demo1234!" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full justify-center">
            <LogIn className="h-4 w-4" />
            {loading ? (ar ? 'جارٍ تسجيل الدخول…' : 'Signing in…') : (ar ? 'تسجيل الدخول' : 'Sign in')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-navy-500">
          {ar ? 'شركة جديدة؟' : 'New company?'}{' '}
          <Link href="/signup" className="font-medium text-primary-600 hover:underline">
            {ar ? 'ابدأ تجربة مجانية' : 'Start a free trial'}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
