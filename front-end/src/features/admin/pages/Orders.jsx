import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "../styles/dashboard.css";
import "../styles/pages.css";
import api, { formatVND, ORDER_STATUS, reportAPI, shippingAPI } from "@shared/utils/api.js";
import { useToast } from "@shared/context/ToastContext";
import { useTranslation } from "react-i18next";


// Icons

// Icons
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const RocketIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.71-2.13.71-3.04l-3.71-3.71c-.91 0-2.2 0-3.04.71z" />
    <path d="M12 12l8.73-8.73c.39-.39 1.02-.39 1.41 0a1 1 0 0 1 0 1.41L13.41 13.41c-.39.39-1.02.39-1.41 0z" />
    <path d="M10.12 13.88l-6.73 6.73" />
    <path d="M12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
  </svg>
);

const TruckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const BoxIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

function Pill({ status }) {
  const { t } = useTranslation();
  const statusConfig = {
    DELIVERED: { cls: "ok", label: t("status.delivered") },
    COMPLETED: { cls: "ok", label: t("status.completed") },
    SHIPPING: { cls: "ship", label: t("status.shipping") },
    PROCESSING: { cls: "ship", label: t("status.processing") },
    PENDING: { cls: "pending", label: t("status.pending") },
    PENDING_CANCEL: { cls: "cancel", label: t("status.pending_cancel") },
    CANCELLED: { cls: "cancel", label: t("status.cancelled") },
  };
  const config = statusConfig[status] || { cls: "pending", label: status };
  const label = config.label;
  return <span className={`pill ${config.cls}`}>{label}</span>;
}

function Drawer({ open, order, onClose, onUpdateStatus, onUpdateOrderData, onPushToGHTK }) {
  const { t } = useTranslation();
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  if (!open || !order) return null;

  const STATUS_MAP = {
    PENDING: t("status.pending"),
    CONFIRMED: t("status.confirmed"),
    PROCESSING: t("status.processing"),
    SHIPPING: t("status.shipping"),
    DELIVERED: t("status.delivered"),
    COMPLETED: t("status.completed"),
    PENDING_CANCEL: t("status.pending_cancel"),
    CANCELLED: t("status.cancelled"),
  };

  const statusEntries = Object.entries(STATUS_MAP);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const content = (
    <>
      <div className="drawerBackdrop" onMouseDown={onClose} />
      <aside className="drawer drawer-enhanced">
        {/* Header */}
        <div className="drawer-header-enhanced">
          <div className="drawer-header-top">
            <div className="drawer-order-id">
              <span className="order-hash">#</span>
              {order.orderNumber || order.id}
            </div>
            <button className="iconBtn" type="button" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
          <div className="drawer-header-meta">
            <Pill status={order.status} />
            <span className="drawer-date">
              <CalendarIcon /> {formatDateTime(order.createdAt)}
            </span>
          </div>
        </div>

        {/* Customer Card */}
        <div className="drawer-card">
          <div className="drawer-card-header">
            <UserIcon /> {t("orders.drawer_customer")}
          </div>
          <div className="drawer-customer-info">
            <div className="customer-avatar">
              {(order.customer?.fullName || order.shippingName || "K").charAt(0).toUpperCase()}
            </div>
            <div className="customer-details">
              <div className="customer-name">{order.customer?.fullName || order.shippingName || t("orders.drawer_guest")}</div>
              <div className="customer-contact">
                <span><PhoneIcon /> {order.customer?.phone || order.shippingPhone || "—"}</span>
                {order.customer?.email && <span>{order.customer.email}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Card */}
        <div className="drawer-card">
          <div className="drawer-card-header">
            <MapPinIcon /> {t("orders.drawer_shipping_address")}
          </div>
          <div className="drawer-address">
            <div className="address-name">{order.shippingName}</div>
            <div className="address-phone"><PhoneIcon /> {order.shippingPhone}</div>
            <div className="address-full">{order.shippingAddress || order.fullAddress || "—"}</div>
          </div>
        </div>

        {/* Shipping Tracking Card */}
        {order.trackingNumber && (
          <div className="drawer-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="drawer-card-header">
              <BoxIcon /> {t("orders.drawer_shipping_info")}
            </div>
            <div className="drawer-tracking-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>{t("orders.drawer_carrier")}:</span>
                <span style={{ fontWeight: 600 }}>{order.carrier}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t("orders.drawer_tracking_code")}:</span>
                <span className="mono" style={{ fontWeight: 700, color: '#2563eb' }}>{order.trackingNumber}</span>
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        <div className="drawer-card">
          <div className="drawer-card-header">
            {t("orders.drawer_products")} ({order.items?.length || 0})
          </div>
          <div className="drawer-products">
            {order.items?.map((it, idx) => (
              <div className="drawer-product-item" key={idx}>
                <div className="product-thumb">
                  {it.productImage ? (
                    <img src={it.productImage} alt={it.productName} />
                  ) : (
                    <div className="product-thumb-placeholder">
                      {it.productName?.charAt(0) || "P"}
                    </div>
                  )}
                </div>
                <div className="product-info">
                  <div className="product-name">{it.productName}</div>
                  {it.variantInfo && <div className="product-variant">{it.variantInfo}</div>}
                </div>
                <div className="product-qty">×{it.quantity}</div>
                <div className="product-price">{formatVND(it.lineTotal)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="drawer-card drawer-summary-card">
          <div className="drawer-card-header">
            <CreditCardIcon /> {t("orders.drawer_payment")}
          </div>
          <div className="drawer-payment-info">
            <div className="payment-method">
              {order.paymentMethod || "COD"}
              <span className={`payment-status ${order.paymentStatus?.toLowerCase()}`}>
                {order.paymentStatus === "PAID" ? t("orders.drawer_paid") : t("orders.drawer_unpaid")}
              </span>
            </div>
          </div>
          <div className="drawer-summary">
            <div className="summary-row">
              <span>{t("orders.drawer_subtotal")}</span>
              <span>{formatVND(order.subtotal || order.totalAmount)}</span>
            </div>
            {order.shippingFee > 0 && (
              <div className="summary-row">
                <span>{t("orders.drawer_shipping_fee")}</span>
                <span>{formatVND(order.shippingFee)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="summary-row discount">
                <span>{t("orders.drawer_discount")}</span>
                <span>-{formatVND(order.discount)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>{t("orders.drawer_total")}</span>
              <span>{formatVND(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        {order.notes && (
          <div className="drawer-card drawer-note">
            <div className="drawer-card-header">{t("orders.drawer_notes")}</div>
            <p>{order.notes}</p>
          </div>
        )}

        {/* Status Update Actions */}
        <div className="drawer-actions-container">
          <div className="drawer-section-label">{t("orders.drawer_handle_order")}</div>

          {order.status === 'PENDING_CANCEL' ? (
            <div className="cancellation-request-actions" style={{ marginBottom: 20, padding: 15, background: '#fef2f2', borderRadius: 8, border: '1px solid #fee2e2' }}>
              <div style={{ color: '#991b1b', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {t("orders.cancellation_requested")}
              </div>
              {order.cancelReason && (
                <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 15, padding: '8px 12px', background: 'white', borderRadius: 4, border: '1px dashed #fca5a5' }}>
                  "{order.cancelReason}"
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="admin-action-btn cancel-btn"
                  style={{ background: '#ef4444', color: 'white', border: 'none' }}
                  onClick={() => {
                    if (window.confirm(t("orders.confirm_approve_cancel"))) {
                      onUpdateStatus(order.id, 'CANCELLED');
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight: 6}}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  {t("orders.approve_cancel")}
                </button>
                <button
                  className="admin-action-btn"
                  style={{ background: '#10b981', color: 'white', border: 'none' }}
                  onClick={() => {
                    if (window.confirm(t("orders.confirm_reject_cancel"))) {
                      onUpdateStatus(order.id, 'CONFIRMED');
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight: 6}}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("orders.reject_cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="drawer-actions-grid">
              <div className="custom-select-wrapper">
                <div
                  className={`custom-select-trigger ${isStatusOpen ? 'active' : ''}`}
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                >
                  <span>{STATUS_MAP[order.status] || order.status}</span>
                  <span className="custom-select-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>
                <div className={`custom-options ${isStatusOpen ? 'show' : ''}`}>
                  {statusEntries
                    .filter(([k]) => {
                      // Filter allowed transitions based on backend rules
                      if (k === order.status) return true;
                      if (order.status === 'PENDING') return ['CONFIRMED'].includes(k);
                      if (order.status === 'CONFIRMED') return ['PROCESSING'].includes(k);
                      if (order.status === 'PROCESSING') return ['SHIPPING'].includes(k);
                      if (order.status === 'SHIPPING') return ['DELIVERED'].includes(k);
                      if (order.status === 'DELIVERED') return ['COMPLETED'].includes(k);
                      return false;
                    })
                    .map(([k, v]) => (
                      <div
                        key={k}
                        className={`custom-option ${order.status === k ? 'selected' : ''}`}
                        onClick={() => {
                          if (window.confirm(t("orders.status_confirm_change", { status: v }))) {
                            onUpdateStatus(order.id, k);
                          }
                          setIsStatusOpen(false);
                        }}
                      >
                        {v}
                      </div>
                    ))}
                </div>
              </div>

              <button
                className="admin-action-btn print-btn"
                onClick={() => reportAPI.printInvoice(order.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z" />
                </svg>
                {t("orders.drawer_print_invoice")}
              </button>
            </div>
          )}
        </div>

          {!order.trackingNumber && ['CONFIRMED', 'PROCESSING'].includes(order.status) && (
            <>
              <div className="drawer-section-label" style={{ marginTop: 20 }}>{t("orders.drawer_shipping_section")}</div>
              <button
                className="admin-action-btn shipping-btn"
                onClick={(e) => onPushToGHTK(order.id, e.currentTarget)}
              >
                <TruckIcon />
                {t("orders.drawer_push_ghtk")}
              </button>
            </>
          )}
      </aside>
    </>
  );

  return createPortal(content, document.body);
}

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);

  const statusConfig = {
    all: t("status.all"),
    PENDING: t("status.pending"),
    CONFIRMED: t("status.confirmed"),
    PROCESSING: t("status.processing"),
    SHIPPING: t("status.shipping"),
    DELIVERED: t("status.delivered"),
    COMPLETED: t("status.completed"),
    PENDING_CANCEL: t("status.pending_cancel"),
    CANCELLED: t("status.cancelled"),
  };

  const statusEntries = Object.entries(statusConfig);

  const [q, setQ] = useState("");
  const [chip, setChip] = useState("all");
  const [activeTab, setActiveTab] = useState("normal"); // "normal" or "cancel_requests"
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ all: 0 });
  const { showToast } = useToast();

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        const params = { q };
        if (activeTab === "cancel_requests") {
          // Cancellation tab: Only shows PENDING_CANCEL and CANCELLED
          if (chip !== "all" && (chip === "PENDING_CANCEL" || chip === "CANCELLED")) {
            params.status = chip;
          }
        } else if (chip !== "all") {
          params.status = chip;
        }

        const res = await api.order.getAll(params);
        let list = res.orders || res.content || res || [];

        // Final distribution filter
        if (activeTab === "cancel_requests") {
          list = list.filter(o => o.status === "PENDING_CANCEL" || o.status === "CANCELLED");
          if (chip !== "all") {
            list = list.filter(o => o.status === chip);
          }
        } else {
          list = list.filter(o => o.status !== "PENDING_CANCEL" && o.status !== "CANCELLED");
        }

        setOrders(Array.isArray(list) ? list : []);
        setStats(prev => ({ ...prev, all: res.totalItems || res.totalElements || list.length }));
      } catch (error) {
        console.error("Failed to load orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [q, chip, activeTab]);

  const selected = orders.find((o) => o.id === selectedId) || null;

  const updateStatus = async (id, newStatus) => {
    try {
      await api.order.updateStatus(id, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
      showToast(t("orders.update_status_success"));
    } catch (error) {
      showToast(t("common.update_error") + ": " + error.message, "error");
    }
  };

  const updateOrderData = (id, data) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data } : o)));
  };

  const handlePushToGHTK = async (orderId, btnElement) => {
    if (!window.confirm(t("orders.push_ghtk_confirm"))) return;

    if (btnElement) {
      btnElement.disabled = true;
      btnElement.dataset.oldText = btnElement.innerText;
      btnElement.innerText = "...";
    }

    try {
      const res = await shippingAPI.pushToGHTK(orderId);
      showToast(t("orders.push_ghtk_success"));
      updateOrderData(orderId, {
        trackingNumber: res.order.label,
        carrier: 'GHTK',
        status: 'SHIPPING'
      });
    } catch (error) {
      const errorMsg = error.details?.message || error.details?.error_body || error.message;
      showToast("Lỗi GHTK: " + errorMsg, "error");
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerText = btnElement.dataset.oldText;
      }
    }
  };

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <div className="cardTitle">{t("orders.title")}</div>
          <div className="cardSub">{t("orders.subtitle")}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <input
            className="miniInput"
            placeholder={t("orders.search_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btnGhost"
            type="button"
            onClick={async () => {
              try {
                await reportAPI.exportOrders({ status: chip !== 'all' ? chip : '' });
                showToast(t("orders.export_success"));
              } catch (e) {
                showToast(t("orders.export_error") + e.message, "error");
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("orders.export_excel")}
          </button>
        </div>
      </div>

      <div className="tabs-container" style={{ display: 'flex', gap: '30px', borderBottom: '1px solid var(--admin-border)', marginBottom: '20px' }}>
        <div
          className={`tab-item ${activeTab === 'normal' ? 'active' : ''}`}
          style={{
            padding: '10px 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'normal' ? '700' : '500',
            color: activeTab === 'normal' ? 'var(--admin-primary)' : 'var(--admin-text-muted)',
            borderBottom: activeTab === 'normal' ? '2px solid var(--admin-primary)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => { setActiveTab('normal'); setChip('all'); }}
        >
          <BoxIcon /> {t("orders.tab_orders")}
        </div>
        <div
          className={`tab-item ${activeTab === 'cancel_requests' ? 'active' : ''}`}
          style={{
            padding: '10px 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'cancel_requests' ? '700' : '500',
            color: activeTab === 'cancel_requests' ? 'var(--admin-danger)' : 'var(--admin-text-muted)',
            borderBottom: activeTab === 'cancel_requests' ? '2px solid var(--admin-danger)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => { setActiveTab('cancel_requests'); setChip('PENDING_CANCEL'); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 9v4M12 17h.01M4.93 4.93l14.14 14.14M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          {t("orders.tab_cancel_requests")}
        </div>
      </div>

      {activeTab === 'normal' ? (
        <div className="chips" style={{ marginBottom: 16 }}>
          {statusEntries
            .filter(([k]) => k !== 'PENDING_CANCEL' && k !== 'CANCELLED')
            .map(([k]) => (
              <button key={k} className={`chip ${chip === k ? "on" : ""}`} onClick={() => setChip(k)} type="button">
                {k === 'all' ? t("status.all") : statusConfig[k]}
              </button>
            ))}
        </div>
      ) : (
        <div className="chips" style={{ marginBottom: 16 }}>
          {['all', 'PENDING_CANCEL', 'CANCELLED'].map(k => (
            <button key={k} className={`chip ${chip === k ? "on" : ""}`} onClick={() => setChip(k)} type="button">
              {k === 'all' ? t("orders.all_requests") : statusConfig[k]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <div style={{ fontWeight: '700' }}>{t("common.loading")}</div>
        </div>
      ) : (
        <div className="table">
          <div className="tr th">
            <div>{t("orders.col_code")}</div>
            <div>{t("orders.col_customer")}</div>
            <div>{t("orders.col_total")}</div>
            <div>{t("orders.col_status")}</div>
            <div>{t("orders.col_action")}</div>
          </div>

          {orders.map((o) => (
            <div className="tr" key={o.id}>
              <div className="mono">#{o.orderNumber || o.id}</div>
              <div>
                <div style={{ fontWeight: 800 }}>{o.customer?.fullName || o.shippingName}</div>
                <div style={{ color: "var(--admin-text-muted-2)", fontSize: 12 }}>{o.customer?.phone || o.shippingPhone}</div>
              </div>
              <div className="mono" style={{ fontWeight: '700' }}>{formatVND(o.totalAmount)}</div>
              <div><Pill status={o.status} /></div>
              <div className="rowActions">
                {!o.trackingNumber && (o.status === 'CONFIRMED' || o.status === 'PROCESSING') && (
                  <button
                    className="linkBtn ghtk-push-btn"
                    style={{ color: '#059669', marginRight: 10, fontWeight: 700 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePushToGHTK(o.id, e.currentTarget);
                    }}
                  >
                    <RocketIcon /> {t("orders.push_ghtk")}
                  </button>
                )}
                <button className="linkBtn" type="button" onClick={() => setSelectedId(o.id)}>{t("orders.view_details")}</button>
              </div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>{t("orders.no_orders_found")}</div>}
        </div>
      )}

      <Drawer
        open={!!selected}
        order={selected}
        onClose={() => setSelectedId(null)}
        onUpdateStatus={updateStatus}
        onUpdateOrderData={updateOrderData}
        onPushToGHTK={handlePushToGHTK}
      />
    </div>
  );
}
