import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { initFacebookSdk } from "@shared/utils/facebookSdk.js";
import { useTranslation } from "react-i18next";

// Admin feature
import {
  AdminLayout,
  Dashboard,
  Orders,
  Products,
  Customers,
  AI,
  Revenue,
  Inventory,
  Promotions,
  Tiers,
  Profile,
  FeaturedZones,
  FeaturedZoneEditor,
  LuckySpin,
  NightMarketAdmin,
  Staff,
  Categories,
  ColorsAndSizes,
  Reviews,
  ActivityLogs,
  FlashSaleAdmin,
  DevPortal
} from "@admin";

// Auth feature
import { Login, VerifyOtp } from "@auth";

// Shop feature
import { Shop, CustomerProfile, Checkout, OrderSuccess, ProductDetail, InfoPage, PaymentCallback, CompareModal, CompareDrawer, SharedWishlistPage, TrackOrder, NightMarket } from "@shop";

import { ToastProvider } from "@shared/context/ToastContext";
import { ConfirmProvider } from "@shared/context/ConfirmContext";
import { CompareProvider } from "@shared/context/CompareContext";
import { CartProvider } from "@shared/context/CartContext";
import ProtectedRoute from "@shared/components/ProtectedRoute.jsx";
import ReloadPrompt from "@shared/components/ReloadPrompt.jsx";

export default function App() {
  const location = useLocation();
  const { i18n } = useTranslation();

  // Initialize Facebook SDK and manage Theme class on body
  useEffect(() => {
    initFacebookSdk();
  }, []);

  // Manage dynamic theme class on body to prevent CSS leaking
  // Shop needs .light class for global.css overrides, Admin uses dark by default
  // Also force Vietnamese language for shop client and restore admin language preference
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/shop') || path === '/' || path.startsWith('/product')) {
      document.body.classList.add('light');
      if (i18n.language === 'en') {
        localStorage.setItem('admin_lng', 'en');
        i18n.changeLanguage('vi');
      }
    } else {
      document.body.classList.remove('light');
      if (path.startsWith('/admin')) {
        const savedAdminLng = localStorage.getItem('admin_lng');
        if (savedAdminLng && savedAdminLng !== i18n.language) {
          i18n.changeLanguage(savedAdminLng);
        }
      }
    }
  }, [location, i18n]);

  return (
    <ConfirmProvider>
      <ToastProvider>
        <CompareProvider>
          <CartProvider>
            <Routes>
              {/* Default route -> Shop */}
              <Route path="/" element={<Navigate to="/shop" replace />} />

              {/* Shop pages */}
              <Route path="/shop" element={<><Shop /><CompareDrawer /><CompareModal /></>} />
              <Route path="/shop/product/:productId" element={<><ProductDetail /><CompareDrawer /><CompareModal /></>} />
              <Route path="/shop/profile" element={<CustomerProfile />} />
              <Route path="/shop/checkout" element={<Checkout />} />
              <Route path="/shop/order-success/:orderId" element={<OrderSuccess />} />
              <Route path="/shop/payment-callback" element={<PaymentCallback />} />
              <Route path="/shop/info/:slug" element={<InfoPage />} />
              <Route path="/shop/wishlist/:shareCode" element={<SharedWishlistPage />} />
              <Route path="/shop/track-order" element={<TrackOrder />} />
              <Route path="/shop/night-market" element={<NightMarket />} />

              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin/verify-otp" element={<VerifyOtp />} />

              {/* Admin pages (protected) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="products" element={<Products />} />
                <Route path="customers" element={<Customers />} />
                <Route path="ai" element={<AI />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="promotions" element={<Promotions />} />
                <Route path="tiers" element={<Tiers />} />
                <Route path="profile" element={<Profile />} />
                <Route path="featured" element={<FeaturedZones />} />
                <Route path="featured/:id" element={<FeaturedZoneEditor />} />
                <Route path="lucky-spin" element={<LuckySpin />} />
                <Route path="night-market" element={<NightMarketAdmin />} />
                <Route
                  path="staff"
                  element={
                    <ProtectedRoute permission="staff:read">
                      <Staff />
                    </ProtectedRoute>
                  }
                />
                <Route path="categories" element={<Categories />} />
                <Route path="colors-sizes" element={<ColorsAndSizes />} />
                <Route path="reviews" element={<Reviews />} />
                <Route path="activity-logs" element={<ActivityLogs />} />
                <Route path="flash-sale" element={<FlashSaleAdmin />} />
                <Route path="dev-portal" element={<DevPortal />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/shop" replace />} />
            </Routes>
          </CartProvider>
        </CompareProvider>
        <ReloadPrompt />
      </ToastProvider>
    </ConfirmProvider>
  );
}
