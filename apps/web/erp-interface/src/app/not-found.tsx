import Link from '@/components/router/Link';
import { ArrowRight, SearchX } from 'lucide-react';

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-navy-50 p-6 dark:bg-navy-950"><div className="card max-w-lg p-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"><SearchX className="h-8 w-8" /></span><p className="mt-5 text-sm font-bold text-primary-600">404</p><h1 className="mt-2 text-2xl font-bold text-navy-900 dark:text-white">الصفحة غير موجودة</h1><p className="mt-2 text-navy-500 dark:text-navy-400">الرابط غير صحيح أو تم نقل الصفحة إلى عنوان جديد.</p><Link href="/" className="btn btn-primary btn-md mt-6"><ArrowRight className="h-4 w-4" />العودة للوحة التحكم</Link></div></main>;
}
