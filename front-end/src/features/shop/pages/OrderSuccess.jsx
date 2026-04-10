import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useToast } from "@shared/context/ToastContext";
import { useCart } from "@shared/context/CartContext";
import ShopHeader from "../components/ShopHeader.jsx";
import ShopFooter from "../components/ShopFooter.jsx";
import CartDrawer from "../components/CartDrawer.jsx";
import LuckySpinModal from "../components/LuckySpinModal.jsx";
import LoginModal from "../components/LoginModal.jsx";
import { getCustomer, logout as customerLogout } from "@shared/utils/customerSession.js";
import { orderAPI, fetchCategories, formatVND, formatDate } from "@shared/utils/api.js";
import "../styles/fyd-shop.css";
import "../styles/checkout.css";

const PAYMENT_LABELS = {
    COD: "Thanh toán khi nhận hàng",
    BANK_TRANSFER: "Chuyển khoản ngân hàng",
    QR_CODE: "Quét mã QR (VietQR)"
};

const BANK_INFO = {
    bankName: "MB Bank",
    bankId: "MB",
    accountNumber: "0856496582",
    accountName: "FYD FASHION CO LTD"
};

export default function OrderSuccess() {
    const { orderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [categories, setCategories] = useState([]);
    const [order, setOrder] = useState(location.state?.order || null);
    const [loading, setLoading] = useState(!location.state?.order);
    const [luckySpinModalOpen, setLuckySpinModalOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const { showToast } = useToast();

    // Cart Context
    const {
        cart,
        cartCount,
        cartTotal,
        cartOpen,
        setCartOpen,
        updateCartQty,
        removeFromCart
    } = useCart();

    useEffect(() => {
        const savedCustomer = getCustomer();
        if (!savedCustomer) {
            navigate("/shop");
            return;
        }
        setCustomer(savedCustomer);
        fetchCategories().then(setCategories);

        // Fetch order if not passed via state
        if (!order && orderId) {
            setLoading(true);
            orderAPI.getById(orderId)
                .then(data => {
                    setOrder(data);
                })
                .catch(err => {
                    console.error("Failed to fetch order:", err);
                })
                .finally(() => setLoading(false));
        }
    }, [orderId, navigate, order]);

    if (loading) {
        return (
            <div className="shop-page">
                <div className="loading-spinner"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="shop-page">
            <ShopHeader
                customer={customer}
                categories={categories}
                cartCount={cartCount}
                onCartClick={() => setCartOpen(true)}
                onLogoutClick={() => { customerLogout(); setCustomer(null); }}
                onShowAll={() => navigate('/shop')}
                onLuckySpinClick={() => setLuckySpinModalOpen(true)}
                onLoginClick={() => setLoginModalOpen(true)}
                onSelectCategory={(id, type) => navigate(`/shop?${type === 'parent' ? 'parentCategory' : 'category'}=${id}`)}
                onShowSale={() => navigate('/shop?sale=true')}
            />

            <main className="checkout-page">
                <div className="order-success-container">
                    <div className="success-icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>

                    <h1 className="success-title">Đặt hàng thành công!</h1>
                    <p className="success-message">
                        Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đã được ghi nhận và sẽ được xử lý trong thời gian sớm nhất.
                    </p>

                    {order && (
                        <div className="order-info-card">
                            <div className="order-header-row">
                                <div className="order-code">
                                    <span className="label">Mã đơn hàng</span>
                                    <span className="value">#{order.orderNumber}</span>
                                </div>
                                <div className="order-status">
                                    <span className={`status-badge pending`}>Chờ xử lý</span>
                                </div>
                            </div>

                            <div className="order-details-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Ngày đặt</span>
                                    <span className="detail-value">{formatDate(order.createdAt)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Phương thức thanh toán</span>
                                    <span className="detail-value">
                                        {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Trạng thái thanh toán</span>
                                    <span className="detail-value payment-pending">
                                        {order.paymentStatus === 'PENDING' ? 'Chưa thanh toán' : 'Đã thanh toán'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Địa chỉ giao hàng</span>
                                    <span className="detail-value">
                                        {order.fullAddress || `${order.shippingAddress}, ${order.shippingWard}, ${order.shippingDistrict}, ${order.shippingProvince}`}
                                    </span>
                                </div>
                            </div>

                            <div className="order-total-row">
                                <span>Tổng thanh toán</span>
                                <span className="total-amount">{formatVND(order.totalAmount)}</span>
                            </div>

                            {order.trackingNumber && (
                                <div className="shipping-info-box" style={{ marginTop: 15, padding: 15, backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#0369a1', fontSize: 16, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                            <path d="m3.3 7 8.7 5 8.7-5" />
                                            <path d="M12 22V12" />
                                        </svg>
                                        Thông tin vận chuyển
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: 13 }}>Đơn vị vận chuyển:</span>
                                            <div style={{ fontWeight: 600 }}>{order.carrier || 'GHTK'}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: 13 }}>Mã vận đơn:</span>
                                            <div style={{ fontWeight: 600, color: '#0369a1' }}>{order.trackingNumber}</div>
                                        </div>
                                    </div>
                                    {order.shippingLabelUrl && (
                                        <div style={{ marginTop: 10 }}>
                                            <a href={order.shippingLabelUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontSize: 13, textDecoration: 'underline' }}>
                                                Xem nhãn vận chuyển (PDF)
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {order.paymentMethod === 'BANK_TRANSFER' && (
                                <div className="payment-reminder bank-transfer-details">
                                    <div className="bank-info-header">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                        <h4>Thông tin chuyển khoản</h4>
                                    </div>
                                    <div className="bank-details-list">
                                        <div className="bank-detail-row">
                                            <span>Ngân hàng:</span>
                                            <strong>{BANK_INFO.bankName}</strong>
                                        </div>
                                        <div className="bank-detail-row">
                                            <span>Số tài khoản:</span>
                                            <strong>{BANK_INFO.accountNumber}</strong>
                                        </div>
                                        <div className="bank-detail-row">
                                            <span>Chủ tài khoản:</span>
                                            <strong>{BANK_INFO.accountName}</strong>
                                        </div>
                                        <div className="bank-detail-row">
                                            <span>Nội dung:</span>
                                            <strong className="copyable">#{order.orderNumber}</strong>
                                        </div>
                                    </div>
                                    <p className="bank-note">Vui lòng nhập đúng nội dung chuyển khoản để đơn hàng được duyệt tự động.</p>
                                </div>
                            )}

                            {order.paymentMethod === 'QR_CODE' && (
                                <div className="payment-reminder qr-payment-details">
                                    <div className="bank-info-header">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                            <circle cx="12" cy="13" r="4"></circle>
                                        </svg>
                                        <h4>Quét mã QR để thanh toán</h4>
                                    </div>
                                    <div className="qr-success-wrapper">
                                        <div className="qr-container">
                                            <img
                                                src={`https://img.vietqr.io/image/${BANK_INFO.bankId}-${BANK_INFO.accountNumber}-compact2.png?amount=${order.totalAmount}&addInfo=${encodeURIComponent(order.orderNumber)}&accountName=${encodeURIComponent(BANK_INFO.accountName)}`}
                                                alt="VietQR Payment"
                                            />
                                        </div>
                                        <div className="qr-instructions">
                                            <p>1. Mở ứng dụng ngân hàng của bạn</p>
                                            <p>2. Chọn tính năng <strong>Quét mã QR</strong></p>
                                            <p>3. Quét mã phía trên để tự động nhập thông tin</p>
                                            <p>4. Xác nhận thanh toán</p>
                                        </div>
                                    </div>
                                    <div className="payment-confirmation-box">
                                        <p>Sau khi thanh toán xong, vui lòng nhấn nút bên dưới để chúng tôi kiểm tra:</p>
                                        <button
                                            className="btn-confirm-payment"
                                            onClick={async () => {
                                                try {
                                                    await orderAPI.confirmPayment(order.id);
                                                    showToast("Đã gửi thông báo thanh toán. Chúng tôi sẽ kiểm tra và cập nhật trạng thái đơn hàng của bạn sớm nhất.");
                                                } catch (err) {
                                                    showToast("Gửi thông báo thất bại. Vui lòng liên hệ hỗ trợ.", "error");
                                                }
                                            }}
                                        >
                                            Xác nhận đã chuyển khoản
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="success-actions">
                        <Link to="/shop/profile" className="btn-secondary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            Xem đơn hàng
                        </Link>
                        <Link to="/shop" className="btn-primary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                </div>
            </main>

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

            <LuckySpinModal
                isOpen={luckySpinModalOpen}
                onClose={() => setLuckySpinModalOpen(false)}
                onLoginRequired={() => setLoginModalOpen(true)}
            />

            <LoginModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={(data) => {
                    setCustomer(data);
                    setLoginModalOpen(false);
                }}
            />
        </div>
    );
}
