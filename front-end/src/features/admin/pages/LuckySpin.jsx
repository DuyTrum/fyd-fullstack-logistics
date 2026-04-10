import { useState, useEffect, useCallback } from "react";
import { luckySpinAdminAPI, formatVND } from "../../../shared/utils/api.js";
import Toast from "../../../shared/components/Toast";
import "../styles/lucky-spin-admin.css";
import { useTranslation } from "react-i18next";

// SVG Icons
const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

const GiftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
);

const WarningIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const SaveIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

const InfoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
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

export default function LuckySpin() {
    const { t } = useTranslation();
    const [program, setProgram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("program");
    const [fetchError, setFetchError] = useState(null);

    // Toast state
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const showToast = useCallback((message, type = "success") => {
        setToast({ show: true, message, type });
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const data = await luckySpinAdminAPI.getAdminInfo();
            console.log("Lucky Spin Admin data:", data);
            setProgram(data);
        } catch (error) {
            console.error("Failed to fetch Lucky Spin info:", error);
            setFetchError(`${error.status || 'UNKNOWN'}: ${error.message}`);
            showToast(t("lucky_spin.msg_load_error"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleProgramUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await luckySpinAdminAPI.updateProgram(program);
            showToast(t("lucky_spin.msg_update_program_success"));
        } catch (error) {
            showToast(t("common.update_error") + ": " + error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRewardUpdate = async (reward) => {
        setSaving(true);
        try {
            await luckySpinAdminAPI.updateReward(reward.id, reward);
            showToast(t("lucky_spin.msg_update_reward_success", { name: reward.name }));
            fetchData();
        } catch (error) {
            showToast(t("common.update_error") + ": " + error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const updateRewardLocal = (id, field, value) => {
        setProgram(prev => ({
            ...prev,
            rewards: prev.rewards.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    };

    if (loading) return (
        <div className="lucky-spin-admin-page page-container">
            <div className="loading-state">{t("common.loading_data")}</div>
        </div>
    );

    if (!program) return (
        <div className="lucky-spin-admin-page page-container">
            <div className="empty-state">
                {t("lucky_spin.empty_config")}
                {fetchError && <p style={{ color: '#ef4444', marginTop: '8px', fontSize: '13px' }}>Error: {fetchError}</p>}
            </div>
        </div>
    );

    const totalProbability = program.rewards
        .filter(r => r.isActive)
        .reduce((sum, r) => sum + Number(r.baseProbability), 0);

    const isProbValid = Math.abs(totalProbability - 1) < 0.001;

    return (
        <div className="lucky-spin-admin-page page-container">
            {/* Tabs */}
            <div className="lucky-tabs">
                <button
                    className={`lucky-tab ${activeTab === "program" ? "active" : ""}`}
                    onClick={() => setActiveTab("program")}
                >
                    <SettingsIcon />
                    {t("lucky_spin.tab_general")}
                </button>
                <button
                    className={`lucky-tab ${activeTab === "rewards" ? "active" : ""}`}
                    onClick={() => setActiveTab("rewards")}
                >
                    <GiftIcon />
                    {t("lucky_spin.tab_rewards")}
                </button>
            </div>

            {/* Content */}
            <div className="lucky-content">
                {activeTab === "program" && (
                    <form onSubmit={handleProgramUpdate} className="lucky-form">
                        <div className="form-section">
                            {/* General Info */}
                            <div className="section-group">
                                <h4 className="section-title">
                                    <InfoIcon />
                                    {t("products.section_basic")}
                                </h4>
                                <div className="form-row">
                                    <div className="form-field full">
                                        <label>{t("lucky_spin.label_program_title")}</label>
                                        <input
                                            type="text"
                                            value={program.name}
                                            onChange={(e) => setProgram({ ...program, name: e.target.value })}
                                            placeholder={t("lucky_spin.placeholder_title")}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-field full">
                                        <label>{t("lucky_spin.label_description")}</label>
                                        <textarea
                                            value={program.description}
                                            onChange={(e) => setProgram({ ...program, description: e.target.value })}
                                            rows="3"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Logic Config */}
                            <div className="section-group">
                                <h4 className="section-title">
                                    <SettingsIcon />
                                    {t("common.settings")}
                                </h4>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label>{t("lucky_spin.label_daily_free")}</label>
                                        <input
                                            type="number"
                                            value={program.dailyFreeSpins}
                                            onChange={(e) => setProgram({ ...program, dailyFreeSpins: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>{t("lucky_spin.label_points_per")}</label>
                                        <input
                                            type="number"
                                            value={program.pointsPerSpin}
                                            onChange={(e) => setProgram({ ...program, pointsPerSpin: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Schedule */}
                            <div className="section-group">
                                <h4 className="section-title">
                                    <CalendarIcon />
                                    {t("promotions.col_start")} & {t("promotions.col_end")}
                                </h4>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label>{t("promotions.col_start")}</label>
                                        <input
                                            type="datetime-local"
                                            value={program.startDate ? program.startDate.substring(0, 16) : ""}
                                            onChange={(e) => setProgram({ ...program, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>{t("promotions.col_end")}</label>
                                        <input
                                            type="datetime-local"
                                            value={program.endDate ? program.endDate.substring(0, 16) : ""}
                                            onChange={(e) => setProgram({ ...program, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    className="toggle-input"
                                    checked={program.isActive}
                                    onChange={(e) => setProgram({ ...program, isActive: e.target.checked })}
                                />
                                <span className="toggle-label">{t("lucky_spin.label_activate")}</span>
                            </label>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary-lucky" disabled={saving}>
                                <SaveIcon />
                                <span>{saving ? t("common.saving") : t("common.save_settings")}</span>
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === "rewards" && (
                    <div className="rewards-section">
                        {/* Probability Indicator */}
                        <div className={`prob-indicator ${isProbValid ? "valid" : "invalid"}`}>
                            {isProbValid ? <CheckIcon /> : <WarningIcon />}
                            <span>{t("lucky_spin.label_total_prob")}: <strong>{(totalProbability * 100).toFixed(1)}%</strong></span>
                            {!isProbValid && <span className="prob-hint">{t("lucky_spin.msg_prob_warning")}</span>}
                        </div>

                        {/* Simple Table */}
                        <div className="rewards-table-wrap">
                            <table className="rewards-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 80 }}>#</th>
                                        <th>{t("lucky_spin.col_reward_name")}</th>
                                        <th style={{ width: 120 }}>{t("common.category")}</th>
                                        <th style={{ width: 150 }}>{t("common.value")}</th>
                                        <th style={{ width: 120 }}>{t("lucky_spin.col_prob")}</th>
                                        <th style={{ width: 80 }}>{t("common.status")}</th>
                                        <th style={{ width: 80 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {program.rewards.map((reward) => (
                                        <tr key={reward.id} className={!reward.isActive ? "inactive-row" : ""}>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="table-input-mini"
                                                    value={reward.sortOrder}
                                                    onChange={(e) => updateRewardLocal(reward.id, "sortOrder", parseInt(e.target.value))}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="table-input"
                                                    value={reward.name}
                                                    onChange={(e) => updateRewardLocal(reward.id, "name", e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <span className={`type-badge ${reward.rewardType.toLowerCase()}`}>
                                                    {reward.rewardType === 'PERCENT' ? '%' :
                                                        reward.rewardType === 'FIXED' ? 'VND' : '-'}
                                                </span>
                                            </td>
                                            <td className="value-cell">
                                                {reward.rewardType === 'PERCENT'
                                                    ? `${reward.rewardValue}%`
                                                    : reward.rewardType === 'FIXED'
                                                        ? formatVND(reward.rewardValue)
                                                        : '-'}
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="table-input-mini"
                                                    step="0.01"
                                                    min="0"
                                                    max="1"
                                                    value={reward.baseProbability}
                                                    onChange={(e) => updateRewardLocal(reward.id, "baseProbability", parseFloat(e.target.value))}
                                                />
                                            </td>
                                            <td>
                                                <label className="toggle-mini">
                                                    <input
                                                        type="checkbox"
                                                        checked={reward.isActive}
                                                        onChange={(e) => updateRewardLocal(reward.id, "isActive", e.target.checked)}
                                                    />
                                                    <span className="toggle-slider-mini"></span>
                                                </label>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-table-save"
                                                    onClick={() => handleRewardUpdate(reward)}
                                                    disabled={saving}
                                                >
                                                    <SaveIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
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
