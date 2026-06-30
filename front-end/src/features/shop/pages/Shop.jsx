import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/fyd-shop.css";
import "../styles/shop.css";
import "../styles/reveals.css";
import { useToast } from "@shared/context/ToastContext";
import { useCart } from "@shared/context/CartContext";

// Components
import ShopHeader from "../components/ShopHeader.jsx";
import ShopFooter from "../components/ShopFooter.jsx";
import ProductCard from "../components/ProductCard.jsx";
import CartDrawer from "../components/CartDrawer.jsx";
import WishlistDrawer from "../components/WishlistDrawer.jsx";
import HeroBanner from "../components/HeroBanner.jsx";
import QuickViewModal from "../components/QuickViewModal.jsx";
import LoginModal from "../components/LoginModal.jsx";
import LuckySpinModal from "../components/LuckySpinModal.jsx";
import Pagination from "../components/Pagination.jsx";
import SortDropdown from "../components/SortDropdown.jsx";
import FilterSidebar from "../components/FilterSidebar.jsx";
import FeaturedProducts from "../components/FeaturedProducts.jsx";
import AiChatBubble from "../components/AiChatBubble.jsx";
import ShareWishlistModal from "../components/ShareWishlistModal.jsx";
import ProductRecommendations from "../components/ProductRecommendations.jsx";
import FlashSaleHub from "../components/FlashSaleHub.jsx";
import ProductCardSkeleton from "../components/ProductCardSkeleton.jsx";
import TrustBar from "../components/TrustBar.jsx";

import { fetchProducts, fetchCategories, fetchColors, fetchSizes, getAssetUrl, flashSalePublicAPI } from "@shared/utils/api.js";
import { getCustomer, logout as customerLogout } from "@shared/utils/customerSession.js";

const PRODUCTS_PER_PAGE = 12;

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightProductId, setHighlightProductId] = useState(null);

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [activeZones, setActiveZones] = useState([]); // Added for Featured Zones
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cart Context
  const {
    cart,
    cartCount,
    cartTotal,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCartQty,
    removeFromCart
  } = useCart();

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedParentCategory, setSelectedParentCategory] = useState(null);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 5000000]);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(true);

  // UI states
  const [wishlist, setWishlist] = useState([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [luckySpinModalOpen, setLuckySpinModalOpen] = useState(false);
  const [shareWishlistOpen, setShareWishlistOpen] = useState(false);

  // Customer state
  const [customer, setCustomer] = useState(null);
  const { showToast } = useToast();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData, colorsData, sizesData, zonesData, flashSaleData] = await Promise.all([
          fetchProducts(),
          fetchCategories(),
          fetchColors(),
          fetchSizes(),
          import("@shared/utils/api.js").then(m => m.featuredAPI.getActiveZones()), // Fetch zones
          flashSalePublicAPI.getActive().catch(() => null)
        ]);

        let mergedProducts = productsData;
        if (flashSaleData && flashSaleData.status === "RUNNING" && flashSaleData.products?.length > 0) {
          mergedProducts = productsData.map(p => {
            const fsProduct = flashSaleData.products.find(fs => String(fs.id) === String(p.id));
            if (fsProduct) {
              return {
                ...p,
                salePrice: fsProduct.salePrice,
                isFlashSale: true
              };
            }
            return p;
          });
        }

        setProducts(mergedProducts);
        setCategories(categoriesData);
        setColors(colorsData);
        setSizes(sizesData);
        setActiveZones(zonesData || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load customer session
  useEffect(() => {
    const savedCustomer = getCustomer();
    if (savedCustomer) {
      setCustomer(savedCustomer);
    }
  }, []);

  // Load wishlist from localStorage
  useEffect(() => {
    const savedWishlist = localStorage.getItem("fyd-wishlist");
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (e) {
        console.error("Failed to parse wishlist:", e);
      }
    }
  }, []);

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem("fyd-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Exclusion Logic: Remove products that are already in ANY active featured zone
    const featuredProductIds = new Set();
    activeZones.forEach(zone => {
      zone.products?.forEach(item => {
        if (item.productId) featuredProductIds.add(item.productId);
      });
    });

    result = result.filter(p => !featuredProductIds.has(p.id));

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.shortDescription?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => p.categoryId === selectedCategory);
    } else if (selectedParentCategory) {
      const parentCat = categories.find((c) => c.id === selectedParentCategory);
      if (parentCat) {
        const childIds = parentCat.children?.map((c) => c.id) || [];
        result = result.filter(
          (p) => p.categoryId === selectedParentCategory || childIds.includes(p.categoryId)
        );
      }
    }

    // Color filter
    if (selectedColors.length > 0) {
      result = result.filter((p) => {
        if (!p.variants) return false;
        return p.variants.some((v) => selectedColors.includes(v.colorId));
      });
    }

    // Size filter
    if (selectedSizes.length > 0) {
      result = result.filter((p) => {
        if (!p.variants) return false;
        return p.variants.some((v) => selectedSizes.includes(v.sizeId));
      });
    }

    // Price filter
    if (priceRange[0] > 0 || priceRange[1] < 5000000) {
      result = result.filter((p) => {
        const price = p.salePrice || p.basePrice;
        return price >= priceRange[0] && price <= priceRange[1];
      });
    }

    // Sale filter
    if (showSaleOnly) {
      result = result.filter((p) => p.salePrice && p.salePrice < p.basePrice);
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => (a.salePrice || a.basePrice) - (b.salePrice || b.basePrice));
        break;
      case "price-desc":
        result.sort((a, b) => (b.salePrice || b.basePrice) - (a.salePrice || b.basePrice));
        break;
      case "name-asc":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "bestseller":
        result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      case "newest":
      default:
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }

    return result;
  }, [products, search, selectedCategory, selectedParentCategory, selectedColors, selectedSizes, priceRange, showSaleOnly, sortBy, categories]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Scroll Reveal Logic
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          // Once revealed, we can stop observing this element
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [paginatedProducts]); // Re-observe when products change

  // Reset page when filters change
  // Handle URL filters from navigation (e.g., from Product Detail)
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const parentCategoryParam = searchParams.get('parentCategory');
    const saleParam = searchParams.get('sale');
    const searchParam = searchParams.get('search');

    if (categoryParam) {
      setSelectedCategory(parseInt(categoryParam, 10));
      setSelectedParentCategory(null);
      setShowSaleOnly(false);
    } else if (parentCategoryParam) {
      setSelectedParentCategory(parseInt(parentCategoryParam, 10));
      setSelectedCategory(null);
      setShowSaleOnly(false);
    } else if (saleParam === 'true') {
      setShowSaleOnly(true);
      setSelectedCategory(null);
      setSelectedParentCategory(null);
    }

    if (searchParam) {
      setSearch(decodeURIComponent(searchParam));
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedParentCategory, selectedColors, selectedSizes, priceRange, showSaleOnly, sortBy]);

  // Handle highlight URL param from AI chat
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && products.length > 0) {
      const productId = parseInt(highlightId, 10);

      // Find product index in filtered products (with no filters to see all)
      const productIndex = products.findIndex(p => p.id === productId);

      if (productIndex !== -1) {
        // Calculate which page the product is on
        const targetPage = Math.floor(productIndex / PRODUCTS_PER_PAGE) + 1;
        setCurrentPage(targetPage);
        setHighlightProductId(productId);

        // Clear URL param
        setSearchParams({});

        // Scroll and highlight after render
        setTimeout(() => {
          const productElement = document.querySelector(`[data-product-id="${productId}"]`);
          if (productElement) {
            productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            productElement.classList.add('ai-highlight');
            setTimeout(() => {
              productElement.classList.remove('ai-highlight');
              setHighlightProductId(null);
            }, 3000);
          }
        }, 300);
      }
    }
  }, [searchParams, products, setSearchParams]);

  // Filter handlers
  const handleColorToggle = useCallback((colorId) => {
    setSelectedColors((prev) =>
      prev.includes(colorId) ? prev.filter((id) => id !== colorId) : [...prev, colorId]
    );
  }, []);

  const handleSizeToggle = useCallback((sizeId) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId) ? prev.filter((id) => id !== sizeId) : [...prev, sizeId]
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedParentCategory(null);
    setSelectedColors([]);
    setSelectedSizes([]);
    setPriceRange([0, 5000000]);
    setShowSaleOnly(false);
    setSearch("");
  }, []);

  // Cart logic moved to context

  // Wishlist functions
  const toggleWishlist = useCallback((productId) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [...prev, productId];
    });
  }, []);

  const wishlistProducts = useMemo(() => {
    return products.filter((p) => wishlist.includes(p.id));
  }, [products, wishlist]);

  // Category selection
  const handleSelectCategory = useCallback((categoryId, type) => {
    if (type === 'parent') {
      setSelectedParentCategory(categoryId);
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
      setSelectedParentCategory(null);
    }
    setShowSaleOnly(false);
  }, []);

  const handleShowAll = useCallback(() => {
    setSelectedCategory(null);
    setSelectedParentCategory(null);
    setShowSaleOnly(false);
    setSearch("");
  }, []);

  const handleShowSale = useCallback(() => {
    setSelectedCategory(null);
    setSelectedParentCategory(null);
    setShowSaleOnly(true);
  }, []);

  const handleShowFlashSale = useCallback(() => {
    handleShowAll();
    setTimeout(() => {
      document.getElementById('flash-sale-hub')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [handleShowAll]);

  // Customer functions
  const handleLogout = useCallback(() => {
    customerLogout();
    setCustomer(null);
  }, []);

  const handleLoginSuccess = useCallback((customerData) => {
    setCustomer(customerData);
    setLoginModalOpen(false);
  }, []);

  // Checkout
  const handleCheckout = useCallback(() => {
    if (!customer) {
      setCartOpen(false);
      setLoginModalOpen(true);
      return;
    }
    setCartOpen(false);
    navigate("/shop/checkout");
  }, [customer, navigate, setCartOpen]);

  // Get current filter title
  const getFilterTitle = () => {
    if (showSaleOnly) return "SALE";
    if (selectedCategory) {
      const cat = categories.flatMap(c => [c, ...(c.children || [])]).find(c => c.id === selectedCategory);
      return cat?.name?.toUpperCase() || "SẢN PHẨM";
    }
    if (selectedParentCategory) {
      const cat = categories.find(c => c.id === selectedParentCategory);
      return cat?.name?.toUpperCase() || "SẢN PHẨM";
    }
    return "TẤT CẢ SẢN PHẨM";
  };

  return (
    <div className="shop-page">
      {/* Header */}
      <ShopHeader
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        categories={categories}
        onSelectCategory={handleSelectCategory}
        onShowSale={handleShowSale}
        onShowAll={handleShowAll}
        onFlashSaleClick={handleShowFlashSale}
        customer={customer}
        onLoginClick={() => setLoginModalOpen(true)}
        onLogoutClick={handleLogout}
        wishlistCount={wishlist.length}
        onWishlistClick={() => setWishlistOpen(true)}
        onLuckySpinClick={() => setLuckySpinModalOpen(true)}
      />

      {/* Hero Banner with Dynamic Slides - Only render if active zones exist for hero */}
      {activeZones.some(z => z.position === 'home_hero') && (
        <HeroBanner
          products={activeZones.find(z => z.position === 'home_hero')?.products || []}
          onExploreClick={handleShowAll}
          onProductClick={(productInfo) => {
            // Find the full product object from the master list to ensure modal has variants/images
            const fullProduct = products.find(p => p.id === (productInfo.productId || productInfo.id));
            setQuickViewProduct(fullProduct || productInfo);
          }}
        />
      )}

      {/* Trust Bar Section */}
      {!selectedCategory && !selectedParentCategory && !search && (
        <TrustBar />
      )}

      {/* Flash Sale Hub */}
      {!selectedCategory && !selectedParentCategory && !search && (
        <div className="shop-container reveal reveal-stagger-1" id="flash-sale-hub">
          <FlashSaleHub
            onQuickView={(product) => {
              const fullProduct = products.find(p => p.id === (product?.id || product?.productId));
              setQuickViewProduct(fullProduct || product);
            }}
            onToggleWishlist={toggleWishlist}
            wishlist={wishlist}
          />
        </div>
      )}

      {/* Home View Only Zones */}
      {!selectedCategory && !selectedParentCategory && !search && (
        <div className="reveal reveal-stagger-2">
          <FeaturedProducts
            position="home_featured"
            onProductClick={(product) => {
              const fullProduct = products.find(p => p.id === (product?.id || product?.productId));
              setQuickViewProduct(fullProduct || product);
            }}
            wishlist={wishlistProducts}
            onToggleWishlist={(product) => toggleWishlist(product.id)}
          />
        </div>
      )}

      {/* Category View Top Zones */}
      {(selectedCategory || selectedParentCategory) && (
        <FeaturedProducts
          position="category_top"
          onProductClick={(product) => {
            const fullProduct = products.find(p => p.id === (product?.id || product?.productId));
            setQuickViewProduct(fullProduct || product);
          }}
          wishlist={wishlistProducts}
          onToggleWishlist={(product) => toggleWishlist(product.id)}
        />
      )}

      {/* AI Popular Products Recommendations */}
      {!selectedCategory && !selectedParentCategory && !search && (
        <section className="popular-products-section reveal reveal-stagger-3">
          <ProductRecommendations
            type="popular"
            title="SẢN PHẨM PHỔ BIẾN"
            limit={8}
          />
        </section>
      )}

      {/* Products Section */}
      <section className="products-section" id="products-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">{getFilterTitle()}</h2>
            <span className="products-count">{filteredProducts.length} sản phẩm</span>
          </div>
          <div className="filter-sort-bar">
            <button
              className={`filter-toggle-btn ${filterSidebarOpen ? 'active' : ''}`}
              onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              {filterSidebarOpen ? 'ẨN BỘ LỌC' : 'HIỆN BỘ LỌC'}
            </button>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        {/* Products Layout with Sidebar */}
        <div className={`products-layout ${filterSidebarOpen ? 'with-sidebar' : ''}`}>
          {/* Filter Sidebar */}
          {filterSidebarOpen && (
            <FilterSidebar
              categories={categories}
              colors={colors}
              sizes={sizes}
              selectedCategory={selectedCategory}
              selectedParentCategory={selectedParentCategory}
              selectedColors={selectedColors}
              selectedSizes={selectedSizes}
              priceRange={priceRange}
              onCategoryChange={handleSelectCategory}
              onColorToggle={handleColorToggle}
              onSizeToggle={handleSizeToggle}
              onPriceChange={setPriceRange}
              onClearFilters={handleClearFilters}
              showSaleOnly={showSaleOnly}
            />
          )}

          {/* Products Area */}
          <div className="products-area">
            {/* Loading State */}
            {loading && (
              <div className="product-grid">
                {[...Array(8)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <p className="empty-state-text">{error}</p>
              </div>
            )}

            {/* Product Grid */}
            {!loading && !error && (
              <>
                {paginatedProducts.length > 0 ? (
                  <div className="product-grid">
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onQuickView={setQuickViewProduct}
                        onAddToCart={addToCart}
                        onToggleWishlist={toggleWishlist}
                        isWishlisted={wishlist.includes(product.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <p className="empty-state-text">Không tìm thấy sản phẩm nào</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Category View Bottom Zones */}
      {(selectedCategory || selectedParentCategory) && (
        <FeaturedProducts
          position="category_bottom"
          onProductClick={(product) => {
            const fullProduct = products.find(p => p.id === (product?.id || product?.productId));
            setQuickViewProduct(fullProduct || product);
          }}
          wishlist={wishlistProducts}
          onToggleWishlist={(product) => toggleWishlist(product.id)}
        />
      )}

      {/* Home View Bottom Zones */}
      {!selectedCategory && !selectedParentCategory && !search && (
        <FeaturedProducts
          position="home_bottom"
          onProductClick={(product) => {
            const fullProduct = products.find(p => p.id === (product?.id || product?.productId));
            setQuickViewProduct(fullProduct || product);
          }}
          wishlist={wishlistProducts}
          onToggleWishlist={(product) => toggleWishlist(product.id)}
        />
      )}



      {/* Newsletter Section */}
      {!selectedCategory && !selectedParentCategory && !search && (
        <section className="newsletter-section reveal">
          <div className="newsletter-container">
            <h2 className="newsletter-title">ĐĂNG KÝ NHẬN BẢN TIN</h2>
            <p className="newsletter-subtitle">Đăng ký để nhận thông tin về bộ sưu tập mới nhất và ưu đãi độc quyền từ FYD.</p>
            <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); alert("Cảm ơn bạn đã đăng ký nhận bản tin!"); e.target.reset(); }}>
              <input type="email" placeholder="Nhập địa chỉ email của bạn..." required className="newsletter-input" />
              <button type="submit" className="newsletter-submit-btn">ĐĂNG KÝ</button>
            </form>
          </div>
        </section>
      )}

      {/* Footer */}
      <ShopFooter />

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        cart={cart}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateCartQty}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        open={wishlistOpen}
        products={wishlistProducts}
        onClose={() => setWishlistOpen(false)}
        onRemove={toggleWishlist}
        onAddToCart={(product) => {
          setWishlistOpen(false);
          setQuickViewProduct(product);
        }}
        onShare={() => { setWishlistOpen(false); setShareWishlistOpen(true); }}
      />

      {/* Share Wishlist Modal */}
      <ShareWishlistModal
        open={shareWishlistOpen}
        productIds={wishlist}
        onClose={() => setShareWishlistOpen(false)}
      />

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={addToCart}
          onToggleWishlist={toggleWishlist}
          isWishlisted={wishlist.includes(quickViewProduct.id)}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Lucky Spin Modal */}
      <LuckySpinModal
        isOpen={luckySpinModalOpen}
        onClose={() => setLuckySpinModalOpen(false)}
        onLoginRequired={() => setLoginModalOpen(true)}
      />

      {/* AI Chat Bubble */}
      <AiChatBubble />
    </div>
  );
}
