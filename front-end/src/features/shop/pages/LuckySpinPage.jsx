import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@shared/context/ToastContext";
import { luckySpinAPI } from '@shared/utils/api';
import { getCustomerSession } from '@shared/utils/customerSession';
import { useCart } from "@shared/context/CartContext";
import { fetchCategories } from "@shared/utils/api.js";
import { getCustomer, logout as customerLogout } from "@shared/utils/customerSession.js";
import ShopHeader from "../components/ShopHeader.jsx";
import ShopFooter from "../components/ShopFooter.jsx";
import CartDrawer from "../components/CartDrawer.jsx";
import '../styles/LuckySpin.css';
import '../styles/fyd-shop.css';

/**
 * Lucky Spin Page - Vòng quay may mắn
 * Premium wheel spin with tier-based probability
 */
const LuckySpinPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [spinInfo, setSpinInfo] = useState(null);
    const [result, setResult] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const wheelRef = useRef(null);
    const { showToast } = useToast();
    const [categories, setCategories] = useState([]);
    const [customer, setCustomer] = useState(null);

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

    const session = getCustomerSession();
    const isLoggedIn = session && session.token;

    // Fetch spin info on mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const cats = await fetchCategories();
                setCategories(cats || []);
                setCustomer(getCustomer());
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        };

        loadInitialData();

        if (isLoggedIn) {
            fetchSpinInfo();
            fetchCoupons();
        } else {
            setLoading(false);
        }
    }, [isLoggedIn]);

    const fetchSpinInfo = async () => {
        try {
            const data = await luckySpinAPI.getInfo(session.token);
            setSpinInfo(data);
        } catch (error) {
            console.error('Failed to fetch spin info:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoupons = async () => {
        try {
            const data = await luckySpinAPI.getMyCoupons(session.token, 'all');
            setCoupons(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
        }
    };

    const handleSpin = async (usePoints = false) => {
        if (spinning) return;

        setSpinning(true);
        setResult(null);

        try {
            const data = usePoints
                ? await luckySpinAPI.exchangePoints(session.token)
                : await luckySpinAPI.play(session.token);

            if (data.success) {
                // Calculate rotation based on reward index
                const segmentCount = spinInfo.rewards.length;
                const segmentAngle = 360 / segmentCount;
                const targetAngle = 360 - (data.rewardIndex * segmentAngle) - (segmentAngle / 2);
                const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
                const newRotation = rotation + (spins * 360) + targetAngle - (rotation % 360);

                setRotation(newRotation);

                // Wait for spin animation to complete
                setTimeout(() => {
                    setResult(data);
                    setSpinning(false);
                    // Update spin status
                    if (data.spinStatus) {
                        setSpinInfo(prev => ({
                            ...prev,
                            spinStatus: data.spinStatus
                        }));
                    }
                    // Refresh coupons if won
                    if (data.coupon) {
                        fetchCoupons();
                    }
                }, 5000);
            } else {
                showToast(data.message || 'Không thể quay vòng quay', "error");
                setSpinning(false);
            }
        } catch (error) {
            console.error('Spin failed:', error);
            showToast('Đã xảy ra lỗi. Vui lòng thử lại.', "error");
            setSpinning(false);
        }
    };

    const closeResult = () => {
        setResult(null);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Render login prompt if not logged in
    if (!isLoggedIn) {
        return (
            <div className="shop-page">
                <ShopHeader
                    cartCount={cartCount}
                    onCartClick={() => setCartOpen(true)}
                    categories={categories}
                    customer={customer}
                />
                <div className="lucky-spin-page">
                    <div className="login-prompt">
                        <h2 className="prompt-title">VÒNG QUAY MAY MẮN</h2>
                        <p className="prompt-text">VUI LÒNG ĐĂNG NHẬP ĐỂ THAM GIA VÀ NHẬN ƯU ĐÃI ĐỘC QUYỀN</p>
                        <button className="adidas-btn-black" onClick={() => navigate('/admin/login')}>
                            ĐĂNG NHẬP NGAY
                        </button>
                    </div>
                </div>
                <ShopFooter />
            </div>
        );
    }

    // Render loading state
    if (loading) {
        return (
            <div className="shop-page">
                <ShopHeader
                    cartCount={cartCount}
                    onCartClick={() => setCartOpen(true)}
                    categories={categories}
                    customer={customer}
                />
                <div className="lucky-spin-page">
                    <div className="loading-container">
                        <div className="adidas-spinner"></div>
                        <p className="loading-text">ĐANG TẢI VÒNG QUAY...</p>
                    </div>
                </div>
                <ShopFooter />
            </div>
        );
    }

    // Render no program message
    if (!spinInfo || !spinInfo.hasActiveProgram) {
        return (
            <div className="shop-page">
                <ShopHeader
                    cartCount={cartCount}
                    onCartClick={() => setCartOpen(true)}
                    categories={categories}
                    customer={customer}
                />
                <div className="lucky-spin-page">
                    <div className="no-program">
                        <h2 className="prompt-title">VÒNG QUAY MAY MẮN</h2>
                        <p className="prompt-text">HIỆN KHÔNG CÓ CHƯƠNG TRÌNH NÀO ĐANG DIỄN RA. HẸN GẶP LẠI BẠN SAU!</p>
                    </div>
                </div>
                <ShopFooter />
            </div>
        );
    }

    const { program, rewards, spinStatus } = spinInfo;
    const canSpinFree = spinStatus.remainingFreeSpins > 0;
    const canExchange = spinStatus.canExchangePoints;

    return (
        <div className="shop-page">
            <ShopHeader
                cartCount={cartCount}
                onCartClick={() => setCartOpen(true)}
                categories={categories}
                customer={customer}
                onLogoutClick={() => { customerLogout(); setCustomer(null); navigate('/shop'); }}
                onSelectCategory={(id, type) => navigate(`/shop?${type === 'parent' ? 'parentCategory' : 'category'}=${id}`)}
                onShowSale={() => navigate('/shop?sale=true')}
                onShowAll={() => navigate('/shop')}
            />

            <div className="lucky-spin-page">
                {/* Header Area */}
                <div className="lucky-spin-hero">
                    <div className="lucky-spin-hero-content">
                        <span className="hero-badge">SỰ KIỆN ĐỘC QUYỀN</span>
                        <h1 className="lucky-spin-main-title">{program.name}</h1>
                        <p className="lucky-spin-description">{program.description}</p>
                    </div>
                </div>

                <div className="lucky-spin-layout">
                    {/* Spin Wheel Section */}
                    <div className="wheel-section">
                        <div className="wheel-outer-ring">
                            {/* Pointer */}
                            <div className="wheel-pointer-new"></div>

                            {/* Wheel */}
                            <div
                                ref={wheelRef}
                                className={`modern-wheel ${spinning ? 'is-spinning' : ''}`}
                                style={{
                                    transform: `rotate(${rotation}deg)`,
                                    background: createWheelGradient(rewards)
                                }}
                            >
                                {rewards.map((reward, index) => {
                                    const angle = (360 / rewards.length) * index;
                                    return (
                                        <div
                                            key={reward.id}
                                            className="modern-segment"
                                            style={{
                                                transform: `rotate(${angle}deg)`
                                            }}
                                        >
                                            <div className="segment-value">
                                                {reward.name.toUpperCase()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Center Hub */}
                            <div className="wheel-hub">
                                <button
                                    className="spin-trigger"
                                    onClick={() => handleSpin(false)}
                                    disabled={spinning || !canSpinFree}
                                >
                                    {spinning ? '...' : 'QUAY'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Info & Stats Section */}
                    <div className="stats-section">
                        <div className="stats-card">
                            <h3 className="stats-card-title">THÔNG TIN LƯỢT QUAY</h3>

                            <div className="stat-row">
                                <span className="stat-label">MIỄN PHÍ HÔM NAY</span>
                                <span className={`stat-value ${canSpinFree ? 'success' : ''}`}>
                                    {spinStatus.remainingFreeSpins} / {program.dailyFreeSpins}
                                </span>
                            </div>

                            <div className="stat-row">
                                <span className="stat-label">ĐIỂM HIỆN CÓ</span>
                                <span className="stat-value gold">{spinStatus.customerPoints} Điểm</span>
                            </div>

                            <div className="stat-row">
                                <span className="stat-label">ĐỔI LƯỢT QUAY</span>
                                <span className="stat-value">{spinStatus.pointsPerSpin} Điểm</span>
                            </div>

                            <div className="stats-actions">
                                <button
                                    className="adidas-btn-outline"
                                    onClick={() => handleSpin(true)}
                                    disabled={spinning || !canExchange}
                                >
                                    {spinning ? 'ĐANG XỬ LÝ...' : `ĐỔI ${spinStatus.pointsPerSpin} Điểm + QUAY`}
                                </button>
                                {!canSpinFree && !canExchange && (
                                    <p className="insufficient-msg">BẠN KHÔNG ĐỦ ĐIỂM ĐỂ ĐỔI LƯỢT QUAY</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coupons Section */}
                {coupons.length > 0 && (
                    <div className="my-rewards-section">
                        <div className="section-divider">
                            <span className="divider-line"></span>
                            <h2 className="section-title-alt">PHẦN THƯỞNG CỦA TÔI</h2>
                            <span className="divider-line"></span>
                        </div>

                        <div className="modern-coupons-grid">
                            {coupons.map(coupon => (
                                <div key={coupon.id} className={`modern-coupon ${coupon.status.toLowerCase()}`}>
                                    <div className="coupon-left">
                                        <span className="coupon-type">VOUCHER</span>
                                        <div className="coupon-amount">
                                            {coupon.discountType === 'PERCENT' ? coupon.discountValue : coupon.discountValue / 1000}
                                            <span className="unit">{coupon.discountType === 'PERCENT' ? '%' : 'K'}</span>
                                        </div>
                                    </div>
                                    <div className="coupon-right">
                                        <div className="coupon-status-tag">{coupon.status}</div>
                                        <div className="coupon-code-box">{coupon.code}</div>
                                        <div className="coupon-info">
                                            {coupon.description}
                                        </div>
                                        <div className="coupon-date">
                                            {coupon.status === 'ACTIVE'
                                                ? `EXP: ${formatDate(coupon.expiredAt)}`
                                                : coupon.status === 'USED'
                                                    ? `USED ON: ${formatDate(coupon.usedAt)}`
                                                    : 'EXPIRED'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Premium Result Modal */}
                {result && (
                    <div className="modern-modal-overlay" onClick={closeResult}>
                        <div className={`modern-modal ${result.coupon ? 'is-winner' : 'is-loser'}`}
                            onClick={e => e.stopPropagation()}>

                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {result.coupon ? 'CHÚC MỪNG CHIẾN THẮNG' : 'TIẾC QUÁ'}
                                </h2>
                            </div>

                            <div className="modal-body">
                                <div className="reward-display">
                                    <span className="reward-label">BẠN ĐÃ NHẬN ĐƯỢC</span>
                                    <div className="reward-name">{result.reward?.name.toUpperCase()}</div>
                                </div>

                                {result.coupon && (
                                    <div className="coupon-reveal">
                                        <div className="reveal-label">MÃ GIẢM GIÁ CỦA BẠN</div>
                                        <div className="reveal-code">{result.coupon.code}</div>
                                        <p className="reveal-hint">SỬ DỤNG KHI THANH TOÁN ĐỂ ĐƯỢC GIẢM GIÁ</p>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button className="adidas-btn-black" onClick={closeResult}>
                                    TIẾP TỤC QUAY
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <CartDrawer
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                cart={cart}
                total={cartTotal}
                onUpdateQty={updateCartQty}
                onRemove={removeFromCart}
                onCheckout={() => {
                    setCartOpen(false);
                    navigate('/shop/checkout');
                }}
            />

            <ShopFooter />
        </div>
    );
};

/**
 * Create conic gradient for wheel background (Modern B&W version)
 */
function createWheelGradient(rewards) {
    if (!rewards || rewards.length === 0) return '#000';

    const segmentAngle = 360 / rewards.length;
    const gradientParts = rewards.map((reward, index) => {
        const startAngle = index * segmentAngle;
        const endAngle = (index + 1) * segmentAngle;
        // Alternating black and white, with gold for the highest reward if possible
        let color = index % 2 === 0 ? '#000000' : '#ffffff';

        // If it's a "NO_REWARD" type, maybe make it unique or just keep alternating
        if (reward.rewardType === 'NO_REWARD') {
            color = '#f5f5f5'; // light gray
        } else if (reward.rewardValue >= 100000 || reward.rewardValue >= 15) {
            // High rewards get gold treatment
            color = '#FFD700';
        }

        return `${color} ${startAngle}deg ${endAngle}deg`;
    });

    return `conic-gradient(${gradientParts.join(', ')})`;
}

export default LuckySpinPage;
