import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BASE_URL, getAssetUrl } from "@shared/utils/api.js";
import "./ProductRecommendations.css";

const API_BASE = BASE_URL;

/**
 * ProductRecommendations component - displays AI-powered product suggestions.
 * Supports multiple recommendation types: similar, bought_together, popular, personalized.
 */
export default function ProductRecommendations({
    productId,
    customerId,
    type = "similar", // similar | bought_together | popular | personalized
    title,
    limit = 6,
    onAddToCart
}) {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const displayTitle = title || t("shop.you_may_also_like", "CÓ THỂ BẠN SẼ THÍCH");

    useEffect(() => {
        loadRecommendations();
    }, [productId, customerId, type]);

    async function loadRecommendations() {
        setLoading(true);
        try {
            let endpoint = "";
            switch (type) {
                case "similar":
                    endpoint = `${API_BASE}/api/recommendations/similar/${productId}?limit=${limit}`;
                    break;
                case "bought_together":
                    endpoint = `${API_BASE}/api/recommendations/bought-together/${productId}?limit=${limit}`;
                    break;
                case "popular":
                    endpoint = `${API_BASE}/api/recommendations/popular?limit=${limit}`;
                    break;
                case "personalized":
                    endpoint = `${API_BASE}/api/recommendations/personalized/${customerId}?limit=${limit}`;
                    break;
                case "also_viewed":
                    endpoint = `${API_BASE}/api/recommendations/also-viewed/${productId}?limit=${limit}`;
                    break;
                default:
                    endpoint = `${API_BASE}/api/recommendations/popular?limit=${limit}`;
            }

            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("Failed to fetch recommendations");

            const data = await res.json();
            if (data.success) {
                setProducts(data.products || []);
            } else {
                throw new Error(data.message || "Failed to load recommendations");
            }
            setError(null);
        } catch (err) {
            console.error("Error loading recommendations:", err);
            setError(t("common.error_occurred", "Không thể tải gợi ý sản phẩm"));
        } finally {
            setLoading(false);
        }
    }

    const handleAddBundle = () => {
        if (!onAddToCart || products.length === 0) return;

        let addedCount = 0;
        products.forEach(product => {
            // Find first variant with stock
            const variant = product.variants?.find(v => v.stockQuantity > 0);
            if (variant) {
                onAddToCart(product, variant, 1);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            // Success toast is usually handled by the parent's onAddToCart
        }
    };

    function formatPrice(price) {
        if (!price) return "0₫";
        return new Intl.NumberFormat(t("common.locale_tag"), {
            style: "currency",
            currency: "VND"
        }).format(price);
    }

    if (loading) {
        return (
            <div className="product-recommendations loading">
                <h3 className="rec-title">{displayTitle}</h3>
                <div className="rec-loading">
                    <div className="rec-skeleton-grid">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="rec-skeleton-card">
                                <div className="skeleton-image"></div>
                                <div className="skeleton-text"></div>
                                <div className="skeleton-price"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || products.length === 0) {
        return null; // Don't show section if no recommendations
    }

    return (
        <div className={`product-recommendations-container ${type}`}>
            <div className="rec-header">
                <div className="rec-title-group">
                    <span className="rec-subtitle">{t("shop.recommendations_for_you", "GỢI Ý RIÊNG CHO BẠN")}</span>
                    <h3 className="rec-title">{displayTitle}</h3>
                </div>
                {type === "bought_together" && products.length > 0 && (
                    <button className="add-bundle-btn" onClick={handleAddBundle}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-8.9-5h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01-1.74-.96h-.01L15.75 11H8.53L7.13 8H5.41l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2z" />
                        </svg>
                        {t("shop.add_bundle")}
                    </button>
                )}
            </div>
            <div className="rec-scroll-container">
                <div className="rec-grid">
                    {products.map((product) => (
                        <Link
                            key={product.id}
                            to={`/shop/product/${product.id}`}
                            className="rec-card"
                        >
                            <div className="rec-image-wrapper">
                                <img
                                    src={getAssetUrl(product.image || product.thumbnail)}
                                    alt={product.name}
                                    loading="lazy"
                                />
                                <div className="rec-overlay">
                                    <span className="view-btn">{t("shop.view_detail", "XEM CHI TIẾT")}</span>
                                </div>
                                {product.discountPercent > 0 && (
                                    <span className="rec-badge sale">-{product.discountPercent}%</span>
                                )}
                                {product.isNew && (
                                    <span className="rec-badge new">{t("products.badge_new", "MỚI")}</span>
                                )}
                            </div>
                            <div className="rec-info">
                                <h4 className="rec-name">{product.name}</h4>
                                <div className="rec-price-row">
                                    <span className="rec-price">
                                        {formatPrice(product.salePrice || product.basePrice)}
                                    </span>
                                    {product.salePrice && product.salePrice < product.basePrice && (
                                        <span className="rec-original-price">
                                            {formatPrice(product.basePrice)}
                                        </span>
                                    )}
                                </div>
                                {product.averageRating > 0 && (
                                    <div className="rec-rating">
                                        <div className="rec-stars">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < Math.round(product.averageRating) ? "active" : ""}>★</span>
                                            ))}
                                        </div>
                                        <span className="rec-rating-text">{product.averageRating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
