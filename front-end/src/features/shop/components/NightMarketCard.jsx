import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Eye, Lock as LockIcon } from 'lucide-react';
import { formatVND as formatCurrency } from '@shared/utils/api';
import { useCart } from '@shared/context/CartContext';
import { useToast } from '@shared/context/ToastContext';
import { useNavigate } from 'react-router-dom';

const NightMarketCard = ({ offer, onReveal }) => {
    const { product, discountPercent, isRevealed } = offer;
    const { addToCart, setCartOpen } = useCart();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const getRarity = (discount) => {
        if (discount >= 50) return { name: 'Huyền thoại', color: '#fbbf24', glow: '#fbbf2466' };
        if (discount >= 30) return { name: 'Sử thi', color: '#a855f7', glow: '#a855f766' };
        return { name: 'Hiếm', color: '#3b82f6', glow: '#3b82f666' };
    };

    const rarity = getRarity(discountPercent);
    const discountedPrice = (product.salePrice || product.basePrice) * (1 - discountPercent / 100);
    const originalPrice = product.salePrice || product.basePrice;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Use the middle variant if exists, or first
        const variant = product.variants?.length > 0 ? product.variants[0] : null;

        if (product.variants?.length > 1) {
            // If many variants, better to go to detail page to choose
            showToast("Vui lòng chọn size và màu sắc trong chi tiết sản phẩm", "info");
            navigate(`/shop/product/${product.id}?offerId=${offer.id}`);
            return;
        }

        addToCart(product, variant, 1, discountedPrice);
        setCartOpen(true);
        showToast("Đã thêm sản phẩm ưu đãi vào giỏ hàng", "success");
    };

    return (
        <div className="nm-card-wrapper">
            <AnimatePresence mode="wait">
                {!isRevealed ? (
                    <motion.div
                        key="unrevealed"
                        initial={{ rotateY: 0 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        className="nm-card"
                        onClick={() => onReveal(offer.id)}
                    >
                        <div className="nm-card-encrypt">
                            {Array(40).fill('01X9A_7F_3E_8B_').join('')}
                        </div>
                        <div className="nm-scanline" />

                        <div className="nm-lock-wrapper">
                            <div className="nm-lock-glow" />
                            <LockIcon size={64} color="rgba(255,255,255,0.15)" strokeWidth={1.5} />
                        </div>

                        <h3 className="nm-card-title">Bí mật</h3>
                        <div className="nm-card-status">Chờ mở khóa</div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="revealed"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="nm-card nm-revealed-card"
                        style={{ '--rarity-color': rarity.color, '--rarity-glow': rarity.glow }}
                    >
                        <div className="nm-rarity-glow" />
                        <div className="nm-tag">{rarity.name}</div>
                        <div className="nm-discount">-{discountPercent}%</div>

                        <div 
                            className="nm-img-wrapper"
                            onClick={() => navigate(`/shop/product/${product.id}?offerId=${offer.id}`)}
                            style={{ cursor: 'pointer', width: '100%' }}
                        >
                            <img
                                src={product.thumbnail || (product.images && product.images[0]?.imageUrl) || 'https://via.placeholder.com/300'}
                                alt={product.name}
                                className="nm-product-img"
                            />
                            <div className="nm-img-overlay" />
                        </div>

                        <div className="nm-card-content">
                            <div>
                                <div className="nm-product-cat">
                                    <div className="nm-cat-dot" />
                                    {product.category?.name || 'Vật phẩm giới hạn'}
                                </div>
                                <h3 
                                    className="nm-product-name line-clamp-2"
                                    onClick={() => navigate(`/shop/product/${product.id}?offerId=${offer.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {product.name}
                                </h3>

                                <div className="nm-price-row">
                                    <div>
                                        <span className="nm-price-label">Giá ưu đãi</span>
                                        <span className="nm-price-curr">{formatCurrency(discountedPrice)}</span>
                                    </div>
                                    <span className="nm-price-old">{formatCurrency(originalPrice)}</span>
                                </div>
                            </div>

                            <div className="nm-actions">
                                <a href={`/shop/product/${product.id}?offerId=${offer.id}`} className="nm-btn-main">
                                    <Eye size={16} />
                                    <span>Xem chi tiết</span>
                                </a>
                                <button className="nm-btn-icon" onClick={handleAddToCart}>
                                    <ShoppingCart size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NightMarketCard;
