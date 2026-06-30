import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@shared/context/CartContext.jsx";
import { orderAPI, formatVND, formatDate, fetchCategories, shippingAPI } from "@shared/utils/api.js";
import { getCustomer, logout as customerLogout } from "@shared/utils/customerSession.js";
import ShopHeader from "../components/ShopHeader.jsx";
import ShopFooter from "../components/ShopFooter.jsx";
import CartDrawer from "../components/CartDrawer.jsx";
import "../styles/track-order.css";
import "../styles/fyd-shop.css";

// Status timeline configuration
const ORDER_STATUSES = [
    { key: "PENDING", label: "Chờ xác nhận", icon: "📋" },
    { key: "CONFIRMED", label: "Đã xác nhận", icon: "✅" },
    { key: "PROCESSING", label: "Đang chuẩn bị", icon: "📦" },
    { key: "SHIPPING", label: "Đang giao hàng", icon: "🚚" },
    { key: "DELIVERED", label: "Đã giao hàng", icon: "🎉" },
];

const CANCELLED_STATUS = { key: "CANCELLED", label: "Đã hủy", icon: "❌" };

export default function TrackOrder() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [orderCode, setOrderCode] = useState("");
    const [phone, setPhone] = useState("");
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [categories, setCategories] = useState([]);
    const [customer, setCustomer] = useState(null);
    const [trackingLogs, setTrackingLogs] = useState([]);
    const [loadingTracking, setLoadingTracking] = useState(false);

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
    }, []);

    const loadTrackingLogs = async (orderId) => {
        setLoadingTracking(true);
        try {
            const res = await shippingAPI.getTracking(orderId);
            if (res && res.order && res.order.logs) {
                setTrackingLogs(res.order.logs);
            } else {
                setTrackingLogs([]);
            }
        } catch (err) {
            console.error("Failed to load tracking logs:", err);
            setTrackingLogs([]);
        } finally {
            setLoadingTracking(false);
        }
    };

    const handleTrack = async (e) => {
        e.preventDefault();

        if (!orderCode.trim() || !phone.trim()) {
            setError("Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại");
            return;
        }

        setLoading(true);
        setError("");
        setOrder(null);
        setTrackingLogs([]);

        try {
            const result = await orderAPI.track(orderCode.trim(), phone.trim());

            if (result.error) {
                setError(result.error);
            } else {
                setOrder(result);
                if (result.trackingNumber) {
                    loadTrackingLogs(result.id);
                }
            }
        } catch (err) {
            setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const codeParam = queryParams.get("orderCode");
        const phoneParam = queryParams.get("phone");
        if (codeParam && phoneParam) {
            setOrderCode(codeParam.toUpperCase());
            setPhone(phoneParam.replace(/\D/g, ''));
            
            setLoading(true);
            setError("");
            setOrder(null);
            setTrackingLogs([]);

            orderAPI.track(codeParam.trim(), phoneParam.trim())
                .then(result => {
                    if (result.error) {
                        setError(result.error);
                    } else {
                        setOrder(result);
                        if (result.trackingNumber) {
                            shippingAPI.getTracking(result.id)
                                .then(res => {
                                    if (res && res.order && res.order.logs) {
                                        setTrackingLogs(res.order.logs);
                                    }
                                })
                                .catch(err => console.error("Error fetching logs:", err));
                        }
                    }
                })
                .catch(err => {
                    setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, []);

    const getStatusIndex = (status) => {
        if (status === "CANCELLED") return -1;
        return ORDER_STATUSES.findIndex(s => s.key === status);
    };

    const getCurrentStatusLabel = (status) => {
        if (status === "CANCELLED") return CANCELLED_STATUS.label;
        if (status === "PENDING_CANCEL") return "Chờ duyệt hủy";
        const found = ORDER_STATUSES.find(s => s.key === status);
        return found ? found.label : status;
    };

    return (
        <div className="shop-page">
            <ShopHeader
                cartCount={cartCount}
                onCartClick={() => setCartOpen(true)}
                categories={categories}
                customer={customer}
                onLogoutClick={() => { customerLogout(); setCustomer(null); }}
                onSelectCategory={(id, type) => navigate(`/shop?${type === 'parent' ? 'parentCategory' : 'category'}=${id}`)}
                onShowSale={() => navigate('/shop?sale=true')}
                onShowAll={() => navigate('/shop')}
            />

            <div className="track-order-page">
                <div className="track-order-container">
                    {/* Header */}
                    <div className="track-order-header">
                        <div className="track-order-icon">📦</div>
                        <h1>Tra cứu đơn hàng</h1>
                        <p>Nhập mã đơn hàng và số điện thoại để theo dõi trạng thái giao hàng</p>
                    </div>

                    {/* Search Form */}
                    <form className="track-order-form" onSubmit={handleTrack}>
                        <div className="form-group">
                            <label htmlFor="orderCode">Mã đơn hàng</label>
                            <input
                                type="text"
                                id="orderCode"
                                placeholder="VD: FYD-20260204-ABC123"
                                value={orderCode}
                                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Số điện thoại</label>
                            <input
                                type="tel"
                                id="phone"
                                placeholder="0912345678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            className="track-order-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Đang tra cứu...
                                </>
                            ) : (
                                <>
                                    <span>🔍</span>
                                    Tra cứu
                                </>
                            )}
                        </button>
                    </form>

                    {/* Error Message */}
                    {error && (
                        <div className="track-order-error">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Order Result */}
                    {order && (
                        <div className="track-order-result">
                            {/* Order Header */}
                            <div className="order-result-header">
                                <div className="order-code-badge">
                                    <span className="label">Mã đơn hàng</span>
                                    <span className="code">{order.orderCode}</span>
                                </div>
                                <div className={`order-status-badge ${order.status.toLowerCase()}`}>
                                    {getCurrentStatusLabel(order.status)}
                                </div>
                            </div>

                            {/* Status Timeline */}
                            {order.status !== "CANCELLED" && (
                                <div className="status-timeline">
                                    {ORDER_STATUSES.map((status, index) => {
                                        const currentIndex = getStatusIndex(order.status);
                                        const isCompleted = index <= currentIndex;
                                        const isCurrent = index === currentIndex;

                                        return (
                                            <div
                                                key={status.key}
                                                className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                                            >
                                                <div className="timeline-icon">
                                                    {isCompleted ? "✓" : status.icon}
                                                </div>
                                                <div className="timeline-label">{status.label}</div>
                                                {index < ORDER_STATUSES.length - 1 && (
                                                    <div className={`timeline-line ${isCompleted && index < currentIndex ? 'completed' : ''}`}></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Cancelled Status */}
                            {order.status === "CANCELLED" && (
                                <div className="order-cancelled-banner">
                                    <span>❌</span>
                                    Đơn hàng này đã bị hủy
                                </div>
                            )}

                            {/* Order Details */}
                            <div className="order-details-grid">
                                <div className="detail-card">
                                    <h4>📍 Địa chỉ giao hàng</h4>
                                    <p className="customer-name">{order.shippingName}</p>
                                    <p>{order.shippingAddress}</p>
                                    <p>{order.shippingDistrict}, {order.shippingProvince}</p>
                                </div>
                                <div className="detail-card">
                                    <h4>💳 Thanh toán</h4>
                                    <p>Phương thức: <strong>{order.paymentMethod}</strong></p>
                                    <p>Trạng thái: <span className={`payment-status ${order.paymentStatus?.toLowerCase()}`}>
                                        {order.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}
                                    </span></p>
                                    <p className="total-amount">Tổng tiền: <strong>{formatVND(order.totalAmount)}</strong></p>
                                </div>
                                <div className="detail-card">
                                    <h4>📅 Thời gian</h4>
                                    <p>Đặt hàng: {formatDate(order.createdAt)}</p>
                                    {order.confirmedAt && <p>Xác nhận: {formatDate(order.confirmedAt)}</p>}
                                    {order.deliveredAt && <p>Giao hàng: {formatDate(order.deliveredAt)}</p>}
                                </div>
                            </div>

                            {/* GHTK Shipping Timeline */}
                            {order.trackingNumber && (
                                <div className="shipping-timeline-section" style={{
                                    marginTop: '25px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '20px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🚚</span> Hành trình bưu tá GHTK
                                        </h4>
                                        <div style={{ fontSize: '13px' }}>
                                            <span style={{ color: '#64748b' }}>Mã vận đơn: </span>
                                            <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{order.trackingNumber}</strong>
                                        </div>
                                    </div>

                                    {loadingTracking ? (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: '14px' }}>
                                            Đang tải dữ liệu hành trình...
                                        </div>
                                    ) : trackingLogs.length > 0 ? (
                                        <div className="ghtk-client-timeline" style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '20px',
                                            position: 'relative',
                                            paddingLeft: '20px',
                                            borderLeft: '2px dashed #cbd5e1',
                                            margin: '10px 0 10px 10px'
                                        }}>
                                            {trackingLogs.map((log, index) => {
                                                const isLatest = index === 0;
                                                return (
                                                    <div key={index} style={{ position: 'relative' }}>
                                                        {/* Node indicator */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: -26,
                                                            top: 4,
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: '50%',
                                                            background: isLatest ? '#10b981' : '#94a3b8',
                                                            border: isLatest ? '3px solid #fff' : 'none',
                                                            boxShadow: isLatest ? '0 0 0 3px #10b981' : 'none',
                                                            transition: 'all 0.3s ease'
                                                        }} />
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: isLatest ? '#10b981' : '#64748b',
                                                            fontWeight: 600,
                                                            marginBottom: '2px'
                                                        }}>
                                                            {log.time}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '14px',
                                                            color: isLatest ? '#0f766e' : '#334155',
                                                            fontWeight: isLatest ? 600 : 400,
                                                            lineHeight: '1.5'
                                                        }}>
                                                            {log.status}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: '14px' }}>
                                            Chưa có thông tin cập nhật hành trình từ bưu tá.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Order Items */}
                            {order.items && order.items.length > 0 && (
                                <div className="order-items-section">
                                    <h4>🛍️ Sản phẩm ({order.itemCount} sản phẩm)</h4>
                                    <div className="order-items-list">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="order-item">
                                                <div className="item-info">
                                                    <span className="item-name">{item.name}</span>
                                                    {item.variant && <span className="item-variant">{item.variant}</span>}
                                                </div>
                                                <div className="item-qty">x{item.quantity}</div>
                                                <div className="item-price">{formatVND(item.price)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Help Section */}
                            <div className="order-help">
                                <p>Cần hỗ trợ? Liên hệ hotline: <strong>1900 1234</strong> hoặc email: <strong>support@fyd.vn</strong></p>
                            </div>
                        </div>
                    )}

                </div> {/* track-order-container */}
            </div> {/* track-order-page */}

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
}
