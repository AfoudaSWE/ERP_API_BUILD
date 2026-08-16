import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './StoreProvider';
import { AppLayout } from '../components/layout/AppLayout';
import { PageLoader } from '../components/ui/States';
import { CustomerProvider } from './CustomerProvider';

const HomePage = lazy(() => import('../features/home/HomePage'));
const ProductsPage = lazy(() => import('../features/products/ProductsPage'));
const ProductPage = lazy(() => import('../features/products/ProductPage'));
const CartPage = lazy(() => import('../features/cart/CartPage'));
const WishlistPage = lazy(() => import('../features/wishlist/WishlistPage'));
const CheckoutPage = lazy(() => import('../features/checkout/CheckoutPage'));
const AccountPage = lazy(() => import('../features/account/AccountPage'));
const OrderSuccessPage = lazy(() => import('../features/checkout/OrderSuccessPage'));
const StaticPage = lazy(() => import('../features/content/StaticPage'));
const NotFoundPage = lazy(() => import('../features/content/NotFoundPage'));
const ComparisonPage = lazy(() => import('../features/comparison/ComparisonPage'));

export default function App() {
  return <BrowserRouter><CustomerProvider><StoreProvider><Routes><Route element={<AppLayout/>}>
    <Route index element={<Suspense fallback={<PageLoader/>}><HomePage/></Suspense>}/>
    <Route path="products" element={<Suspense fallback={<PageLoader/>}><ProductsPage/></Suspense>}/>
    <Route path="category/:category" element={<Suspense fallback={<PageLoader/>}><ProductsPage/></Suspense>}/>
    <Route path="brand/:brand" element={<Suspense fallback={<PageLoader/>}><ProductsPage/></Suspense>}/>
    <Route path="search" element={<Suspense fallback={<PageLoader/>}><ProductsPage/></Suspense>}/>
    <Route path="product/:slug" element={<Suspense fallback={<PageLoader/>}><ProductPage/></Suspense>}/>
    <Route path="cart" element={<Suspense fallback={<PageLoader/>}><CartPage/></Suspense>}/>
    <Route path="checkout" element={<Suspense fallback={<PageLoader/>}><CheckoutPage/></Suspense>}/>
    <Route path="order-success/:orderId" element={<Suspense fallback={<PageLoader/>}><OrderSuccessPage/></Suspense>}/>
    <Route path="account/wishlist" element={<Suspense fallback={<PageLoader/>}><WishlistPage/></Suspense>}/>
    <Route path="account/*" element={<Suspense fallback={<PageLoader/>}><AccountPage/></Suspense>}/>
    <Route path="compare" element={<Suspense fallback={<PageLoader/>}><ComparisonPage/></Suspense>}/>
    <Route path=":page" element={<Suspense fallback={<PageLoader/>}><StaticPage/></Suspense>}/>
    <Route path="*" element={<Suspense fallback={<PageLoader/>}><NotFoundPage/></Suspense>}/>
  </Route></Routes></StoreProvider></CustomerProvider></BrowserRouter>;
}
