import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { promotionAPI, formatVND } from "@shared/utils/api.js";
import { useToast } from "@shared/context/ToastContext";
import "../styles/dashboard.css";
import "../styles/pages.css";
import "../styles/promotions.css";
import "../styles/admin-forms.css";
import { useTranslation } from "react-i18next";

// SVG Icons
const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);

const TagIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <circle cx="7" cy="7" r="1.5" />
    </svg>
);

const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const PauseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

const PlayIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
);

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
    </svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const EmptyIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <circle cx="7" cy="7" r="1.5" />
    </svg>
);

function Modal({ open, title, children, onClose }) {
    if (!open) return null;
    return createPortal(
        <div className="modalBackdrop" onMouseDown={onClose}>
            <div className="modal" style={{ maxWidth: 680 }} onMouseDown={(e) => e.stopPropagation()}>
                <div className="modalHead">
                    <div className="modalTitle">{title}</div>
                    <button className="iconBtn" type="button" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>
                <div className="modalBody">{children}</div>
            </div>
        </div>,
        document.body
    );
}

const emptyForm = {
    code: "",
    name: "",
    description: "",
    discountType: "PERCENT",
    discountValue: "",
    minOrderAmount: "",
    maxDiscount: "",
    usageLimit: "",
    startDate: "",
    endDate: "",
    isActive: true,
    isFlashSale: false,
};

export default function Promotions() {
    const { t } = useTranslation();
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [q, setQ] = useState("");
    const { showToast } = useToast();

    useEffect(() => {
        loadPromotions();
    }, []);

    const loadPromotions = async () => {
        try {
            setLoading(true);
            const data = await promotionAPI.getAll();
            setPromotions(data || []);
        } catch (err) {
            console.error("Failed to load promotions:", err);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (promo) => {
        setEditingId(promo.id);
        setForm({
            code: promo.code || "",
            name: promo.name || "",
            description: promo.description || "",
            discountType: promo.discountType || "PERCENT",
            discountValue: String(promo.discountValue || ""),
            minOrderAmount: String(promo.minOrderAmount || ""),
            maxDiscount: promo.maxDiscount ? String(promo.maxDiscount) : "",
            usageLimit: promo.usageLimit ? String(promo.usageLimit) : "",
            startDate: promo.startDate ? promo.startDate.replace(' ', 'T').slice(0, 16) : "",
            endDate: promo.endDate ? promo.endDate.replace(' ', 'T').slice(0, 16) : "",
            isActive: promo.isActive !== false,
            isFlashSale: promo.isFlashSale === true,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.name.trim() || !form.discountValue) {
            showToast(t("profile.validate_required"), "error");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                description: form.description.trim(),
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
                maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
                usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
                startDate: form.startDate ? form.startDate.replace(' ', 'T').slice(0, 16) + ':00' : null,
                endDate: form.endDate ? form.endDate.replace(' ', 'T').slice(0, 16) + ':00' : null,
                isActive: form.isActive,
                isFlashSale: form.isFlashSale,
            };

            if (editingId) {
                await promotionAPI.update(editingId, payload);
            } else {
                await promotionAPI.create(payload);
            }

            setModalOpen(false);
            loadPromotions();
            showToast(editingId ? t("promotions.msg_update_success") : t("promotions.msg_create_success"));
        } catch (err) {
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (promo) => {
        if (!window.confirm(t("promotions.delete_confirm", { code: promo.code }))) return;
        try {
            await promotionAPI.delete(promo.id);
            loadPromotions();
            showToast(t("promotions.msg_delete_success"));
        } catch (err) {
            showToast("Lỗi: " + err.message, "error");
        }
    };

    const toggleActive = async (promo) => {
        try {
            await promotionAPI.update(promo.id, { ...promo, isActive: !promo.isActive });
            loadPromotions();
            showToast(promo.isActive ? t("common.deactivated") : t("common.activated"));
        } catch (err) {
            showToast("Lỗi: " + err.message, "error");
        }
    };

    const filtered = promotions.filter((p) => {
        const text = `${p.code} ${p.name}`.toLowerCase();
        return !q || text.includes(q.toLowerCase());
    });

    const getStatusBadge = (promo) => {
        if (!promo.isActive) return { cls: "paused", label: t("common.paused") };
        const now = new Date();
        if (promo.startDate && new Date(promo.startDate) > now) return { cls: "pending", label: t("promotions.status_scheduled") };
        if (promo.endDate && new Date(promo.endDate) < now) return { cls: "expired", label: t("promotions.status_expired") };
        if (promo.usageLimit && promo.usedCount >= promo.usageLimit) return { cls: "expired", label: t("promotions.status_expired") };
        return { cls: "active", label: t("promotions.status_active") };
    };

    if (loading) {
        return (
            <div className="promo-card">
                <div className="promo-header">
                    <div className="promo-header-left">
                        <div className="promo-icon"><TagIcon /></div>
                        <div>
                            <h1 className="promo-title">{t("promotions.title")}</h1>
                            <p className="promo-subtitle">{t("common.loading")}...</p>
                        </div>
                    </div>
                </div>
                <div className="promo-loading">
                    <div className="promo-spinner"></div>
                    <span>{t("common.loading_data")}...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="promo-card">
            {/* Header */}
            <div className="promo-header">
                <div className="promo-header-left">
                    <div className="promo-icon"><TagIcon /></div>
                    <div>
                        <h1 className="promo-title">{t("promotions.title")}</h1>
                        <p className="promo-subtitle">{promotions.length} {t("promotions.title").toLowerCase()}</p>
                    </div>
                </div>

                <div className="promo-header-right">
                    <div className="promo-search">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder={t("common.search_placeholder")}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                    <button className="promo-btn-primary" type="button" onClick={openAdd}>
                        <PlusIcon />
                        <span>{t("promotions.btn_add")}</span>
                    </button>
                </div>
            </div>

            {/* Header Divider */}
            <div className="promo-divider"></div>

            {/* Table Header */}
            <div className="promo-table-header">
                <div className="promo-col promo-col-code">{t("promotions.col_code")}</div>
                <div className="promo-col promo-col-name">{t("common.name")}</div>
                <div className="promo-col promo-col-discount">{t("promotions.col_value")}</div>
                <div className="promo-col promo-col-min">{t("promotions.col_min_order")}</div>
                <div className="promo-col promo-col-usage">{t("promotions.col_usage")}</div>
                <div className="promo-col promo-col-status">{t("common.status")}</div>
                <div className="promo-col promo-col-actions">{t("common.actions")}</div>
            </div>

            {/* Promotion List */}
            <div className="promo-list">
                {filtered.map((promo) => {
                    const status = getStatusBadge(promo);
                    return (
                        <div key={promo.id} className="promo-row">
                            <div className="promo-col promo-col-code">
                                <span className="promo-code-badge">{promo.code}</span>
                            </div>
                            <div className="promo-col promo-col-name">
                                <span className="promo-name">{promo.name}</span>
                                {promo.description && (
                                    <span className="promo-desc">{promo.description}</span>
                                )}
                            </div>
                            <div className="promo-col promo-col-discount">
                                <span className="promo-discount-value">
                                    {promo.discountType === "PERCENT"
                                        ? `${promo.discountValue}%`
                                        : formatVND(promo.discountValue)}
                                </span>
                                {promo.maxDiscount && promo.discountType === "PERCENT" && (
                                    <span className="promo-max-discount">
                                        {t("promotions.label_max_discount")} {formatVND(promo.maxDiscount)}
                                    </span>
                                )}
                            </div>
                            <div className="promo-col promo-col-min">
                                {promo.minOrderAmount ? formatVND(promo.minOrderAmount) : "—"}
                            </div>
                            <div className="promo-col promo-col-usage">
                                <span className="promo-usage">
                                    {promo.usedCount || 0}
                                    {promo.usageLimit && (
                                        <span className="promo-usage-limit">/{promo.usageLimit}</span>
                                    )}
                                </span>
                            </div>
                            <div className="promo-col promo-col-status">
                                <span className={`promo-status-badge ${status.cls}`}>
                                    {status.label}
                                </span>
                            </div>
                            <div className="promo-col promo-col-actions">
                                <div className="promo-actions">
                                    <button
                                        className="promo-action-btn"
                                        type="button"
                                        onClick={() => openEdit(promo)}
                                        title={t("common.edit")}
                                    >
                                        <EditIcon />
                                        <span>{t("common.edit")}</span>
                                    </button>
                                    <button
                                        className="promo-action-btn"
                                        type="button"
                                        onClick={() => toggleActive(promo)}
                                        title={promo.isActive ? t("common.pause") : t("common.activate")}
                                    >
                                        {promo.isActive ? <PauseIcon /> : <PlayIcon />}
                                        <span>{promo.isActive ? t("common.deactivate_short") : t("common.activate_short")}</span>
                                    </button>
                                    <button
                                        className="promo-action-btn danger"
                                        type="button"
                                        onClick={() => handleDelete(promo)}
                                        title={t("common.delete")}
                                    >
                                        <TrashIcon />
                                        <span>{t("common.delete")}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {filtered.length === 0 && (
                    <div className="promo-empty">
                        <div className="promo-empty-icon"><EmptyIcon /></div>
                        <h3>{t("common.empty_state")}</h3>
                        <p>{t("promotions.subtitle")}</p>
                        <button className="promo-btn-primary" type="button" onClick={openAdd}>
                            <PlusIcon />
                            <span>{t("promotions.btn_add")}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal
                open={modalOpen}
                title={editingId ? t("promotions.modal_edit") : t("promotions.modal_add")}
                onClose={() => setModalOpen(false)}
            >
                <div className="premium-form">
                    {/* General Info */}
                    <div className="form-group">
                        <div className="form-group-title">{t("products.section_basic")}</div>
                        <div className="form-row">
                            <label className="admin-field">
                                <span>{t("promotions.label_code")} *</span>
                                <input
                                    value={form.code}
                                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    placeholder="VD: SUMMER24"
                                    disabled={!!editingId}
                                />
                            </label>
                            <label className="admin-field">
                                <span>{t("common.name")} *</span>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="VD: Khai xuân Quý Tỵ"
                                />
                            </label>
                        </div>
                        <div className="form-row" style={{ marginTop: 16 }}>
                            <label className="admin-field full">
                                <span>{t("promotions.label_desc")}</span>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="VD: Áp dụng cho toàn bộ sản phẩm..."
                                    rows={2}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Discount & Rules */}
                    <div className="form-group">
                        <div className="form-group-title">{t("products.section_pricing")}</div>
                        <div className="form-row three-col">
                            <label className="admin-field">
                                <span>{t("promotions.label_type")} *</span>
                                <select
                                    value={form.discountType}
                                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                                >
                                    <option value="PERCENT">{t("promotions.type_percentage")}</option>
                                    <option value="FIXED">{t("promotions.type_fixed")}</option>
                                </select>
                            </label>
                            <label className="admin-field">
                                <span>{t("promotions.label_value")} *</span>
                                <input
                                    type="number"
                                    value={form.discountValue}
                                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                                    placeholder="0"
                                />
                            </label>
                            <label className="admin-field">
                                <span>{t("promotions.label_min_order")}</span>
                                <input
                                    type="number"
                                    value={form.minOrderAmount}
                                    onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                                    placeholder="0"
                                />
                            </label>
                        </div>
                        <div className="form-row three-col" style={{ marginTop: 16 }}>
                            <label className="admin-field">
                                <span>{t("promotions.label_limit")}</span>
                                <input
                                    type="number"
                                    value={form.usageLimit}
                                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                                    placeholder="∞"
                                />
                            </label>
                            {form.discountType === "PERCENT" && (
                                <label className="admin-field">
                                    <span>{t("promotions.label_max_discount")}</span>
                                    <input
                                        type="number"
                                        value={form.maxDiscount}
                                        onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                                        placeholder="0"
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="form-group">
                        <div className="form-group-title">{t("promotions.col_start")} & {t("promotions.col_end")}</div>
                        <div className="form-row">
                            <label className="admin-field">
                                <span>{t("promotions.col_start")}</span>
                                <input
                                    type="datetime-local"
                                    value={form.startDate}
                                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                />
                            </label>
                            <label className="admin-field">
                                <span>{t("promotions.col_end")}</span>
                                <input
                                    type="datetime-local"
                                    value={form.endDate}
                                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Settings Toggles */}
                    <div className="toggle-group">
                        <label className="admin-toggle">
                            <input
                                type="checkbox"
                                hidden
                                checked={form.isActive}
                                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                            />
                            <div className="toggle-slider"></div>
                            <div className="toggle-label">
                                <span className="toggle-title">{t("common.activated")}</span>
                                <span className="toggle-desc">{t("common.status")}</span>
                            </div>
                        </label>

                        <label className={`admin-toggle ${form.isFlashSale ? 'flash-sale-highlight' : ''}`}>
                            <input
                                type="checkbox"
                                hidden
                                checked={form.isFlashSale}
                                onChange={(e) => setForm((f) => ({ ...f, isFlashSale: e.target.checked }))}
                            />
                            <div className="toggle-slider"></div>
                            <div className="toggle-label">
                                <span className="toggle-title">{t("promotions.label_is_flash_sale")}</span>
                                <span className="toggle-desc">⚡ Hiển thị đếm ngược Shop</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="modalActions">
                    <button className="btnGhost" type="button" onClick={() => setModalOpen(false)}>
                        {t("common.cancel")}
                    </button>
                    <button className="btnPrimary" type="button" onClick={handleSave} disabled={saving}>
                        {saving ? t("common.saving") + "..." : t("common.save")}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
