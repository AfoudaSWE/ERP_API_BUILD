import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import Link from '@/components/router/Link';
import { AuthLayout } from '@/components/layout/AuthLayout';

function slugForEmail(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
}

export default function SignupPage() {
  const { signup } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const domain = slugForEmail(companyName);
  const email = domain ? `admin@${domain}.com` : '';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await signup({
        companyName: String(values.companyName),
        companyNameAr: String(values.companyNameAr ?? ''),
        name: String(values.name),
        email: String(values.email),
        password: String(values.password),
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (ar ? 'تعذّر إنشاء الحساب' : 'Unable to create account'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      meta={ar ? 'تجربة مجانية ١٤ يوم' : '14-DAY FREE TRIAL'}
      headline={ar ? <>شركتك.<br />جاهزة تشتغل.</> : <>Your company.<br />Ready to ship.</>}
    >
      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-400">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="companyName" className="mb-2 block font-mono text-xs uppercase tracking-wider text-navy-400">
              {ar ? 'اسم الشركة' : 'Company name'}
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              className="input"
              required
              minLength={2}
              maxLength={120}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="companyNameAr" className="mb-2 block font-mono text-xs uppercase tracking-wider text-navy-400">
              {ar ? 'بالعربية' : 'Arabic name'}
            </label>
            <input id="companyNameAr" name="companyNameAr" type="text" className="input" maxLength={120} placeholder={ar ? 'اختياري' : 'Optional'} />
          </div>
        </div>
        <div>
          <label htmlFor="name" className="mb-2 block font-mono text-xs uppercase tracking-wider text-navy-400">
            {ar ? 'اسمك' : 'Your name'}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="input"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block font-mono text-xs uppercase tracking-wider text-navy-400">
            {ar ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input opacity-70"
            required
            readOnly
            value={email}
            placeholder={ar ? 'اكتب اسم الشركة أولاً' : 'Type the company name first'}
          />
          <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-wider text-navy-600">
            {ar ? 'ثابت حسب اسم الشركة' : 'Fixed to the company name'}
          </p>
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block font-mono text-xs uppercase tracking-wider text-navy-400">
            {ar ? 'كلمة المرور' : 'Password'}
          </label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full justify-center">
          <UserPlus className="h-4 w-4" />
          {loading ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'ابدأ التجربة المجانية' : 'Start free trial')}
        </button>
      </form>
      <div className="my-6 border-t border-dashed border-navy-800" />
      <p className="font-mono text-xs uppercase tracking-wider text-navy-500">
        {ar ? 'عندك حساب بالفعل؟' : 'Already have an account?'}{' '}
        <Link href="/login" className="text-white underline decoration-navy-600 underline-offset-4 hover:decoration-white">
          {ar ? 'تسجيل الدخول' : 'Sign in'}
        </Link>
      </p>
    </AuthLayout>
  );
}
