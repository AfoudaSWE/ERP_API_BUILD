import { useState, type FormEvent } from 'react';
import { Lock, LogIn, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import Link from '@/components/router/Link';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function describeError(requestError: unknown) {
    const code = requestError && typeof requestError === 'object' && 'code' in requestError ? String((requestError as { code: unknown }).code) : undefined;
    if (code === 'PENDING_APPROVAL') {
      return ar ? 'حساب شركتك لسه قيد المراجعة والاعتماد. هنبعتلك إشعار بمجرد الاعتماد.' : 'Your company account is still awaiting approval. You will be notified once it is approved.';
    }
    return requestError instanceof Error ? requestError.message : (ar ? 'تعذّر تسجيل الدخول' : 'Unable to sign in');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await login(String(values.email), String(values.password));
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function submitWithGoogle(idToken: string) {
    setGoogleLoading(true);
    setError(null);
    try {
      await loginWithGoogle({ idToken });
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={<><Sparkles className="h-3.5 w-3.5" />{ar ? 'أهلاً من جديد' : 'Welcome back'}</>}
      headline={ar ? <>مرحبًا بيك<br />تاني.</> : <>Welcome<br />back.</>}
    >
      {error && (
        <div role="alert" className="animate-auth-rise mb-6 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-600">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div className="animate-auth-rise" style={{ animationDelay: '40ms' }}>
          <label htmlFor="email" className="label text-navy-700">
            {ar ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              id="email"
              name="email"
              type="email"
              className="input ps-9 transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              required
              autoComplete="email"
              defaultValue="owner@demo.erp"
            />
          </div>
        </div>
        <div className="animate-auth-rise" style={{ animationDelay: '80ms' }}>
          <label htmlFor="password" className="label text-navy-700">
            {ar ? 'كلمة المرور' : 'Password'}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              id="password"
              name="password"
              type="password"
              className="input ps-9 transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              required
              minLength={8}
              autoComplete="current-password"
              defaultValue="Demo1234!"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="animate-auth-rise group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-600/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
          style={{ animationDelay: '120ms' }}
        >
          <LogIn className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          {loading ? (ar ? 'جارٍ تسجيل الدخول…' : 'Signing in…') : (ar ? 'تسجيل الدخول' : 'Sign in')}
        </button>
      </form>

      <div className="animate-auth-rise my-6 flex items-center gap-3" style={{ animationDelay: '160ms' }}>
        <div className="h-px flex-1 bg-navy-200" />
        <span className="text-xs font-medium text-navy-400">{ar ? 'أو' : 'or'}</span>
        <div className="h-px flex-1 bg-navy-200" />
      </div>

      <div className="animate-auth-rise flex justify-center" style={{ animationDelay: '180ms' }}>
        <GoogleSignInButton ar={ar} onCredential={(idToken) => void submitWithGoogle(idToken)} disabled={googleLoading} />
      </div>

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
