import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SALE_DURATION = (((21 * 24 + 10) * 60 + 16) * 60 + 22) * 1000;
const SALE_DEADLINE = Date.now() + SALE_DURATION;
const INITIAL_REMAINING = { days: 21, hours: 10, minutes: 16, seconds: 22 };
const pad = (value) => String(value).padStart(2, '0');
const getRemaining = (deadline) => {
  const total = Math.max(0, deadline - Date.now());
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor(total / 3600000) % 24,
    minutes: Math.floor(total / 60000) % 60,
    seconds: Math.floor(total / 1000) % 60,
  };
};

export function FlashSaleBanner() {
  const { i18n } = useTranslation(); const ar = i18n.language === 'ar';
  const [remaining, setRemaining] = useState(INITIAL_REMAINING);

  useEffect(() => {
    const update = () => setRemaining(getRemaining(SALE_DEADLINE));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const units = [remaining.days, remaining.hours, remaining.minutes, remaining.seconds];
  return <section className="flash-sale" aria-label={ar ? 'عرض لفترة محدودة' : 'Limited-time offer'}>
    <div className="flash-sale__alert"><BellRing aria-hidden="true"/><strong>{ar ? 'تخفيضات فورية بدأت الآن!' : 'Flash sale now on!'}</strong></div>
    <div className="flash-sale__timer" role="timer" aria-live="off" aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}>
      {units.map((unit, index) => <span key={index}>{pad(unit)}{index < units.length - 1 ? <i aria-hidden="true">:</i> : null}</span>)}
    </div>
    <div className="flash-sale__offer"><strong>{ar ? 'اشتري 2 واحصل على 1 مجاناً' : 'Buy 2 get 1 free'}</strong><span>{ar ? 'على منتجات مختارة' : 'On selected products'}</span></div>
    <Link className="flash-sale__cta" to="/products?sort=discount">{ar ? 'احصل على العرض' : 'Get offer'}</Link>
  </section>;
}
