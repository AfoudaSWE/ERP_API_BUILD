export default function Loading() {
  return <div className="flex min-h-screen items-center justify-center bg-navy-50 p-6 dark:bg-navy-950" role="status" aria-live="polite"><div className="text-center"><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600 dark:border-navy-700 dark:border-t-primary-400" /><p className="mt-4 font-medium text-navy-700 dark:text-navy-200">جارٍ تحميل الصفحة...</p></div></div>;
}
