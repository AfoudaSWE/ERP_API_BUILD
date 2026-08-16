import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export default function NotFoundPage() { const { t } = useTranslation(); return <main className="state-page"><span className="state-code">404</span><h1>{t('notFound')}</h1><Link className="btn btn--primary" to="/">{t('backHome')}</Link></main>; }
