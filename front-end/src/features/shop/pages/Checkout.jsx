import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@shared/context/ToastContext";
import { useCart } from "@shared/context/CartContext";
import ShopHeader from "../components/ShopHeader.jsx";
import ShopFooter from "../components/ShopFooter.jsx";
import LuckySpinModal from "../components/LuckySpinModal.jsx";
import LoginModal from "../components/LoginModal.jsx";
import { orderAPI, fetchCategories, formatVND, promotionAPI, pointsAPI, luckySpinAPI, getAssetUrl } from "@shared/utils/api.js";
import { getCustomerSession, getCustomer } from "@shared/utils/customerSession.js";
import { trackBeginCheckout, trackPurchase } from "@shared/utils/analytics.js";
import "../styles/fyd-shop.css";
import "../styles/checkout.css";

// Bank info for transfer
const BANK_INFO = {
    bankName: "MBank",
    bankId: "MB",
    accountNumber: "0856496582",
    accountName: "FYD FASHION CO LTD"
};

export default function Checkout() {
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const { cart, cartTotal: subtotal, clearCart } = useCart();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("COD");
    const [showQR, setShowQR] = useState(false);

    const [formData, setFormData] = useState({
        shippingName: "",
        shippingPhone: "",
        shippingProvince: "",
        shippingDistrict: "",
        shippingWard: "",
        shippingAddress: "",
        notes: ""
    });

    const [errors, setErrors] = useState({});

    // Promotion & Points State
    const [promoCode, setPromoCode] = useState("");
    const [promoResult, setPromoResult] = useState(null);
    const [promoLoading, setPromoLoading] = useState(false);

    const [pointsInfo, setPointsInfo] = useState(null);
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [pointsDiscount, setPointsDiscount] = useState(0);
    const [tierDiscount, setTierDiscount] = useState(0);

    // Lucky Spin Coupon State
    const [customerCoupons, setCustomerCoupons] = useState([]);
    const [couponCode, setCouponCode] = useState("");
    const [couponMsg, setCouponMsg] = useState({ text: "", type: "" });
    const [luckySpinModalOpen, setLuckySpinModalOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [couponResult, setCouponResult] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const { showToast } = useToast();

    // Shipping fee
    const SHIPPING_FEE = 30000;

    useEffect(() => {
        const savedCustomer = getCustomer();
        if (!savedCustomer) {
            navigate("/shop");
            return;
        }
        setCustomer(savedCustomer);

        // Pre-fill customer info
        setFormData(prev => ({
            ...prev,
            shippingName: savedCustomer.fullName || "",
            shippingPhone: savedCustomer.phone || ""
        }));

        if (cart.length === 0) {
            navigate("/shop");
        }

        // Load categories for header
        fetchCategories().then(setCategories);
    }, [navigate]);

    // Track begin_checkout when cart and customer are ready
    useEffect(() => {
        if (customer && cart.length > 0) {
            trackBeginCheckout(cart, subtotal);
        }
    }, [customer, cart.length > 0]); // Track when either becomes available

    // Fetch points and tier discount when customer or cart changes
    useEffect(() => {
        if (!customer || cart.length === 0) return;

        const currentSubtotal = subtotal;

        const fetchPointsAndDiscount = async () => {
            try {
                const [pointsData, calcData] = await Promise.all([
                    pointsAPI.getBalance(customer.id),
                    pointsAPI.calculate(customer.id, currentSubtotal)
                ]);
                setPointsInfo(pointsData);
                setTierDiscount(Number(calcData.tierDiscount || 0));

                // Fetch customer's active coupons
                const session = getCustomerSession();
                if (session?.token) {
                    const coupons = await luckySpinAPI.getMyCoupons(session.token, 'active');
                    setCustomerCoupons(Array.isArray(coupons) ? coupons : []);
                }
            } catch (err) {
                console.error("Failed to fetch points/discount/coupons:", err);
            }
        };

        fetchPointsAndDiscount();
    }, [customer, cart]);

    const handleApplyCoupon = async (codeOverride = null) => {
        const codeToApply = codeOverride || couponCode;
        if (!codeToApply.trim()) return;

        setCouponLoading(true);
        try {
            const session = getCustomerSession();
            const result = await luckySpinAPI.validateCoupon(session.token, codeToApply.trim(), subtotal);
            if (result.valid) {
                setCouponResult(result);
                setCouponCode(result.coupon.code);
            } else {
                setCouponResult(null);
                showToast(result.message, "error");
            }
        } catch (err) {
            console.error("Coupon validation error:", err);
            showToast("Lỗi khi kiểm tra mã giảm giá", "error");
        } finally {
            setCouponLoading(false);
        }
    };

    const promoDiscount = promoResult?.discountAmount || 0;
    const couponDiscount = couponResult?.discountAmount || 0;
    const totalDiscount = promoDiscount + couponDiscount + tierDiscount + pointsDiscount;
    const total = Math.max(0, subtotal + SHIPPING_FEE - totalDiscount);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setPromoLoading(true);
        try {
            const result = await promotionAPI.validate(promoCode.trim(), subtotal);
            if (result.valid) {
                setPromoResult(result);
                showToast(result.message);
            } else {
                setPromoResult(null);
                showToast(result.message, "error");
            }
        } catch (err) {
            console.error("Promo error:", err);
            showToast("Lỗi khi kiểm tra mã khuyến mãi", "error");
        } finally {
            setPromoLoading(false);
        }
    };

    const handleTogglePoints = async (e) => {
        const checked = e.target.checked;
        setUsePoints(checked);
        if (checked) {
            try {
                const result = await pointsAPI.calculate(customer.id, subtotal, pointsInfo.points);
                setPointsToUse(result.actualPointsUsed);
                setPointsDiscount(Number(result.pointsDiscount));
            } catch (err) {
                console.error("Points calculation error:", err);
                setUsePoints(false);
            }
        } else {
            setPointsToUse(0);
            setPointsDiscount(0);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.shippingName.trim()) newErrors.shippingName = "Vui lòng nhập họ tên";
        if (!formData.shippingPhone.trim()) newErrors.shippingPhone = "Vui lòng nhập số điện thoại";
        if (!formData.shippingProvince.trim()) newErrors.shippingProvince = "Vui lòng nhập tỉnh/thành phố";
        if (!formData.shippingDistrict.trim()) newErrors.shippingDistrict = "Vui lòng nhập quận/huyện";
        if (!formData.shippingWard.trim()) newErrors.shippingWard = "Vui lòng nhập phường/xã";
        if (!formData.shippingAddress.trim()) newErrors.shippingAddress = "Vui lòng nhập địa chỉ chi tiết";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const orderData = {
                customerId: customer.id,
                shippingName: formData.shippingName,
                shippingPhone: formData.shippingPhone,
                shippingProvince: formData.shippingProvince,
                shippingDistrict: formData.shippingDistrict,
                shippingWard: formData.shippingWard,
                shippingAddress: formData.shippingAddress,
                paymentMethod: paymentMethod,
                notes: formData.notes,
                shippingFee: SHIPPING_FEE,
                promotionCode: promoResult ? promoResult.code : null,
                customerCouponCode: couponResult ? couponResult.coupon.code : null,
                pointsUsed: pointsToUse,
                items: cart.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    productName: item.name,
                    variantInfo: item.variantInfo,
                    quantity: item.qty,
                    unitPrice: item.price
                }))
            };

            const result = await orderAPI.create(orderData);

            // Navigate to success page or redirect to payment URL
            if (result.paymentUrl) {
                // Track purchase event before redirecting for online payment
                trackPurchase(result, cart, total);

                // For online payment, clear cart but keep order info for callback
                clearCart();
                window.location.href = result.paymentUrl;
            } else {
                // Track purchase event for COD/Bank Transfer
                trackPurchase(result, cart, total);

                // Clear cart
                clearCart();
                navigate(`/shop/order-success/${result.id}`, {
                    state: { order: result, paymentMethod }
                });
            }
        } catch (error) {
            console.error("Failed to create order:", error);
            // Show specific error from backend if available
            const errorMsg = error.message || "Đặt hàng thất bại. Vui lòng thử lại.";
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    // Generate VietQR URL
    const getQRCodeUrl = () => {
        const content = `FYD ORDER ${Date.now()}`;
        return `https://img.vietqr.io/image/${BANK_INFO.bankId}-${BANK_INFO.accountNumber}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(BANK_INFO.accountName)}`;
    };

    if (!customer) {
        return <div className="loading-spinner"><div className="spinner"></div></div>;
    }

    return (
        <div className="shop-page">
            <ShopHeader
                customer={customer}
                categories={categories}
                onShowAll={() => navigate('/shop')}
                onLuckySpinClick={() => setLuckySpinModalOpen(true)}
                onLoginClick={() => setLoginModalOpen(true)}
            />

            <main className="checkout-page">
                <div className="checkout-container">
                    <h1 className="checkout-title">THANH TOÁN</h1>

                    <div className="checkout-layout">
                        {/* Left: Shipping Form */}
                        <div className="checkout-form-section">
                            <div className="checkout-card">
                                <h2 className="card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    Thông tin giao hàng
                                </h2>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Họ và tên *</label>
                                        <input
                                            type="text"
                                            name="shippingName"
                                            value={formData.shippingName}
                                            onChange={handleInputChange}
                                            placeholder="Nhập họ và tên"
                                            className={errors.shippingName ? 'error' : ''}
                                        />
                                        {errors.shippingName && <span className="error-text">{errors.shippingName}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Số điện thoại *</label>
                                        <input
                                            type="tel"
                                            name="shippingPhone"
                                            value={formData.shippingPhone}
                                            onChange={handleInputChange}
                                            placeholder="Nhập số điện thoại"
                                            className={errors.shippingPhone ? 'error' : ''}
                                        />
                                        {errors.shippingPhone && <span className="error-text">{errors.shippingPhone}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Tỉnh/Thành phố *</label>
                                        <input
                                            type="text"
                                            name="shippingProvince"
                                            value={formData.shippingProvince}
                                            onChange={handleInputChange}
                                            placeholder="Ví dụ: Hồ Chí Minh"
                                            className={errors.shippingProvince ? 'error' : ''}
                                        />
                                        {errors.shippingProvince && <span className="error-text">{errors.shippingProvince}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Quận/Huyện *</label>
                                        <input
                                            type="text"
                                            name="shippingDistrict"
                                            value={formData.shippingDistrict}
                                            onChange={handleInputChange}
                                            placeholder="Ví dụ: Quận 1"
                                            className={errors.shippingDistrict ? 'error' : ''}
                                        />
                                        {errors.shippingDistrict && <span className="error-text">{errors.shippingDistrict}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Phường/Xã *</label>
                                        <input
                                            type="text"
                                            name="shippingWard"
                                            value={formData.shippingWard}
                                            onChange={handleInputChange}
                                            placeholder="Ví dụ: Phường Bến Nghé"
                                            className={errors.shippingWard ? 'error' : ''}
                                        />
                                        {errors.shippingWard && <span className="error-text">{errors.shippingWard}</span>}
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Địa chỉ chi tiết *</label>
                                        <input
                                            type="text"
                                            name="shippingAddress"
                                            value={formData.shippingAddress}
                                            onChange={handleInputChange}
                                            placeholder="Số nhà, tên đường..."
                                            className={errors.shippingAddress ? 'error' : ''}
                                        />
                                        {errors.shippingAddress && <span className="error-text">{errors.shippingAddress}</span>}
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Ghi chú</label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            placeholder="Ghi chú cho đơn hàng (tùy chọn)"
                                            rows="3"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="checkout-card">
                                <h2 className="card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                    </svg>
                                    Phương thức thanh toán
                                </h2>

                                <div className="payment-methods">
                                    <label className={`payment-option ${paymentMethod === 'COD' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="COD"
                                            checked={paymentMethod === 'COD'}
                                            onChange={(e) => { setPaymentMethod(e.target.value); setShowQR(false); }}
                                        />
                                        <div className="payment-icon cod">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="6" width="20" height="12" rx="2" />
                                                <path d="M12 12h4" />
                                                <circle cx="8" cy="12" r="2" />
                                            </svg>
                                        </div>
                                        <div className="payment-info">
                                            <span className="payment-name">Thanh toán khi nhận hàng (COD)</span>
                                            <span className="payment-desc">Thanh toán bằng tiền mặt khi nhận hàng</span>
                                        </div>
                                    </label>

                                    <label className={`payment-option ${paymentMethod === 'BANK_TRANSFER' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="BANK_TRANSFER"
                                            checked={paymentMethod === 'BANK_TRANSFER'}
                                            onChange={(e) => { setPaymentMethod(e.target.value); setShowQR(false); }}
                                        />
                                        <div className="payment-icon bank">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 21h18" />
                                                <path d="M3 10h18" />
                                                <path d="M5 6l7-3 7 3" />
                                                <path d="M4 10v11" />
                                                <path d="M20 10v11" />
                                                <path d="M8 10v11" />
                                                <path d="M12 10v11" />
                                                <path d="M16 10v11" />
                                            </svg>
                                        </div>
                                        <div className="payment-info">
                                            <span className="payment-name">Chuyển khoản ngân hàng</span>
                                            <span className="payment-desc">Chuyển khoản trực tiếp đến tài khoản ngân hàng</span>
                                        </div>
                                    </label>

                                    <label className={`payment-option ${paymentMethod === 'QR_CODE' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="QR_CODE"
                                            checked={paymentMethod === 'QR_CODE'}
                                            onChange={(e) => { setPaymentMethod(e.target.value); setShowQR(true); }}
                                        />
                                        <div className="payment-icon qr">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="7" height="7" />
                                                <rect x="14" y="3" width="7" height="7" />
                                                <rect x="3" y="14" width="7" height="7" />
                                                <rect x="14" y="14" width="3" height="3" />
                                                <path d="M18 14h3v3" />
                                                <path d="M14 18h3v3" />
                                            </svg>
                                        </div>
                                        <div className="payment-info">
                                            <span className="payment-name">Quét mã QR (VietQR)</span>
                                            <span className="payment-desc">Quét mã QR bằng ứng dụng ngân hàng</span>
                                        </div>
                                    </label>

                                    <label className={`payment-option ${paymentMethod === 'VNPAY' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="VNPAY"
                                            checked={paymentMethod === 'VNPAY'}
                                            onChange={(e) => { setPaymentMethod(e.target.value); setShowQR(false); }}
                                        />
                                        <div className="payment-icon vnpay">
                                            <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-VNPAY-QR-1.png" alt="VNPay" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
                                        </div>
                                        <div className="payment-info">
                                            <span className="payment-name">VNPay</span>
                                            <span className="payment-desc">Thanh toán qua cổng VNPay (Thẻ ATM, QR, Ví...)</span>
                                        </div>
                                    </label>

                                    <label className={`payment-option ${paymentMethod === 'MOMO' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="MOMO"
                                            checked={paymentMethod === 'MOMO'}
                                            onChange={(e) => { setPaymentMethod(e.target.value); setShowQR(false); }}
                                        />
                                        <div className="payment-icon momo">
                                            <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Transparent.png" alt="MoMo" style={{ height: 26, width: 26, borderRadius: 4, objectFit: 'contain' }} />
                                        </div>
                                        <div className="payment-info">
                                            <span className="payment-name">Ví MoMo</span>
                                            <span className="payment-desc">Thanh toán qua ứng dụng MoMo</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Bank Transfer Info */}
                                {paymentMethod === 'BANK_TRANSFER' && (
                                    <div className="bank-info-box">
                                        <h4>Thông tin chuyển khoản</h4>
                                        <div className="bank-details">
                                            <div className="bank-row">
                                                <span>Ngân hàng:</span>
                                                <strong>{BANK_INFO.bankName}</strong>
                                            </div>
                                            <div className="bank-row">
                                                <span>Số tài khoản:</span>
                                                <strong>{BANK_INFO.accountNumber}</strong>
                                            </div>
                                            <div className="bank-row">
                                                <span>Chủ tài khoản:</span>
                                                <strong>{BANK_INFO.accountName}</strong>
                                            </div>
                                            <div className="bank-row">
                                                <span>Số tiền:</span>
                                                <strong className="amount">{formatVND(total)}</strong>
                                            </div>
                                        </div>
                                        <p className="bank-note">
                                            Sau khi chuyển khoản, đơn hàng sẽ được xử lý trong vòng 24h
                                        </p>
                                    </div>
                                )}

                                {/* QR Code */}
                                {paymentMethod === 'QR_CODE' && (
                                    <div className="qr-code-box">
                                        <h4>Quét mã để thanh toán</h4>
                                        <div className="qr-wrapper">
                                            <img
                                                src={getQRCodeUrl()}
                                                alt="VietQR Payment"
                                                className="qr-image"
                                            />
                                        </div>
                                        <p className="qr-note">
                                            Mở ứng dụng ngân hàng và quét mã QR để thanh toán
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Order Summary */}
                        <div className="checkout-summary-section">
                            <div className="checkout-card sticky">
                                <h2 className="card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                        <line x1="3" y1="6" x2="21" y2="6"></line>
                                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                                    </svg>
                                    Đơn hàng của bạn
                                </h2>

                                <div className="order-items">
                                    {cart.map(item => (
                                        <div key={item.itemId} className="order-item">
                                            <div className="item-image">
                                                {item.image ? (
                                                    <img src={getAssetUrl(item.image)} alt={item.name} />
                                                ) : (
                                                    <div className="no-image">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                                            <line x1="12" y1="22.08" x2="12" y2="12" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <span className="item-qty">{item.qty}</span>
                                            </div>
                                            <div className="item-details">
                                                <span className="item-name">{item.name}</span>
                                                {item.variantInfo && (
                                                    <span className="item-variant">{item.variantInfo}</span>
                                                )}
                                            </div>
                                            <span className="item-price">{formatVND(item.price * item.qty)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Promotion Code */}
                                <div className="promo-section">
                                    <h3 className="section-title">Khuyến mãi</h3>
                                    <div className="promo-input-group">
                                        <input
                                            type="text"
                                            placeholder="Nhập mã giảm giá..."
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            disabled={promoResult !== null}
                                        />
                                        {promoResult ? (
                                            <button className="promo-remove-btn" onClick={() => setPromoResult(null)}>Hủy</button>
                                        ) : (
                                            <button className="promo-apply-btn" onClick={handleApplyPromo} disabled={promoLoading || !promoCode}>
                                                {promoLoading ? '...' : 'Áp dụng'}
                                            </button>
                                        )}
                                    </div>
                                    {promoResult && (
                                        <p className="promo-msg success">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Đã áp dụng mã {promoResult.code}
                                        </p>
                                    )}
                                </div>

                                {/* Lucky Spin Coupon Section */}
                                <div className="promo-section customer-coupon-section">
                                    <h3 className="section-title">Voucher may mắn</h3>

                                    {customerCoupons.length > 0 && !couponResult && (
                                        <div className="available-coupons">
                                            <p className="small-label">Voucher trúng thưởng của bạn:</p>
                                            <div className="coupon-scroll-list">
                                                {customerCoupons.map(c => (
                                                    <button
                                                        key={c.id}
                                                        className="mini-coupon-btn"
                                                        onClick={() => handleApplyCoupon(c.code)}
                                                    >
                                                        {c.code}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="promo-input-group">
                                        <input
                                            type="text"
                                            placeholder="Nhập mã voucher..."
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            disabled={couponResult !== null}
                                        />
                                        {couponResult ? (
                                            <button className="promo-remove-btn" onClick={() => { setCouponResult(null); setCouponCode(""); }}>Hủy</button>
                                        ) : (
                                            <button className="promo-apply-btn" onClick={() => handleApplyCoupon()} disabled={couponLoading || !couponCode}>
                                                {couponLoading ? '...' : 'Dùng'}
                                            </button>
                                        )}
                                    </div>
                                    {couponResult && (
                                        <p className="promo-msg success">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            {couponResult.message}
                                        </p>
                                    )}
                                </div>

                                {/* Loyalty Points */}
                                {pointsInfo && pointsInfo.points > 0 && (
                                    <div className="points-section">
                                        <label className="points-toggle">
                                            <input
                                                type="checkbox"
                                                checked={usePoints}
                                                onChange={handleTogglePoints}
                                            />
                                            <span className="toggle-label">
                                                Dùng {pointsInfo.points.toLocaleString()} điểm (giảm {formatVND(pointsInfo.points * 1000)})
                                            </span>
                                        </label>
                                        {usePoints && (
                                            <p className="points-msg">Hệ thống sẽ dùng {pointsToUse.toLocaleString()} điểm cho đơn này.</p>
                                        )}
                                    </div>
                                )}

                                <div className="order-totals">
                                    <div className="total-row">
                                        <span>Tạm tính</span>
                                        <span>{formatVND(subtotal)}</span>
                                    </div>
                                    <div className="total-row">
                                        <span>Phí vận chuyển</span>
                                        <span>{formatVND(SHIPPING_FEE)}</span>
                                    </div>

                                    {tierDiscount > 0 && (
                                        <div className="total-row discount">
                                            <span>Giảm giá thành viên ({pointsInfo?.tier?.name})</span>
                                            <span>-{formatVND(tierDiscount)}</span>
                                        </div>
                                    )}

                                    {promoDiscount > 0 && (
                                        <div className="total-row discount">
                                            <span>Mã giảm giá ({promoResult?.code})</span>
                                            <span>-{formatVND(promoDiscount)}</span>
                                        </div>
                                    )}

                                    {couponDiscount > 0 && (
                                        <div className="total-row discount">
                                            <span>Voucher may mắn ({couponResult?.coupon?.code})</span>
                                            <span>-{formatVND(couponDiscount)}</span>
                                        </div>
                                    )}

                                    {pointsDiscount > 0 && (
                                        <div className="total-row discount">
                                            <span>Dùng điểm thưởng</span>
                                            <span>-{formatVND(pointsDiscount)}</span>
                                        </div>
                                    )}

                                    <div className="total-row grand-total">
                                        <span>Tổng cộng</span>
                                        <span>{formatVND(total)}</span>
                                    </div>

                                    <div className="points-preview">
                                        <span>+ Nhận {Math.floor(total / 10000).toLocaleString()} điểm sau khi hoàn tất</span>
                                    </div>
                                </div>

                                <button
                                    className="place-order-btn"
                                    onClick={handlePlaceOrder}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-small"></span>
                                            ĐANG XỬ LÝ...
                                        </>
                                    ) : (
                                        <>ĐẶT HÀNG</>
                                    )}
                                </button>

                                <p className="order-note">
                                    Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng của FYD
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

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
