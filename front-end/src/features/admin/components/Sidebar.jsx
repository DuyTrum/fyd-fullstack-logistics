import { NavLink } from "react-router-dom";
import "../styles/sidebar.css";
import { useTranslation } from "react-i18next";

// SVG Icons - Each menu item has a unique icon
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  orders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  customers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  ai: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  revenue: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  inventory: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  shop: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  featured: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  lucky: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <path d="M19.07 4.93l-14.14 14.14" />
      <path d="M4.93 4.93l14.14 14.14" />
    </svg>
  ),
  // NEW UNIQUE ICONS
  promotions: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M16.24 16.24l2.83 2.83M18 12h4M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  tiers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15l-2 5l9-13h-5l2-5l-9 13h5z" />
    </svg>
  ),
  staff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  categories: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  colorSize: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="10.5" r="2.5" />
      <circle cx="8.5" cy="7.5" r="2.5" />
      <circle cx="6.5" cy="12.5" r="2.5" />
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  reviews: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h8" />
      <path d="M8 14h4" />
    </svg>
  ),
  activityLogs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),

  nightMarket: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
      <path d="M19 14v1l-1 4H13l-1-4v-1" />
      <path d="M11 14h10" />
    </svg>
  ),
  flashSale: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  devPortal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
};

const Item = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}
    end={to === "/admin"}
  >
    <span className="navIcon" aria-hidden="true">{icon}</span>
    <span className="navLabel">{label}</span>
    {badge ? <span className="navBadge">{badge}</span> : null}
  </NavLink>
);

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <NavLink to="/admin" className="brand">
        <div className="brandMark">FYD</div>
        <div className="brandText">
          <div className="brandName">FYD Admin</div>
          <div className="brandSub">{t("common.store_management", "Quản lý cửa hàng")}</div>
        </div>
      </NavLink>

      <div className="navGroupTitle">{t("sidebar.overview")}</div>
      <div className="navGroup">
        <Item to="/admin" icon={icons.dashboard} label={t("common.dashboard")} />
        <Item to="/admin/orders" icon={icons.orders} label={t("common.orders")} />
        <Item to="/admin/revenue" icon={icons.revenue} label={t("common.revenue")} />
      </div>

      <div className="navGroupTitle">{t("sidebar.products")}</div>
      <div className="navGroup">
        <Item to="/admin/products" icon={icons.products} label={t("common.products")} />
        <Item to="/admin/categories" icon={icons.categories} label={t("common.categories")} />
        <Item to="/admin/colors-sizes" icon={icons.colorSize} label={t("common.color_size")} />
        <Item to="/admin/inventory" icon={icons.inventory} label={t("common.inventory")} />
      </div>

      <div className="navGroupTitle">{t("sidebar.marketing")}</div>
      <div className="navGroup">
        <Item to="/admin/featured" icon={icons.featured} label={t("common.featured")} />
        <Item to="/admin/promotions" icon={icons.promotions} label={t("common.promotions")} />
        <Item to="/admin/lucky-spin" icon={icons.lucky} label={t("common.lucky_spin")} />
        <Item to="/admin/night-market" icon={icons.nightMarket} label={t("common.night_market")} />
        <Item to="/admin/flash-sale" icon={icons.flashSale} label={t("common.flash_sale", "Flash Sale")} />
        <Item to="/admin/tiers" icon={icons.tiers} label={t("common.tiers")} />
      </div>

      <div className="navGroupTitle">{t("sidebar.customers")}</div>
      <div className="navGroup">
        <Item to="/admin/customers" icon={icons.customers} label={t("common.customers")} />
        <Item to="/admin/reviews" icon={icons.reviews} label={t("common.reviews")} />
      </div>

      <div className="navGroupTitle">{t("sidebar.system")}</div>
      <div className="navGroup">
        <Item to="/admin/staff" icon={icons.staff} label={t("common.staff")} />
        <Item to="/admin/activity-logs" icon={icons.activityLogs} label={t("activity.title")} />
        <Item to="/admin/ai" icon={icons.ai} label={t("common.ai_suggestion")} />
        <Item to="/admin/dev-portal" icon={icons.devPortal} label={t("common.dev_portal", "Developer Portal")} />
      </div>

      <div className="sidebarFooter">
        <a href="/" className="back-shop-btn">
          {icons.shop}
          <span>{t("common.view_shop", "Xem cửa hàng")}</span>
        </a>
      </div>
    </aside>
  );
}

