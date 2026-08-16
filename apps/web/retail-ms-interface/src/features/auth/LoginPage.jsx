import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Boxes, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, Moon, ShieldCheck, Sun, WandSparkles } from 'lucide-react';
import { DEMO_ADMIN } from '../../services/authService';
import { useAppStore } from '../../store/appStore';
import { speakWelcome } from '../../utils/speech';
import logoUrl from '../../assets/2B_idOyAcQyQk_0.png';

function validate(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Enter your email or username.';
  else if (values.email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Enter your password.';
  return errors;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAppStore(state => state.login);
  const theme = useAppStore(state => state.theme);
  const toggleTheme = useAppStore(state => state.toggleTheme);
  const [values, setValues] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setAuthError('');
  };

  const fillDemo = () => {
    setValues(current => ({ ...current, email: DEMO_ADMIN.email, password: DEMO_ADMIN.password }));
    setErrors({});
    setAuthError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setAuthError('');
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      const user = await login({ email: values.email, password: values.password }, values.remember);
      speakWelcome(user.displayName);
      const intended = location.state?.from;
      navigate(typeof intended === 'string' && intended.startsWith('/') ? intended : '/', { replace: true });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_15%_15%,rgba(249,115,22,.16),transparent_34%),radial-gradient(circle_at_85%_85%,rgba(249,115,22,.08),transparent_30%)]" />
      <button type="button" onClick={toggleTheme} className="ui-button absolute right-4 top-4 z-10 h-9 w-9" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <div className="relative mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,.95fr)]">
        <section className="hidden border-r border-[var(--border)] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16" aria-label="RetailTwin product overview">
          <Brand />
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-orange-500">Retail operations, connected</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">See every store signal.<br />Act with confidence.</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--muted-foreground)]">Unify sales, inventory, footfall, queues, alerts, and digital-twin intelligence in one operational workspace.</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <ProductSignal icon={Boxes} value="5" label="Connected stores" />
              <ProductSignal icon={ShieldCheck} value="Live" label="Operational status" />
              <ProductSignal icon={WandSparkles} value="AI" label="Decision support" />
            </div>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Privacy-first analytics · Anonymous movement data · Human-approved actions</p>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><Brand /></div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl shadow-black/5 sm:p-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-orange-500">Secure workspace</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight">Welcome Back</h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Sign in to manage stores, sales, inventory, and operations.</p>
              </div>

              <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
                {authError && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-500">{authError}</div>}
                {recoveryMessage && <div role="status" className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600">{recoveryMessage}</div>}

                <Field label="Email or username" error={errors.email} icon={Mail} id="login-email">
                  <input id="login-email" name="email" autoComplete="username" autoFocus value={values.email} onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} className="h-11 w-full bg-transparent pl-9 pr-3 text-sm outline-none" placeholder="admin@retail.com" />
                </Field>

                <Field label="Password" error={errors.password} icon={LockKeyhole} id="login-password">
                  <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={values.password} onChange={event => update('password', event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} className="h-11 w-full bg-transparent pl-9 pr-11 text-sm outline-none" placeholder="Enter your password" />
                  <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </Field>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-[var(--muted-foreground)]"><input type="checkbox" checked={values.remember} onChange={event => update('remember', event.target.checked)} className="h-4 w-4 accent-orange-500" />Remember me</label>
                  <a href="#forgot-password" onClick={event => { event.preventDefault(); setRecoveryMessage('Password recovery is unavailable in demo mode. Use the Demo Account below.'); }} className="font-medium text-orange-500 hover:text-orange-400">Forgot password?</a>
                </div>

                <button type="submit" disabled={loading} className="ui-button ui-button-primary h-11 w-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <><Loader2 size={16} className="animate-spin" />Signing in…</> : 'Sign In'}
                </button>
              </form>

              <div id="demo-account" className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/[.06] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold">Demo Account</p><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Administrator access for product evaluation</p></div>
                  <button type="button" onClick={fillDemo} className="ui-button px-2.5 py-1.5 text-[10px] font-semibold"><Check size={12} />Fill form</button>
                </div>
                <dl className="mt-3 grid grid-cols-[4rem_1fr] gap-x-2 gap-y-1 text-[11px]"><dt className="text-[var(--muted-foreground)]">Email</dt><dd className="font-mono">{DEMO_ADMIN.email}</dd><dt className="text-[var(--muted-foreground)]">Password</dt><dd className="font-mono">{DEMO_ADMIN.password}</dd><dt className="text-[var(--muted-foreground)]">Role</dt><dd>{DEMO_ADMIN.role}</dd></dl>
              </div>
            </div>
            <p className="mt-5 text-center text-[10px] text-[var(--muted-foreground)]">Demo authentication · No production identity provider connected</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return <div className="flex items-center "><span ><img src={logoUrl} alt="" className="w-50 object-contain" /></span><div><p className="text-base font-bold tracking-tight text-[34px]">RetailTwin</p><p className="text-[12px] uppercase tracking-[.16em] text-[var(--muted-foreground)]">Store Intelligence</p></div></div>;
}

function ProductSignal({ icon: Icon, value, label }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><Icon size={15} className="text-orange-500" /><p className="mt-3 text-lg font-bold">{value}</p><p className="mt-0.5 text-[9px] text-[var(--muted-foreground)]">{label}</p></div>;
}

function Field({ label, error, icon: Icon, id, children }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-medium">{label}</label><div className={`relative rounded-lg border bg-[var(--background)] transition-colors focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-[var(--ring)] ${error ? 'border-red-500' : 'border-[var(--input)]'}`}><Icon size={15} className="pointer-events-none absolute left-3 top-3.5 text-[var(--muted-foreground)]" />{children}</div>{error && <p id={`${id}-error`} className="mt-1.5 text-[11px] text-red-500">{error}</p>}</div>;
}
