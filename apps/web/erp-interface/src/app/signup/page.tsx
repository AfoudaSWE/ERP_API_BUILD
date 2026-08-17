import { useState, type FormEvent } from 'react';
import { MailCheck, UserPlus } from 'lucide-react';
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

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignupPage() {
  const { signup } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const domain = slugForEmail(companyName);
  const email = domain ? `admin@${domain}.com` : '';

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

  if (pendingApproval) {
    return (
      <AuthLayout
        headline={ar ? <>شبه خلصنا.<br />في انتظار الاعتماد.</> : <>Almost there.<br />Awaiting approval.</>}
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <MailCheck className="h-12 w-12 text-primary-600" />
          <p className="text-navy-700">
            {ar
              ? 'تم إنشاء حسابك بنجاح. طلبك الآن قيد المراجعة من فريقنا، وهنبعتلك إشعار بمجرد الاعتماد عشان تقدر تسجل الدخول.'
              : "Your account was created successfully. Your request is now under review by our team, and you'll be notified as soon as it's approved so you can sign in."}
          </p>
          <Link href="/login" className="btn btn-primary btn-md">
            {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
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
            <label htmlFor="companyName" className="label text-navy-700">
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
              pattern="[^@]+"
              title={ar ? 'أدخل اسم شركة، وليس بريدًا إلكترونيًا' : 'Enter a company name, not an email address'}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="companyNameAr" className="label text-navy-700">
              {ar ? 'بالعربية' : 'Arabic name'}
            </label>
            <input id="companyNameAr" name="companyNameAr" type="text" className="input" maxLength={120} pattern="[^@]*" title={ar ? 'أدخل اسم شركة، وليس بريدًا إلكترونيًا' : 'Enter a company name, not an email address'} placeholder={ar ? 'اختياري' : 'Optional'} />
          </div>
        </div>
        <div>
          <label htmlFor="name" className="label text-navy-700">
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
            pattern="[^@]+"
            title={ar ? 'أدخل اسمك، وليس بريدًا إلكترونيًا' : 'Enter your name, not an email address'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email" className="label text-navy-700">
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
          <p className="mt-2 text-xs text-navy-500">
            {ar ? 'ثابت حسب اسم الشركة' : 'Fixed to the company name'}
          </p>
        </div>
        <div>
          <label htmlFor="password" className="label text-navy-700">
            {ar ? 'كلمة المرور' : 'Password'}
          </label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full justify-center">
          <UserPlus className="h-4 w-4" />
          {loading ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'ابدأ التجربة المجانية' : 'Start free trial')}
        </button>
      </form>
      <div className="my-6 border-t border-dashed border-navy-200" />
      <p className="text-sm text-navy-500">
        {ar ? 'عندك حساب بالفعل؟' : 'Already have an account?'}{' '}
        <Link href="/login" className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:decoration-primary-700">
          {ar ? 'تسجيل الدخول' : 'Sign in'}
        </Link>
      </p>
    </AuthLayout>
  );
}
