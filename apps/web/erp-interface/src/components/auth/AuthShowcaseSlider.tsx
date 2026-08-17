import { useEffect, useState } from 'react';
import { BarChart3, Boxes, ShoppingCart, UserCog } from 'lucide-react';

const SLIDES = [
  {
    icon: ShoppingCart,
    gradient: 'from-primary-500 via-primary-600 to-primary-800',
    title: { en: 'Sell faster', ar: 'بيع أسرع' },
    text: {
      en: 'Invoices, quotes, and payments in one flow — no spreadsheets, no double entry.',
      ar: 'فواتير وعروض أسعار ومدفوعات في مكان واحد، بدون شيتات إكسل أو ازدواج في الإدخال.',
    },
  },
  {
    icon: Boxes,
    gradient: 'from-teal-500 via-teal-600 to-teal-800',
    title: { en: 'Track every item', ar: 'تابع كل صنف' },
    text: {
      en: 'Live stock across branches and warehouses, with transfers and adjustments that just work.',
      ar: 'مخزون مباشر عبر الفروع والمخازن، مع نقل وتسوية بسيطة وسريعة.',
    },
  },
  {
    icon: UserCog,
    gradient: 'from-violet-500 via-violet-600 to-violet-800',
    title: { en: 'Run your team', ar: 'إدارة فريقك' },
    text: {
      en: 'Attendance, payroll, and roles for every branch — all in the same place.',
      ar: 'حضور ورواتب وصلاحيات لكل فرع، كله في مكان واحد.',
    },
  },
  {
    icon: BarChart3,
    gradient: 'from-amber-500 via-amber-600 to-amber-700',
    title: { en: 'See it clearly', ar: 'شوف كل حاجة بوضوح' },
    text: {
      en: 'Real numbers on sales, cash, and inventory health — updated as you work.',
      ar: 'أرقام حقيقية عن المبيعات والخزينة وحالة المخزون، بتتحدث أول بأول.',
    },
  },
];

export function AuthShowcaseSlider({ ar }: { ar: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % SLIDES.length), 4500);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="relative h-full min-h-[26rem] w-full overflow-hidden rounded-3xl shadow-xl shadow-navy-900/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, slideIndex) => {
        const Icon = slide.icon;
        const active = slideIndex === index;
        return (
          <div
            key={slide.title.en}
            aria-hidden={!active}
            className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-br p-8 transition-opacity duration-700 ease-out sm:p-10 ${slide.gradient} ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="animate-auth-pop relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Icon className="h-7 w-7 text-white" />
            </div>
            <h2 className="relative mt-6 text-3xl font-bold leading-tight text-white sm:text-4xl">
              {ar ? slide.title.ar : slide.title.en}
            </h2>
            <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
              {ar ? slide.text.ar : slide.text.en}
            </p>
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
        {SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.title.en}
            type="button"
            onClick={() => setIndex(slideIndex)}
            aria-label={ar ? `الشريحة ${slideIndex + 1}` : `Slide ${slideIndex + 1}`}
            aria-current={slideIndex === index}
            className={`h-1.5 rounded-full transition-all duration-300 ${slideIndex === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
}
