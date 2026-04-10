import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@shared/context/CartContext";
import ShopHeader from "../components/ShopHeader.jsx";
import ShopFooter from "../components/ShopFooter.jsx";
import CartDrawer from "../components/CartDrawer.jsx";
import LuckySpinModal from "../components/LuckySpinModal.jsx";
import LoginModal from "../components/LoginModal.jsx";
import { getCustomer, logout as customerLogout, updateCustomer } from "@shared/utils/customerSession.js";
import { customerAPI, orderAPI, fetchCategories, formatVND, formatDate, ORDER_STATUS, pointsAPI } from "@shared/utils/api.js";
import "../styles/fyd-shop.css";
import "../styles/customer-profile.css";

export default function CustomerProfile() {
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState("overview"); // overview, edit, orders
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelOrderId, setCancelOrderId] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [tiers, setTiers] = useState([]);
    const [luckySpinModalOpen, setLuckySpinModalOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        gender: "",
        avatarUrl: ""
    });

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

    // Load customer data
    useEffect(() => {
        const currentCustomer = getCustomer();
        if (!currentCustomer) {
            navigate("/shop");
            return;
        }

        const fetchFullCustomer = async () => {
            try {
                const data = await customerAPI.getById(currentCustomer.id);
                setCustomer(data);
                setFormData({
                    fullName: data.fullName || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    gender: data.gender || "",
                    avatarUrl: data.avatarUrl || ""
                });

                // Fetch orders and tiers
                const [ordersData, categoriesData, tiersData] = await Promise.all([
                    orderAPI.getByCustomer(currentCustomer.id),
                    fetchCategories(),
                    pointsAPI.getTiers()
                ]);
                setOrders(ordersData.orders || []);
                setCategories(categoriesData || []);
                setTiers(tiersData || []);
            } catch (error) {
                console.error("Failed to fetch customer data:", error);
                setMessage({ text: "Không thể tải thông tin. Vui lòng thử lại.", type: "error" });
                // Set default customer data to prevent crash
                setCustomer({
                    id: currentCustomer.id,
                    fullName: currentCustomer.fullName || "Khách hàng",
                    email: currentCustomer.email || "",
                    phone: currentCustomer.phone || "",
                    gender: "",
                    avatarUrl: ""
                });
            } finally {
                setLoading(false);
            }
        };

        fetchFullCustomer();
    }, [navigate]);

    const handleLogout = () => {
        customerLogout();
        navigate("/shop");
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: "", type: "" });

        try {
            const updated = await customerAPI.update(customer.id, formData);
            setCustomer(updated);
            updateCustomer(updated);
            setMessage({ text: "Cập nhật thông tin thành công!", type: "success" });
        } catch (error) {
            console.error("Update profile error:", error);
            setMessage({ text: error.message || "Cập nhật thất bại. Vui lòng thử lại.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleViewOrderDetail = async (orderId) => {
        setModalLoading(true);
        setShowOrderModal(true);
        try {
            const fullOrder = await orderAPI.getById(orderId);
            setSelectedOrder(fullOrder);
        } catch (error) {
            console.error("Failed to fetch order details:", error);
            // Fallback to minimal data if fetch fails
            const miniOrder = orders.find(o => o.id === orderId);
            setSelectedOrder(miniOrder);
        } finally {
            setModalLoading(false);
        }
    };

    // Orders that cannot be deleted
    const NON_DELETABLE_STATUS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING'];

    const canDeleteOrder = (order) => {
        return !NON_DELETABLE_STATUS.includes(order.status);
    };

    const handleDeleteOrder = async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order && !canDeleteOrder(order)) {
            setMessage({ text: "Không thể xóa đơn hàng đang xử lý hoặc giao hàng!", type: "error" });
            return;
        }

        if (!window.confirm("Bạn có chắc muốn xóa đơn hàng này?")) {
            return;
        }

        try {
            await orderAPI.delete(orderId);
            setOrders(prev => prev.filter(o => o.id !== orderId));
            setMessage({ text: "Đã xóa đơn hàng thành công!", type: "success" });
        } catch (error) {
            console.error("Failed to delete order:", error);
            setMessage({ text: "Không thể xóa đơn hàng. Vui lòng thử lại.", type: "error" });
        }
    };

    const openCancelModal = (orderId) => {
        setCancelOrderId(orderId);
        setCancelReason("");
        setShowCancelModal(true);
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
        setCancelOrderId(null);
        setCancelReason("");
    };

    const handleCancelRequest = async () => {
        if (!cancelReason.trim()) {
            setMessage({ text: "Vui lòng chọn lý do hủy đơn hàng!", type: "error" });
            return;
        }

        try {
            await orderAPI.requestCancel(cancelOrderId, cancelReason);
            setOrders(prev => prev.map(o =>
                o.id === cancelOrderId ? { ...o, status: "PENDING_CANCEL", cancelReason } : o
            ));
            setMessage({ text: "Đã gửi yêu cầu hủy đơn hàng. Vui lòng đợi admin duyệt.", type: "success" });
            closeCancelModal();
        } catch (error) {
            console.error("Failed to cancel order:", error);
            setMessage({ text: error.message || "Không thể hủy đơn hàng. Vui lòng thử lại.", type: "error" });
        }
    };

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
                onLogoutClick={handleLogout}
                onShowAll={() => navigate('/shop')}
                onLuckySpinClick={() => setLuckySpinModalOpen(true)}
                onSelectCategory={(id, type) => navigate(`/shop?${type === 'parent' ? 'parentCategory' : 'category'}=${id}`)}
                onShowSale={() => navigate('/shop?sale=true')}
            />

            <main className="profile-page">
                <div className="profile-container">
                    {/* Sidebar */}
                    <aside className="profile-sidebar">
                        <div className="profile-user-info">
                            <div className="profile-avatar-large">
                                {customer.avatarUrl ? (
                                    <img src={customer.avatarUrl} alt={customer.fullName} />
                                ) : (
                                    customer.fullName?.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <h2 className="profile-name-heading">{customer.fullName}</h2>
                            <span className="profile-tier-badge">{typeof customer.tier === 'object' ? customer.tier?.name : customer.tier || "MEMBER"}</span>
                        </div>

                        <nav className="profile-nav">
                            <button
                                className={`profile-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                <div className="nav-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="14" width="7" height="7"></rect>
                                        <rect x="3" y="14" width="7" height="7"></rect>
                                    </svg>
                                </div>
                                <span>Tổng quan</span>
                            </button>
                            <button
                                className={`profile-nav-item ${activeTab === 'edit' ? 'active' : ''}`}
                                onClick={() => setActiveTab('edit')}
                            >
                                <div className="nav-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                </div>
                                <span>Sửa hồ sơ</span>
                            </button>
                            <button
                                className={`profile-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                                onClick={() => setActiveTab('orders')}
                            >
                                <div className="nav-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                        <line x1="3" y1="6" x2="21" y2="6"></line>
                                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                                    </svg>
                                </div>
                                <span>Lịch sử đơn hàng</span>
                            </button>
                        </nav>
                    </aside>

                    {/* Content */}
                    <div className="profile-content">
                        {activeTab === 'overview' && (
                            <div className="tab-pane">
                                <div className="profile-section-header">
                                    <h1 className="profile-section-title">Chào mừng trở lại, {customer.fullName}!</h1>
                                </div>

                                <div className="profile-stats">
                                    <div className="stat-card">
                                        <span className="stat-value">{orders.length}</span>
                                        <span className="stat-label">Đơn hàng</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">{formatVND(customer.points || 0)}</span>
                                        <span className="stat-label">Điểm thưởng</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">{typeof customer.tier === 'object' ? customer.tier?.name : customer.tier || "Member"}</span>
                                        <span className="stat-label">Hạng thẻ</span>
                                    </div>
                                </div>

                                {/* Tier Progress */}
                                {(() => {
                                    const nextTier = tiers.find(t => t.minPoints > (customer.totalPoints || 0));
                                    const currentTier = customer.tier;
                                    const totalPoints = customer.totalPoints || 0;

                                    if (!nextTier) return null;

                                    const progress = Math.min(100, Math.round((totalPoints / nextTier.minPoints) * 100));

                                    return (
                                        <div className="tier-progress-section">
                                            <div className="tier-progress-header">
                                                <span>Tiến trình lên hạng <strong>{nextTier.name}</strong></span>
                                                <span>{totalPoints.toLocaleString()} / {nextTier.minPoints.toLocaleString()} điểm</span>
                                            </div>
                                            <div className="tier-progress-bar">
                                                <div className="tier-progress-fill" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <p className="tier-hint">
                                                Bạn cần thêm <strong>{(nextTier.minPoints - totalPoints).toLocaleString()}</strong> điểm để thăng hạng.
                                            </p>
                                            {currentTier && (
                                                <div className="tier-benefits-preview">
                                                    <strong>Quyền lợi hạng {currentTier.name}:</strong>
                                                    <p>{currentTier.benefits || "Giảm giá trực tiếp trên mỗi đơn hàng."}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="recent-activity">
                                    <div className="section-title-row">
                                        <h3 className="section-subtitle">Hoạt động gần đây</h3>
                                        <button className="btn-link" onClick={() => setActiveTab('orders')}>Xem tất cả</button>
                                    </div>

                                    {orders.length > 0 ? (
                                        <div className="recent-orders-grid">
                                            {orders.slice(0, 2).map(order => (
                                                <div key={order.id} className="mini-order-card">
                                                    <div className="mini-order-header">
                                                        <span className="mini-order-code">#{order.orderNumber || order.orderCode}</span>
                                                        <span className={`mini-status-dot ${order.status?.toLowerCase()}`}></span>
                                                    </div>
                                                    <div className="mini-order-body">
                                                        <span className="mini-order-date">{formatDate(order.createdAt)}</span>
                                                        <span className="mini-order-total">{formatVND(order.totalAmount)}</span>
                                                    </div>
                                                    <button
                                                        className="btn-mini-detail"
                                                        onClick={() => handleViewOrderDetail(order.id)}
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-substate">
                                            <p>Bạn chưa có đơn hàng nào gần đây.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'edit' && (
                            <div className="tab-pane">
                                <div className="profile-section-header">
                                    <h1 className="profile-section-title">Thông tin tài khoản</h1>
                                </div>

                                {message.text && (
                                    <div className={`feedback-msg ${message.type}`}>
                                        {message.text}
                                    </div>
                                )}

                                <form className="profile-edit-form" onSubmit={handleUpdateProfile}>
                                    {/* Personal Info Card */}
                                    <div className="edit-card">
                                        <h3 className="edit-card-title">Thông tin cá nhân</h3>
                                        <div className="edit-card-grid">
                                            <div className="edit-field">
                                                <label>Họ và tên</label>
                                                <input
                                                    type="text"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                            <div className="edit-field">
                                                <label>Email</label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    disabled
                                                />
                                            </div>
                                            <div className="edit-field">
                                                <label>Số điện thoại</label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    placeholder="Nhập số điện thoại"
                                                />
                                            </div>
                                            <div className="edit-field">
                                                <label>Giới tính</label>
                                                <select
                                                    name="gender"
                                                    value={formData.gender}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="">Chọn giới tính</option>
                                                    <option value="MALE">Nam</option>
                                                    <option value="FEMALE">Nữ</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Avatar Card */}
                                    <div className="edit-card">
                                        <h3 className="edit-card-title">Ảnh đại diện</h3>
                                        <div className="avatar-edit-section">
                                            <div className="avatar-preview">
                                                {formData.avatarUrl ? (
                                                    <img src={formData.avatarUrl} alt="Avatar Preview" />
                                                ) : (
                                                    <div className="avatar-placeholder-large">
                                                        {formData.fullName ? formData.fullName.substring(0, 2).toUpperCase() : "??"}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="avatar-actions">
                                                <input
                                                    type="file"
                                                    id="avatar-upload"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;

                                                        const previewUrl = URL.createObjectURL(file);
                                                        setFormData(prev => ({ ...prev, avatarUrl: previewUrl }));

                                                        try {
                                                            setSaving(true);
                                                            setMessage({ text: "Đang tải ảnh lên...", type: "info" });
                                                            const res = await customerAPI.uploadAvatar(customer.id, file);
                                                            if (res.url) {
                                                                setFormData(prev => ({ ...prev, avatarUrl: res.url }));
                                                                setCustomer(prev => ({ ...prev, avatarUrl: res.url }));
                                                                updateCustomer({ avatarUrl: res.url });
                                                                setMessage({ text: "Tải ảnh thành công!", type: "success" });
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            setMessage({ text: "Lỗi tải ảnh. Vui lòng thử lại.", type: "error" });
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    }}
                                                    style={{ display: 'none' }}
                                                />
                                                <label htmlFor="avatar-upload" className="btn-upload-new">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="17 8 12 3 7 8"></polyline>
                                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                                    </svg>
                                                    Chọn ảnh mới
                                                </label>
                                                <span className="avatar-hint">Hỗ trợ: JPG, PNG, GIF (Tối đa 5MB)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" className="btn-save-profile" disabled={saving}>
                                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="tab-pane">
                                <div className="profile-section-header">
                                    <h1 className="profile-section-title">Lịch sử đơn hàng</h1>
                                    <span className="order-count">{orders.length} đơn hàng</span>
                                </div>

                                {message.text && (
                                    <div className={`feedback-msg ${message.type}`}>
                                        {message.text}
                                    </div>
                                )}

                                {orders.length > 0 ? (
                                    <div className="orders-grid">
                                        {orders.map(order => (
                                            <div key={order.id} className="order-card-new">
                                                <div className="order-card-header">
                                                    <div className="order-info">
                                                        <span className="order-code">#{order.orderNumber || order.orderCode}</span>
                                                        <span className="order-time">{formatDate(order.createdAt)}</span>
                                                    </div>
                                                    <span className={`order-badge ${order.status?.toLowerCase()}`}>
                                                        {ORDER_STATUS[order.status] || order.status}
                                                    </span>
                                                </div>

                                                {/* Products list */}
                                                {order.items && order.items.length > 0 && (
                                                    <div className="order-products-list">
                                                        {order.items.slice(0, 3).map((item, idx) => (
                                                            <div key={idx} className="order-product-item">
                                                                <div className="product-item-info">
                                                                    <span className="product-item-name">{item.productName}</span>
                                                                    <span className="product-item-meta">
                                                                        {item.variantInfo} × {item.quantity}
                                                                    </span>
                                                                </div>
                                                                <span className="product-item-price">{formatVND(item.lineTotal || (item.unitPrice * item.quantity))}</span>
                                                            </div>
                                                        ))}
                                                        {order.items.length > 3 && (
                                                            <div className="order-products-more">
                                                                +{order.items.length - 3} sản phẩm khác
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="order-card-body">
                                                    <div className="order-amount">
                                                        <span className="amount-label">Tổng thanh toán</span>
                                                        <span className="amount-value">{formatVND(order.totalAmount)}</span>
                                                    </div>
                                                </div>
                                                <div className="order-card-footer">
                                                    {canDeleteOrder(order) && (
                                                        <button
                                                            className="btn-delete-order"
                                                            onClick={() => handleDeleteOrder(order.id)}
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                    {order.status === 'PENDING' && (
                                                        <button
                                                            className="btn-cancel-order"
                                                            onClick={() => openCancelModal(order.id)}
                                                        >
                                                            Hủy đơn
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-order-detail"
                                                        onClick={() => handleViewOrderDetail(order.id)}
                                                    >
                                                        Xem chi tiết
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-orders">
                                        <div className="empty-icon">📦</div>
                                        <h3>Chưa có đơn hàng nào</h3>
                                        <p>Hãy khám phá các sản phẩm tuyệt vời của chúng tôi!</p>
                                        <button className="btn-shop-now" onClick={() => navigate('/shop')}>
                                            Mua sắm ngay
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Order Details Modal */}
            {showOrderModal && (
                <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
                    <div className="order-modal-content" onClick={e => e.stopPropagation()}>
                        {modalLoading ? (
                            <div className="modal-loading">
                                <div className="loader"></div>
                                <p>Đang tải thông tin đơn hàng...</p>
                            </div>
                        ) : selectedOrder ? (
                            <>
                                <div className="modal-header">
                                    <h2>Chi tiết đơn hàng #{selectedOrder.orderCode}</h2>
                                    <button className="btn-close-modal" onClick={() => setShowOrderModal(false)}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>

                                <div className="modal-body">
                                    <div className="order-detail-grid">
                                        <div className="detail-section">
                                            <h4>Thông tin chung</h4>
                                            <div className="detail-row">
                                                <span>Ngày đặt:</span>
                                                <strong>{formatDate(selectedOrder.createdAt)}</strong>
                                            </div>
                                            <div className="detail-row">
                                                <span>Trạng thái:</span>
                                                <span className={`order-badge-modal ${selectedOrder.status?.toLowerCase()}`}>
                                                    {ORDER_STATUS[selectedOrder.status] || selectedOrder.status}
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span>Tổng cộng:</span>
                                                <strong className="text-large">{formatVND(selectedOrder.totalAmount)}</strong>
                                            </div>
                                            {selectedOrder.trackingNumber && (
                                                <div className="detail-row tracking-info" style={{ marginTop: 10, padding: 10, backgroundColor: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
                                                    <div style={{ fontSize: 13, color: '#0369a1', fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="1" y="3" width="15" height="13" />
                                                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                                            <circle cx="5.5" cy="18.5" r="2.5" />
                                                            <circle cx="18.5" cy="18.5" r="2.5" />
                                                        </svg>
                                                        Thông tin vận chuyển
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 13 }}>GHTK: <strong>{selectedOrder.trackingNumber}</strong></span>
                                                        <a
                                                            href={`https://i.ghtk.vn/${selectedOrder.trackingNumber}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ fontSize: 12, color: '#0284c7', textDecoration: 'underline' }}
                                                        >
                                                            Tra cứu →
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="detail-section">
                                            <h4>Địa chỉ nhận hàng</h4>
                                            <p className="shipping-address">
                                                {selectedOrder.shippingAddress || "N/A"}<br />
                                                SĐT: {selectedOrder.phone || customer.phone || "N/A"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="order-items-section">
                                        <h4>Sản phẩm</h4>
                                        <div className="modal-item-list">
                                            {(selectedOrder.items || selectedOrder.orderDetails)?.map((item, index) => (
                                                <div key={index} className="modal-order-item">
                                                    <div className="item-img">
                                                        <img src={item.productImage || "/placeholder-product.png"} alt={item.productName} />
                                                    </div>
                                                    <div className="item-info">
                                                        <span className="item-name">{item.productName}</span>
                                                        <span className="item-meta">{item.variantInfo || [item.sizeName, item.colorName].filter(Boolean).join(' / ') || 'N/A'} × {item.quantity}</span>
                                                    </div>
                                                    <span className="item-price">{formatVND(item.lineTotal || item.unitPrice * item.quantity)}</span>
                                                </div>
                                            )) || <p>Không có dữ liệu sản phẩm.</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button className="btn-modal-close-wide" onClick={() => setShowOrderModal(false)}>Đóng</button>
                                </div>
                            </>
                        ) : (
                            <div className="modal-error">
                                <h3>Không tìm thấy đơn hàng</h3>
                                <button onClick={() => setShowOrderModal(false)}>Đóng</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cancel Order Modal */}
            {showCancelModal && (
                <div className="modal-overlay" onClick={closeCancelModal}>
                    <div className="cancel-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Yêu cầu hủy đơn hàng</h2>
                            <button className="btn-close-modal" onClick={closeCancelModal}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="cancel-note">Vui lòng chọn lý do hủy đơn hàng. Yêu cầu của bạn sẽ được gửi đến admin để duyệt.</p>
                            <div className="cancel-reason-field">
                                <label>Lý do hủy đơn</label>
                                <select
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                >
                                    <option value="">-- Chọn lý do --</option>
                                    <option value="Đổi ý không muốn mua nữa">Đổi ý không muốn mua nữa</option>
                                    <option value="Muốn đổi sản phẩm khác">Muốn đổi sản phẩm khác</option>
                                    <option value="Đặt nhầm địa chỉ giao hàng">Đặt nhầm địa chỉ giao hàng</option>
                                    <option value="Tìm được giá tốt hơn ở nơi khác">Tìm được giá tốt hơn ở nơi khác</option>
                                    <option value="Thời gian giao hàng quá lâu">Thời gian giao hàng quá lâu</option>
                                    <option value="Lý do khác">Lý do khác</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel-modal" onClick={closeCancelModal}>Hủy bỏ</button>
                            <button className="btn-confirm-cancel" onClick={handleCancelRequest}>
                                Gửi yêu cầu hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
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
