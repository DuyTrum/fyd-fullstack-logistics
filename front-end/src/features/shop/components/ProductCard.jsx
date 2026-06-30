import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatVND, getAssetUrl } from "@shared/index.js";
import { useCompare } from "@shared/context/CompareContext";
import { useTranslation } from "react-i18next";

export default function ProductCard({ product, onQuickView, onAddToCart, onToggleWishlist, isWishlisted }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToCompare, compareList, removeFromCompare } = useCompare();
  const [isHovered, setIsHovered] = useState(false);
  
  // Track selected color and image
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const isInCompare = compareList.some(p => p.id === product.id);

  const handleCompareClick = (e) => {
    e.stopPropagation();
    if (isInCompare) {
      removeFromCompare(product.id);
    } else {
      const result = addToCompare(product);
      if (result === "limit") {
        alert(t("shop.compare_limit_reached", "Tối đa 4 sản phẩm"));
      }
    }
  };

  // Get unique colors and sizes from variants
  const uniqueColors = useMemo(() => {
    if (!product.variants) return [];
    const colorMap = new Map();
    product.variants.forEach(v => {
      if (v.colorId && v.color && !colorMap.has(v.colorId)) {
        colorMap.set(v.colorId, { id: v.colorId, name: v.color, hex: v.colorHex });
      }
    });
    return Array.from(colorMap.values()).slice(0, 5);
  }, [product.variants]);

  const uniqueSizes = useMemo(() => {
    if (!product.variants) return [];
    const sizeMap = new Map();
    product.variants.forEach(v => {
      // Only show sizes that are in stock
      if (v.sizeId && v.size && v.stockQuantity > 0) {
        sizeMap.set(v.sizeId, { id: v.sizeId, name: v.size });
      }
    });
    return Array.from(sizeMap.values()).slice(0, 5);
  }, [product.variants]);

  // Determine current active color
  const activeColorId = selectedColorId || (uniqueColors.length > 0 ? uniqueColors[0].id : null);
  const activeColorName = uniqueColors.find(c => c.id === activeColorId)?.name;

  // Filter images by active color name if possible
  const displayImages = useMemo(() => {
    const allImages = product.images || [];
    if (allImages.length === 0) return [];
    
    if (activeColorName) {
      const filtered = allImages.filter(img => 
        img.altText && (
          img.altText.toLowerCase().includes(`màu ${activeColorName.toLowerCase()}`) || 
          img.altText.toLowerCase().includes(activeColorName.toLowerCase())
        )
      );
      if (filtered.length > 0) return filtered;
    }
    return allImages;
  }, [product.images, activeColorName]);

  // Fallback thumbnails
  const currentImage = displayImages[selectedImageIndex]?.imageUrl ? getAssetUrl(displayImages[selectedImageIndex].imageUrl) :
    product.thumbnail ? getAssetUrl(product.thumbnail) :
      'https://via.placeholder.com/400x400?text=No+Image';

  // Get secondary hover image (crossfade)
  const hoverImage = displayImages[selectedImageIndex + 1]?.imageUrl ? getAssetUrl(displayImages[selectedImageIndex + 1].imageUrl) :
    displayImages[0]?.imageUrl ? getAssetUrl(displayImages[0].imageUrl) :
      currentImage;

  // Pricing
  const price = product.salePrice || product.basePrice;
  const hasDiscount = product.salePrice && product.salePrice < product.basePrice;
  const discountPercent = hasDiscount ? Math.round((1 - product.salePrice / product.basePrice) * 100) : 0;
  const isNew = product.isNew;
  const isOutOfStock = product.totalStock !== undefined && product.totalStock !== null && product.totalStock <= 0;

  // Handle Quick Size Add to Cart
  const handleQuickSizeAdd = (e, sizeId) => {
    e.stopPropagation();
    if (!product.variants) return;
    
    // Find variant with the selected size and the active color
    let matchedVariant = product.variants.find(v => v.sizeId === sizeId && v.colorId === activeColorId);
    
    // Fallback if active color + size is out of stock or doesn't exist
    if (!matchedVariant || matchedVariant.stockQuantity <= 0) {
      matchedVariant = product.variants.find(v => v.sizeId === sizeId && v.stockQuantity > 0);
    }
    
    if (matchedVariant && onAddToCart) {
      onAddToCart(product, matchedVariant, 1);
    }
  };

  const handleColorClick = (e, colorId) => {
    e.stopPropagation();
    setSelectedColorId(colorId);
    setSelectedImageIndex(0); // Reset image index on color change
  };

  return (
    <div
      className={`product-card premium-card ${isOutOfStock ? 'out-of-stock' : ''}`}
      data-product-id={product.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/shop/product/${product.id}${activeColorId ? `?color=${activeColorId}` : ''}`)}
    >
      <div className="product-image-wrapper">
        {/* Main image layer */}
        <img
          src={currentImage}
          alt={product.name}
          className="product-image primary-img"
          loading="lazy"
        />

        {/* Hover image layer (Double buffer for crossfade) */}
        {hoverImage !== currentImage && (
          <img
            src={hoverImage}
            alt={`${product.name} Hover`}
            className="product-image hover-img"
            loading="lazy"
          />
        )}

        {/* Badges - Zara Style */}
        {(hasDiscount || isNew || product.isFlashSale) && (
          <div className="product-badges">
            {product.isFlashSale && <span className="badge flash-sale-badge">⚡ FLASH</span>}
            {hasDiscount && <span className="badge sale-badge">-{discountPercent}%</span>}
            {isNew && !hasDiscount && <span className="badge new-badge">NEW</span>}
          </div>
        )}

        {/* Action Button Container */}
        <div className="card-actions-overlay">
          {/* Wishlist */}
          <button
            className={`wishlist-btn-round ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
            title={t("shop.wishlist_btn_title")}
          >
            <svg viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Compare */}
          <button
            className={`compare-btn-round ${isInCompare ? 'active' : ''}`}
            onClick={handleCompareClick}
            title={t("shop.compare_btn_title")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
          </button>
        </div>

        {/* Gymshark-inspired Quick Add Drawer on Hover */}
        {!isOutOfStock && (
          <div className={`quick-add-sizes-drawer ${isHovered ? 'visible' : ''}`}>
            {uniqueSizes.length > 0 ? (
              <>
                <div className="quick-add-label">{t("shop.quick_add", "QUICK ADD")}</div>
                <div className="sizes-chips-container">
                  {uniqueSizes.map(size => (
                    <button
                      key={size.id}
                      className="quick-size-btn"
                      onClick={(e) => handleQuickSizeAdd(e, size.id)}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                className="quick-add-single-btn"
                onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
              >
                {t("shop.view_details", "XEM CHI TIẾT")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="product-info-wrapper">
        <h3 className="product-card-name" title={product.name}>{product.name}</h3>
        
        <p className="product-card-category">
          {product.category || (product.subtitle || 'Nike Sportswear')}
        </p>

        {uniqueColors.length > 0 && (
          <div className="product-card-colors-text">
            {uniqueColors.length} {uniqueColors.length > 1 ? 'màu sắc' : 'màu'}
          </div>
        )}

        <div className="product-card-footer-row">
          <div className="product-card-price">
            {hasDiscount ? (
              <>
                <span className="price-current sale">{formatVND(price)}</span>
                <span className="price-original">{formatVND(product.basePrice)}</span>
              </>
            ) : (
              <span className="price-current">{formatVND(price)}</span>
            )}
          </div>
          
          {product.soldCount > 0 && (
            <span className="product-card-sold">{t("shop.sold_count", "Đã bán")} {product.soldCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}
