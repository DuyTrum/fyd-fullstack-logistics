import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "@shared/context/CartContext.jsx";
import { fetchCategories, orderAPI } from "@shared/utils/api.js";
import { getCustomer, logout as customerLogout } from "@shared/utils/customerSession.js";
import ShopHeader from "../components/ShopHeader.jsx";
import ShopFooter from "../components/ShopFooter.jsx";
import CartDrawer from "../components/CartDrawer.jsx";
import "../styles/fyd-shop.css";

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [categories, setCategories] = useState([]);
    const [status, setStatus] = useState("loading"); // loading, confirming, success, failure
    const [orderInfo, setOrderInfo] = useState(null);

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

    // Detect payment provider from URL params
    // VNPAY returns: vnp_ResponseCode, vnp_TxnRef, ...
    // MoMo returns: resultCode, orderId, transId, ...
    const vnp_ResponseCode = searchParams.get("vnp_ResponseCode");
    const vnp_TxnRef = searchParams.get("vnp_TxnRef");
    const momo_ResultCode = searchParams.get("resultCode");
    const momo_OrderId = searchParams.get("orderId");

    const isMoMo = momo_ResultCode !== null;
    const isVNPay = vnp_ResponseCode !== null;
    const provider = isMoMo ? "MoMo" : "VNPay";

    // Determine if payment was successful based on provider
    // VNPAY: "00" = success, MoMo: "0" = success
    const isPaymentSuccess = isMoMo
        ? momo_ResultCode === "0"
        : vnp_ResponseCode === "00";

    // Extract order code
    const orderCode = isMoMo
        ? momo_OrderId
        : (vnp_TxnRef?.includes("_") ? vnp_TxnRef.substring(0, vnp_TxnRef.lastIndexOf("_")) : vnp_TxnRef);

    useEffect(() => {
        const savedCustomer = getCustomer();
        setCustomer(savedCustomer);
        fetchCategories().then(setCategories);

        if (!isPaymentSuccess) {
            setStatus("failure");
            return;
        }

        // Handle Success - Poll for backend update (Idempotency/Race condition)
        let pollCount = 0;
        const MAX_POLLS = 3;
        
        const checkStatus = async () => {
            if (!orderCode) return;
            
            try {
                const order = await orderAPI.getByNumber(orderCode);
                setOrderInfo(order);
                
                if (order.paymentStatus === "PAID") {
                    setStatus("success");
                } else if (pollCount < MAX_POLLS) {
                    pollCount++;
                    setStatus("confirming");
                    setTimeout(checkStatus, 2000); // Wait 2s and try again
                } else {
                    // Still pending after polls, but payment gateway says success
                    // We can still show success but mention it's being processed
                    setStatus("success");
                }
            } catch (err) {
                console.error("Poll error:", err);
                if (pollCount < MAX_POLLS) {
                    pollCount++;
                    setTimeout(checkStatus, 2000);
                } else {
                    setStatus("success"); // Fallback to success if gateway said OK
                }
            }
        };

        checkStatus();
    }, [isPaymentSuccess, orderCode]);

    return (
        <div className="shop-page">
            <ShopHeader
                customer={customer}
                categories={categories}
                cartCount={cartCount}
                onCartClick={() => setCartOpen(true)}
                onLogoutClick={() => { customerLogout(); setCustomer(null); }}
                onShowAll={() => navigate('/shop')}
                onSelectCategory={(id, type) => navigate(`/shop?${type === 'parent' ? 'parentCategory' : 'category'}=${id}`)}
                onShowSale={() => navigate('/shop?sale=true')}
            />

            <main className="payment-callback-page" style={{ padding: '80px 20px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="callback-card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40, background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    {status === "loading" && (
                        <div className="status-loading">
                            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                            <h2>Đang kết nối với cổng thanh toán...</h2>
                        </div>
                    )}

                    {status === "confirming" && (
                        <div className="status-confirming">
                            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                            <h2 style={{ color: '#0f172a', marginBottom: 12 }}>Đang xác nhận thanh toán {provider}...</h2>
                            <p style={{ color: '#64748b' }}>
                                Vui lòng không đóng cửa số này trong giây lát.
                            </p>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="status-success">
                            <div className="icon" style={{ fontSize: 60, color: '#10b981', marginBottom: 20 }}>✅</div>
                            <h2 style={{ color: '#0f172a', marginBottom: 12 }}>Thanh toán thành công!</h2>
                            <p style={{ color: '#64748b', marginBottom: 8 }}>
                                Cảm ơn bạn đã đặt hàng. Đơn hàng <strong>#{orderCode}</strong> của bạn đang được xử lý.
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 30 }}>
                                Thanh toán qua {provider}
                            </p>
                            <div className="actions" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <Link to="/shop" className="btn-secondary" style={{ padding: '12px 24px', borderRadius: 8, textDecoration: 'none', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 600 }}>Tiếp tục mua sắm</Link>
                                {orderInfo && (
                                    <Link to={`/shop/order-success/${orderInfo.id}`} className="btn-primary" style={{ padding: '12px 24px', borderRadius: 8, textDecoration: 'none', background: '#000', color: '#fff', fontWeight: 600 }}>Xem chi tiết</Link>
                                )}
                            </div>
                        </div>
                    )}

                    {status === "failure" && (
                        <div className="status-failure">
                            <div className="icon" style={{ fontSize: 60, color: '#ef4444', marginBottom: 20 }}>❌</div>
                            <h2 style={{ color: '#0f172a', marginBottom: 12 }}>Thanh toán thất bại</h2>
                            <p style={{ color: '#64748b', marginBottom: 8 }}>
                                Giao dịch qua {provider} không thành công hoặc đã bị hủy.
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 30 }}>
                                Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
                            </p>
                            <div className="actions" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <Link to="/shop/cart" className="btn-secondary" style={{ padding: '12px 24px', borderRadius: 8, textDecoration: 'none', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 600 }}>Về giỏ hàng</Link>
                                <Link to="/shop/checkout" className="btn-primary" style={{ padding: '12px 24px', borderRadius: 8, textDecoration: 'none', background: '#000', color: '#fff', fontWeight: 600 }}>Thanh toán lại</Link>
                            </div>
                        </div>
                    )}
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
        </div>
    );
}

