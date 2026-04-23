import { useState, useEffect, useCallback } from "react";
import { nightMarketAdminAPI } from "../../../shared/utils/api.js";
import Toast from "../../../shared/components/Toast";
import "../styles/night-market-admin.css";
import { useTranslation } from "react-i18next";

// SVG Icons
const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

const SaveIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

export default function NightMarketAdmin() {
    const { t } = useTranslation();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const showToast = useCallback((message, type = "success") => {
        setToast({ show: true, message, type });
    }, []);

    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";
            return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
        } catch (e) {
            return "";
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await nightMarketAdminAPI.getConfig();
            // Handle the new response format if needed, but getConfig returns the object directly
            setConfig(data);
        } catch (error) {
            console.error("Failed to fetch Night Market config:", error);
            // Set default config so UI can still render
            setConfig({
                minOffers: 3,
                maxOffers: 5,
                minDiscountPercent: 10,
                maxDiscountPercent: 50,
                offerDurationDays: 3,
                isActive: false,
                startTime: null,
                endTime: null
            });
            showToast(t("night_market.msg_load_error"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await nightMarketAdminAPI.updateConfig(config);
            const msg = response.syncedCount > 0 
                ? t("night_market.msg_update_success") + ` (${response.syncedCount} ${t("night_market.offers_updated")})`
                : t("night_market.msg_update_success");
            
            showToast(msg);
            if (response.config) setConfig(response.config);
        } catch (error) {
            showToast(t("night_market.msg_update_error") + ": " + error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const getSystemStatus = (c) => {
        if (!c.isActive) return { label: t("night_market.inactive"), className: "inactive" };
        const now = new Date();
        const start = c.startTime ? new Date(c.startTime) : null;
        const end = c.endTime ? new Date(c.endTime) : null;

        if (start && now < start) return { label: t("night_market.upcoming"), className: "upcoming" };
        if (end && now > end) return { label: t("night_market.expired"), className: "expired" };
        return { label: t("night_market.active"), className: "running" };
    };

    if (loading) return (
        <div className="night-market-admin-page page-container">
            <div className="loading-state">{t("common.loading_data")}</div>
        </div>
    );

    if (!config) return (
        <div className="night-market-admin-page page-container">
            <div className="empty-state">Không thể tải cấu hình Chợ Đêm</div>
        </div>
    );

    const statusObj = getSystemStatus(config);
    const isActuallyRunning = statusObj.className === "running";

    return (
        <div className="night-market-admin-page page-container">
            <div className="nm-admin-content">
                <form onSubmit={handleSave} className="nm-admin-form">
                    <div className="nm-section-group">
                        <h4 className="nm-section-title">
                            <SettingsIcon />
                            {t("night_market.section_config")}
                        </h4>

                        <div className="nm-form-row">
                            <div className="nm-form-field">
                                <label>{t("night_market.label_min_offers")}</label>
                                <input
                                    type="number"
                                    value={config.minOffers}
                                    onChange={(e) => setConfig({ ...config, minOffers: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="nm-form-field">
                                <label>{t("night_market.label_max_offers")}</label>
                                <input
                                    type="number"
                                    value={config.maxOffers}
                                    onChange={(e) => setConfig({ ...config, maxOffers: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="nm-form-row">
                            <div className="nm-form-field">
                                <label>{t("night_market.label_min_discount")}</label>
                                <input
                                    type="number"
                                    value={config.minDiscountPercent}
                                    onChange={(e) => setConfig({ ...config, minDiscountPercent: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="nm-form-field">
                                <label>{t("night_market.label_max_discount")}</label>
                                <input
                                    type="number"
                                    value={config.maxDiscountPercent}
                                    onChange={(e) => setConfig({ ...config, maxDiscountPercent: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="nm-form-row">
                            <div className="nm-form-field">
                                <label>{t("night_market.label_duration")}</label>
                                <input
                                    type="number"
                                    value={config.offerDurationDays}
                                    onChange={(e) => setConfig({ ...config, offerDurationDays: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="nm-form-field">
                                <label>{t("night_market.label_status")}</label>
                                <div className="nm-status-toggle">
                                    <button 
                                        type="button" 
                                        className={`nm-toggle-btn ${config.isActive ? 'active' : ''}`}
                                        onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                                    >
                                        <div className="toggle-slider"></div>
                                    </button>
                                    <span className={`nm-status-badge ${statusObj.className}`}>
                                        {statusObj.label}
                                    </span>
                                </div>
                            </div>

                            {!isActuallyRunning && config.isActive && (
                                <div className="nm-time-warning">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    <span>
                                        {statusObj.className === "expired" 
                                            ? "Cấu hình đã hết hạn. Vui lòng cập nhật thời gian để Chợ Đêm hiển thị."
                                            : "Chợ Đêm chưa đến thời gian hoạt động."}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="nm-form-row">
                            <div className="nm-form-field">
                                <label>{t("night_market.label_start_time")}</label>
                                <input
                                    type="datetime-local"
                                    value={formatDateForInput(config.startTime)}
                                    onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                                />
                            </div>
                            <div className="nm-form-field">
                                <label>{t("night_market.label_end_time")}</label>
                                <input
                                    type="datetime-local"
                                    value={formatDateForInput(config.endTime)}
                                    onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="nm-actions">
                        <button type="submit" className="btn-primary-nm" disabled={saving}>
                            <SaveIcon />
                            <span>{saving ? t("common.saving") : t("common.save_settings")}</span>
                        </button>
                    </div>
                </form>
            </div>

            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    );
}
