import { Link, useParams } from 'react-router-dom';

const pages = {
  about: ['About Malek Stores', 'A premium electronics storefront connected to a real inventory and commerce platform.'],
  contact: ['Contact us', 'Call 16420 or use the support details configured for this storefront.'],
  privacy: ['Privacy', 'Your cart token and interface preferences are stored locally. Account data is handled through the platform API.'],
  terms: ['Terms', 'Prices, stock, shipping, and payment availability are confirmed by the backend at checkout.'],
};
export default function StaticPage() { const { page } = useParams(); const content = pages[page]; if (!content) return <NotFound/>; return <main className="content-page"><div className="container content-page__inner"><span className="section-kicker">Malek Stores</span><h1>{content[0]}</h1><p>{content[1]}</p><Link className="btn btn--primary" to="/products">Browse products</Link></div></main>; }
function NotFound() { return <main className="state-page"><h1>Page not found</h1><Link className="btn btn--primary" to="/">Back to home</Link></main>; }
