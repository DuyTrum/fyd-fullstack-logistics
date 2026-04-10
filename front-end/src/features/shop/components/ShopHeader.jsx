import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompare } from "@shared/context/CompareContext";
import { useTranslation } from "react-i18next";
import { trackSearch } from "@shared/utils/analytics.js";
import { nightMarketAPI } from "@shared/utils/api.js";

// User Dropdown Menu for logged-in customers
function UserDropdown({ customer, onLogout, isOpen, onToggle }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onToggle(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      onToggle(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="user-dropdown"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`user-avatar-btn ${isOpen ? 'active' : ''}`}
        title={customer.fullName}
      >
        {customer.avatarUrl ? (
          <img src={customer.avatarUrl} alt={customer.fullName} className="user-avatar-img" />
        ) : (
          <span className="user-avatar-initials">{getInitials(customer.fullName)}</span>
        )}
      </button>
      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <span className="user-name">{customer.fullName}</span>
            <span className="user-email">{customer.email}</span>
          </div>
          <div className="user-dropdown-divider"></div>
          <button
            type="button"
            className="user-dropdown-item"
            onClick={() => { navigate('/shop/profile'); onToggle(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Hồ sơ của tôi
          </button>
          <button
            type="button"
            className="user-dropdown-item"
            onClick={() => { onLogout(); onToggle(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

// Category Dropdown Menu - Using hover for better UX
function CategoryDropdown({ category, onSelectCategory, isOpen, onToggle }) {
  const ref = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onToggle(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      onToggle(false);
    }, 150);
  };

  // Scroll xuống phần sản phẩm
  const scrollToProducts = () => {
    setTimeout(() => {
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSelect = (id, type) => {
    onSelectCategory(id, type);
    onToggle(false);
    scrollToProducts();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!category) return null;

  return (
    <div
      className="nav-dropdown"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`adidas-nav-item has-dropdown ${isOpen ? 'active' : ''}`}
      >
        {category.name}
        <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu">
          <button
            type="button"
            className="dropdown-item all"
            onClick={() => handleSelect(category.id, 'parent')}
          >
            Tất cả {category.name}
          </button>
          {category.children?.map(child => (
            <button
              type="button"
              key={child.id}
              className="dropdown-item"
              onClick={() => handleSelect(child.id, 'child')}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShopHeader({
  cartCount = 0,
  onCartClick = () => { },
  onSearchChange = () => { },
  searchValue = "",
  categories = [],
  onSelectCategory = () => { },
  onShowSale = () => { },
  onShowAll = () => { },
  customer,
  onLoginClick = () => { },
  onLogoutClick = () => { },
  wishlistCount = 0,
  onWishlistClick = () => { },
  onLuckySpinClick = () => { },
  onFlashSaleClick = () => { }
}) {
  const { compareCount, openCompareModal } = useCompare();
  const { t } = useTranslation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [nmActive, setNmActive] = useState(true); // Default to true to avoid flicker if active
  const navigate = useNavigate();

    useEffect(() => {
    const checkNMStatus = async () => {
      try {
        const CACHE_KEY = 'nm_status_cache';
        const CACHE_TTL = 30 * 1000; // 30 seconds
        
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { active, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setNmActive(active);
            return;
          }
        }

        // Use cache-busting timestamp to bypass browser cache
        const res = await nightMarketAPI.getStatus({ _t: Date.now() });
        const isActive = res.active;
        
        // Debug logging for developers
        console.log("Night Market Status Check:", {
          active: isActive,
          config: res.config,
          serverTime: res.serverTime,
          now: new Date().toISOString()
        });

        if (res.config && isActive === false) {
          console.warn("Night Market inactive due to time mismatch or manual toggle", {
            now: new Date().toLocaleString(),
            startTime: new Date(res.config.startTime).toLocaleString(),
            endTime: new Date(res.config.endTime).toLocaleString(),
            isActiveConfig: res.config.isActive
          });
        }

        setNmActive(isActive);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          active: isActive,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error("Failed to check NM status:", err);
      }
    };

    checkNMStatus();
  }, []);

  const aoCategory = categories.find(c => c.id === 1 || c.slug === 'ao');
  const quanCategory = categories.find(c => c.id === 2 || c.slug === 'quan');
  const giayCategory = categories.find(c => c.slug === 'giay' || c.name?.toLowerCase().includes('giày'));
  // Tìm category cho balo/túi/phụ kiện - có thể có nhiều tên khác nhau trong DB
  const baloCategory = categories.find(c =>
    c.slug === 'balo' ||
    c.slug === 'phu-kien' ||
    c.slug === 'accessories' ||
    c.name?.toLowerCase().includes('balo') ||
    c.name?.toLowerCase().includes('túi') ||
    c.name?.toLowerCase().includes('phụ kiện')
  );

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      navigate('/customer/login');
    }
  };

  // Scroll xuống phần sản phẩm
  const scrollToProducts = () => {
    setTimeout(() => {
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleShowAllClick = () => {
    onShowAll();
    scrollToProducts();
  };

  const handleShowSaleClick = () => {
    onShowSale();
    scrollToProducts();
  };

  return (
    <header className="adidas-header">
      <div className="adidas-header-top">
        <div className="adidas-header-left">
          <Link to="/shop" className="adidas-logo" onClick={onShowAll}>
            <span className="logo-text">FYD</span>
          </Link>
        </div>
        <nav className="adidas-nav">
          <button type="button" className="adidas-nav-item" onClick={handleShowAllClick}>TẤT CẢ</button>
          <CategoryDropdown
            category={aoCategory}
            onSelectCategory={onSelectCategory}
            isOpen={openDropdown === 'ao'}
            onToggle={(open) => setOpenDropdown(open ? 'ao' : null)}
          />
          <CategoryDropdown
            category={quanCategory}
            onSelectCategory={onSelectCategory}
            isOpen={openDropdown === 'quan'}
            onToggle={(open) => setOpenDropdown(open ? 'quan' : null)}
          />
          {giayCategory && (
            <CategoryDropdown
              category={giayCategory}
              onSelectCategory={onSelectCategory}
              isOpen={openDropdown === 'giay'}
              onToggle={(open) => setOpenDropdown(open ? 'giay' : null)}
            />
          )}
          {baloCategory && (
            <CategoryDropdown
              category={baloCategory}
              onSelectCategory={onSelectCategory}
              isOpen={openDropdown === 'balo'}
              onToggle={(open) => setOpenDropdown(open ? 'balo' : null)}
            />
          )}
          <button type="button" className="adidas-nav-item flash-sale-nav" onClick={onFlashSaleClick}>FLASH SALE</button>
          {nmActive && (
            <button type="button" className="adidas-nav-item night-market-nav" onClick={() => navigate('/shop/night-market')} style={{ color: '#06b6d4', fontWeight: '900' }}>NIGHT MARKET</button>
          )}
          <button type="button" className="adidas-nav-item sale" onClick={handleShowSaleClick}>SALE</button>
          <button type="button" className="adidas-nav-item lucky-spin" onClick={onLuckySpinClick}>VÒNG QUAY</button>
        </nav>
        <div className="adidas-header-right">
          <div className="adidas-search">
            <input
              type="text"
              placeholder="Tìm kiếm"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchValue.trim()) {
                  trackSearch(searchValue);
                }
              }}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <button className="adidas-icon-btn" title={t("shop.compare_btn_title")} onClick={openCompareModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            {compareCount > 0 && <span className="cart-count">{compareCount}</span>}
          </button>
          <button className="adidas-icon-btn" title="Yêu thích" onClick={onWishlistClick}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {wishlistCount > 0 && <span className="cart-count">{wishlistCount}</span>}
          </button>
          <button className="adidas-icon-btn cart-btn" onClick={onCartClick}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
          {customer ? (
            <UserDropdown
              customer={customer}
              onLogout={onLogoutClick}
              isOpen={openDropdown === 'user'}
              onToggle={(open) => setOpenDropdown(open ? 'user' : null)}
            />
          ) : (
            <button className="adidas-icon-btn" onClick={handleLoginClick} title="Đăng nhập">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
