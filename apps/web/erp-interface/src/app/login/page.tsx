import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
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
    <AuthLayout
      headline={ar ? <>مرحبًا بيك<br />تاني.</> : <>Welcome<br />back.</>}
    >
      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-400">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label text-navy-700">
            {ar ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" defaultValue="owner@demo.erp" />
        </div>
        <div>
          <label htmlFor="password" className="label text-navy-700">
            {ar ? 'كلمة المرور' : 'Password'}
          </label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="current-password" defaultValue="Demo1234!" />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full justify-center">
          <LogIn className="h-4 w-4" />
          {loading ? (ar ? 'جارٍ تسجيل الدخول…' : 'Signing in…') : (ar ? 'تسجيل الدخول' : 'Sign in')}
        </button>
      </form>
      <div className="my-6 border-t border-dashed border-navy-200" />
      <p className="text-sm text-navy-500">
        {ar ? 'شركة جديدة؟' : 'New company?'}{' '}
        <Link href="/signup" className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:decoration-primary-700">
          {ar ? 'ابدأ تجربة مجانية' : 'Start a free trial'}
        </Link>
      </p>
    </AuthLayout>
  );
}
