import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { HomePage } from '../pages/HomePage';
import { LoadingState } from '../components/ui/AsyncState';
import { Providers } from './Providers';

const AccountPage = lazy(() => import('../pages/AccountPage').then((module) => ({ default: module.AccountPage })));
const AddressesPage = lazy(() => import('../pages/AddressesPage').then((module) => ({ default: module.AddressesPage })));
const CartPage = lazy(() => import('../pages/CartPage').then((module) => ({ default: module.CartPage })));
const ForgotPasswordPage = lazy(() => import('../pages/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })));
const LoginPage = lazy(() => import('../pages/AuthPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../pages/AuthPages').then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import('../pages/AuthPages').then((module) => ({ default: module.ResetPasswordPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const ProductDetailsPage = lazy(() => import('../pages/ProductDetailsPage').then((module) => ({ default: module.ProductDetailsPage })));
const ProductsPage = lazy(() => import('../pages/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const VerifyMobilePage = lazy(() => import('../pages/VerifyMobilePage').then((module) => ({ default: module.VerifyMobilePage })));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('../pages/OrderConfirmationPage').then((module) => ({ default: module.OrderConfirmationPage })));
const OrderDetailsPage = lazy(() => import('../pages/OrderDetailsPage').then((module) => ({ default: module.OrderDetailsPage })));
const OrdersPage = lazy(() => import('../pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const TrackingPage = lazy(() => import('../pages/TrackingPage').then((module) => ({ default: module.TrackingPage })));
const ComplaintsPage = lazy(() => import('../pages/ComplaintsPage').then((module) => ({ default: module.ComplaintsPage })));
const ComplaintDetailsPage = lazy(() => import('../pages/ComplaintDetailsPage').then((module) => ({ default: module.ComplaintDetailsPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));

export function App() {
  return <BrowserRouter><Providers><Suspense fallback={<div className="page shell"><LoadingState label="Loading page" /></div>}><Routes><Route element={<CustomerLayout />}><Route index element={<HomePage />} /><Route path="shop" element={<ProductsPage />} /><Route path="products" element={<ProductsPage />} /><Route path="products/:productId" element={<ProductDetailsPage />} /><Route path="login" element={<LoginPage />} /><Route path="register" element={<RegisterPage />} /><Route path="forgot-password" element={<ForgotPasswordPage />} /><Route path="reset-password" element={<ResetPasswordPage />} /><Route path="verify-account" element={<VerifyMobilePage />} /><Route path="verify-mobile" element={<VerifyMobilePage />} /><Route element={<ProtectedRoute />}><Route path="cart" element={<CartPage />} /><Route path="account" element={<AccountPage />} /><Route path="profile" element={<ProfilePage />} /><Route path="addresses" element={<AddressesPage />} /><Route path="checkout" element={<CheckoutPage />} /><Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} /><Route path="orders" element={<OrdersPage />} /><Route path="orders/:orderId" element={<OrderDetailsPage />} /><Route path="orders/:orderId/tracking" element={<TrackingPage />} /><Route path="complaints" element={<ComplaintsPage />} /><Route path="complaints/:complaintId" element={<ComplaintDetailsPage />} /><Route path="notifications" element={<NotificationsPage />} /></Route><Route path="*" element={<NotFoundPage />} /></Route></Routes></Suspense></Providers></BrowserRouter>;
}
