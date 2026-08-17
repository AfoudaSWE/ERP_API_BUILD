import { useState, type FormEvent } from 'react';
import { Building2, Lock, Mail, MailCheck, User, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import Link from '@/components/router/Link';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GoogleSignInButton, isGoogleSignInAvailable } from '@/components/auth/GoogleSignInButton';

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyNameAr, setCompanyNameAr] = useState('');
  const [name, setName] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const submittedCompanyName = String(values.companyName);
    const submittedCompanyNameAr = String(values.companyNameAr ?? '');
    const submittedName = String(values.name);
    if ([submittedCompanyName, submittedCompanyNameAr, submittedName].some(looksLikeEmail)) {
      setError(ar ? 'الاسم واسم الشركة لا يمكن أن يكونا بريدًا إلكترونيًا.' : 'Your name and company name cannot be email addresses.');
      setLoading(false);
      return;
    }
    try {
      const result = await signup({
        companyName: submittedCompanyName,
        companyNameAr: submittedCompanyNameAr,
        name: submittedName,
        email: String(values.email),
        password: String(values.password),
      });
      if (result.pendingApproval) setPendingApproval(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (ar ? 'تعذّر إنشاء الحساب' : 'Unable to create account'));
    } finally {
      setLoading(false);
    }
  }

  async function submitWithGoogle(idToken: string) {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle({ idToken, companyName: companyName.trim(), companyNameAr: companyNameAr.trim() });
      if (result.pendingApproval) setPendingApproval(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (ar ? 'تعذّر إنشاء الحساب' : 'Unable to create account'));
    } finally {
      setGoogleLoading(false);
    }
  }

  if (pendingApproval) {
    return (
      <AuthLayout headline={ar ? <>شبه خلصنا. ⏳</> : <>Almost there. ⏳</>}>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="animate-auth-pop flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <MailCheck className="h-8 w-8" />
          </div>
          <p className="text-navy-700">
            {ar
              ? 'تم إنشاء حسابك بنجاح. طلبك الآن قيد المراجعة من فريقنا، وهنبعتلك إشعار بمجرد الاعتماد عشان تقدر تسجل الدخول.'
              : "Your account was created successfully. Your request is now under review by our team, and you'll be notified as soon as it's approved so you can sign in."}
          </p>
          <Link href="/login" className="btn btn-primary btn-md rounded-full">
            {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline={ar ? <>انضم لينا النهارده 👋</> : <>Join us today 👋</>}>
      <p className="animate-auth-rise mb-6 text-sm text-navy-500" style={{ animationDelay: '20ms' }}>
        {ar
          ? 'كل حاجة محتاجها لإدارة مبيعاتك ومخزونك وفريقك، في مكان واحد.'
          : 'Everything you need to run sales, inventory, and your team — in one place.'}
      </p>

      {error && (
        <div role="alert" className="animate-auth-rise mb-6 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      {isGoogleSignInAvailable && (
        <>
          <div className="animate-auth-rise flex justify-center" style={{ animationDelay: '40ms' }}>
            <GoogleSignInButton
              ar={ar}
              onCredential={(idToken) => void submitWithGoogle(idToken)}
              disabled={!companyName.trim() || googleLoading}
              disabledHint={!companyName.trim() ? (ar ? 'اكتب اسم الشركة أولًا' : 'Type your company name first') : undefined}
            />
          </div>

          <div className="animate-auth-rise my-6 flex items-center gap-3" style={{ animationDelay: '60ms' }}>
            <div className="h-px flex-1 bg-navy-200" />
            <span className="text-xs font-medium text-navy-400">{ar ? 'أو' : 'or'}</span>
            <div className="h-px flex-1 bg-navy-200" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="animate-auth-rise" style={{ animationDelay: '100ms' }}>
            <label htmlFor="companyName" className="label text-navy-700">
              {ar ? 'اسم الشركة' : 'Company name'}
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                id="companyName"
                name="companyName"
                type="text"
                className="input ps-10 rounded-full transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
                required
                minLength={2}
                maxLength={120}
                pattern="[^@]+"
                title={ar ? 'أدخل اسم شركة، وليس بريدًا إلكترونيًا' : 'Enter a company name, not an email address'}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>
          <div className="animate-auth-rise" style={{ animationDelay: '120ms' }}>
            <label htmlFor="companyNameAr" className="label text-navy-700">
              {ar ? 'بالعربية' : 'Arabic name'}
            </label>
            <input
              id="companyNameAr"
              name="companyNameAr"
              type="text"
              className="input rounded-full transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              maxLength={120}
              pattern="[^@]*"
              title={ar ? 'أدخل اسم شركة، وليس بريدًا إلكترونيًا' : 'Enter a company name, not an email address'}
              placeholder={ar ? 'اختياري' : 'Optional'}
              value={companyNameAr}
              onChange={(e) => setCompanyNameAr(e.target.value)}
            />
          </div>
        </div>
        <div className="animate-auth-rise" style={{ animationDelay: '140ms' }}>
          <label htmlFor="name" className="label text-navy-700">
            {ar ? 'اسمك' : 'Your name'}
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              id="name"
              name="name"
              type="text"
              className="input ps-10 rounded-full transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              required
              minLength={2}
              maxLength={120}
              pattern="[^@]+"
              title={ar ? 'أدخل اسمك، وليس بريدًا إلكترونيًا' : 'Enter your name, not an email address'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="animate-auth-rise" style={{ animationDelay: '160ms' }}>
          <label htmlFor="email" className="label text-navy-700">
            {ar ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              id="email"
              name="email"
              type="email"
              className="input ps-10 rounded-full transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              required
              autoComplete="email"
              placeholder="you@company.com"
            />
          </div>
        </div>
        <div className="animate-auth-rise" style={{ animationDelay: '180ms' }}>
          <label htmlFor="password" className="label text-navy-700">
            {ar ? 'كلمة المرور' : 'Password'}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              id="password"
              name="password"
              type="password"
              className="input ps-10 rounded-full transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="animate-auth-rise group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-600/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
          style={{ animationDelay: '220ms' }}
        >
          <UserPlus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          {loading ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'ابدأ التجربة المجانية' : 'Start free trial')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        {ar ? 'عندك حساب بالفعل؟' : 'Already have an account?'}{' '}
        <Link href="/login" className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:decoration-primary-700">
          {ar ? 'تسجيل الدخول' : 'Sign in'}
        </Link>
      </p>
    </AuthLayout>
  );
}
