import { useState, type FormEvent } from 'react';
import { Building2, UserPlus } from 'lucide-react';
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
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              {ar ? 'إنشاء حساب شركة جديد' : 'Create your company account'}
            </h1>
            <p className="text-sm text-navy-500">
              {ar ? 'تجربة مجانية 14 يوم، بدون بطاقة ائتمان' : '14-day free trial, no credit card required'}
            </p>
          </div>
        </div>
        {error && (
          <div role="alert" className="mb-5 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="companyName">{ar ? 'اسم الشركة' : 'Company name'}</label>
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
              <label className="label" htmlFor="companyNameAr">{ar ? 'اسم الشركة بالعربية' : 'Company name (Arabic)'}</label>
              <input id="companyNameAr" name="companyNameAr" type="text" className="input" maxLength={120} placeholder={ar ? 'اختياري' : 'Optional'} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="name">{ar ? 'اسمك' : 'Your name'}</label>
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
            <label className="label" htmlFor="email">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input bg-navy-50 dark:bg-navy-800"
              required
              readOnly
              value={email}
              placeholder={ar ? 'اكتب اسم الشركة أولاً' : 'Type the company name first'}
            />
            <p className="mt-1 text-xs text-navy-400">
              {ar ? 'ثابت حسب اسم الشركة، بيتحدّث تلقائيًا لما تغيّر اسم الشركة.' : 'Fixed to the company name, and updates automatically as you edit it.'}
            </p>
          </div>
          <div>
            <label className="label" htmlFor="password">{ar ? 'كلمة المرور' : 'Password'}</label>
            <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full justify-center">
            <UserPlus className="h-4 w-4" />
            {loading ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'ابدأ التجربة المجانية' : 'Start free trial')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-navy-500">
          {ar ? 'عندك حساب بالفعل؟' : 'Already have an account?'}{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            {ar ? 'تسجيل الدخول' : 'Sign in'}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
