import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import "../styles/layout.css";
import "../styles/admin-theme.css";
import { isLoggedIn } from "@shared/utils/authSession.js";
import { NotificationProvider } from "../hooks/useNotifications.jsx";
import { useTranslation } from "react-i18next";

const routesMeta = [
  { path: "/admin/orders", kicker: "overview", title: "orders" },
  { path: "/admin/revenue", kicker: "overview", title: "revenue" },
  { path: "/admin/products", kicker: "products", title: "products" },
  { path: "/admin/categories", kicker: "products", title: "categories" },
  { path: "/admin/colors-sizes", kicker: "products", title: "color_size" },
  { path: "/admin/inventory", kicker: "products", title: "inventory" },
  { path: "/admin/customers", kicker: "customers", title: "customers" },
  { path: "/admin/reviews", kicker: "customers", title: "reviews" },
  { path: "/admin/promotions", kicker: "marketing", title: "promotions" },
  { path: "/admin/featured", kicker: "marketing", title: "featured" },
  { path: "/admin/tiers", kicker: "marketing", title: "tiers" },
  { path: "/admin/lucky-spin", kicker: "marketing", title: "lucky_spin" },
  { path: "/admin/night-market", kicker: "marketing", title: "night_market" },
  { path: "/admin/flash-sale", kicker: "marketing", title: "flash_sale" },
  { path: "/admin/staff", kicker: "system", title: "staff" },
  { path: "/admin/activity-logs", kicker: "system", title: "activity.title" },
  { path: "/admin/ai", kicker: "system", title: "ai_suggestion" },
  { path: "/admin/profile", kicker: "account", title: "profile" },
  { path: "/admin", kicker: "overview", title: "dashboard" },
];


export default function Layout() {
  const { t } = useTranslation();

  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }

  const location = useLocation();
  // Find metadata matching the current path (longest match first)
  const meta = routesMeta.find(m => location.pathname === m.path || (m.path !== "/admin" && location.pathname.startsWith(m.path))) || routesMeta[routesMeta.length - 1];

  // Translation keys for kicker and title
  const kickerKey = `sidebar.${meta.kicker}`;
  const titleKey = meta.title.includes('.') ? meta.title : `common.${meta.title}`;

  return (
    <NotificationProvider>
      <div className="admin-shell">
        <div className="appShell">
          <Sidebar />
          <div className="appMain">
            <Header
              kicker={t(kickerKey, meta.kicker)}
              title={t(titleKey, meta.title)}
            />
            <main className="appContent">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </NotificationProvider>
  );
}

