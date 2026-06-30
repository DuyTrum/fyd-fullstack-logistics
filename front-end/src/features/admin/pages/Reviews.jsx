import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { reviewAPI, productAPI, getAssetUrl } from "@shared/utils/api.js";
import { useToast } from "@shared/context/ToastContext";
import { useTranslation } from "react-i18next";
import "../styles/dashboard.css";
import "../styles/pages.css";

// SVG Icons
const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);

const StarIcon = ({ filled }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const XIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const DownloadIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
);

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

const PinIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="8" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <path d="M12 6H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7" />
        <line x1="9" y1="15" x2="20" y2="4" />
        <polyline points="15 4 20 4 20 9" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

function parseImageUrls(imageUrlsStr) {
    if (!imageUrlsStr) return [];
    try {
        if (imageUrlsStr.trim().startsWith("[")) {
            return JSON.parse(imageUrlsStr);
        }
        return imageUrlsStr.split(",").map(url => url.trim().replace(/^["']|["']$/g, ""));
    } catch {
        return [];
    }
}

export default function Reviews() {
    const { t } = useTranslation();
    const { showToast } = useToast();

    // List & Stats Data
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalReviews: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        averageRating: 0
    });

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Advanced Filters State
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // "all", "PENDING", "APPROVED", "REJECTED"
    const [productFilter, setProductFilter] = useState("");
    const [ratingFilter, setRatingFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Bulk selection State
    const [selected, setSelected] = useState([]);

    // Detail Drawer State
    const [selectedReview, setSelectedReview] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [savingReply, setSavingReply] = useState(false);
    const [pinnedReviewIds, setPinnedReviewIds] = useState([]);

    // Lightbox image preview state
    const [lightboxImage, setLightboxImage] = useState(null);
    const [seeding, setSeeding] = useState(false);

    // Fetch initial products for filter
    useEffect(() => {
        const fetchInitialProducts = async () => {
            try {
                const res = await productAPI.getAll({ size: 100 });
                setProducts(res.products || []);
            } catch (error) {
                console.error("Failed to load products for filters:", error);
            }
        };
        fetchInitialProducts();
    }, []);

    // Reload data when page, pageSize, or any filters change
    useEffect(() => {
        loadData();
    }, [page, pageSize, statusFilter, q, productFilter, ratingFilter, startDate, endDate]);

    // Format date string helper
    function formatDate(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        try {
            return d.toLocaleDateString(t("common.locale_tag") || "vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch (e) {
            return d.toLocaleString();
        }
    }

    // Load paginated & filtered reviews from server
    async function loadData() {
        setLoading(true);
        try {
            const params = {
                q,
                status: statusFilter !== "all" ? statusFilter : "",
                rating: ratingFilter ? parseInt(ratingFilter) : undefined,
                productId: productFilter ? parseInt(productFilter) : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                page: page - 1, // backend is 0-indexed
                size: pageSize
            };

            const data = await reviewAPI.getAll(params);
            setReviews(data.reviews || []);
            setTotalPages(data.totalPages || 1);
            setTotalItems(data.totalItems || 0);

            // Server returns global counters for these metrics
            setStats({
                totalReviews: data.totalReviews || 0,
                pendingCount: data.pendingCount || 0,
                approvedCount: data.approvedCount || 0,
                rejectedCount: data.rejectedCount || 0,
                averageRating: data.averageRating || 0
            });
        } catch (error) {
            console.error("Failed to load reviews:", error);
            showToast(t("common.connection_error"), "error");
        } finally {
            setLoading(false);
        }
    }

    // Update single review status
    async function handleUpdateStatus(id, newStatus) {
        try {
            await reviewAPI.updateStatus(id, newStatus);
            showToast(t("common.update_success"));
            
            // Reload reviews list
            await loadData();
            
            // Update selected review in drawer if matches
            if (selectedReview && selectedReview.id === id) {
                setSelectedReview(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            showToast(error.message || t("common.error_occurred"), "error");
        }
    }

    // Delete single review
    async function handleDeleteReview(id) {
        if (!window.confirm(t("reviews.delete_confirm"))) return;
        try {
            await reviewAPI.delete(id);
            showToast(t("reviews.msg_delete_success"));
            setDrawerOpen(false);
            setSelectedReview(null);
            setSelected(prev => prev.filter(item => item !== id));
            await loadData();
        } catch (error) {
            showToast(error.message || t("common.error_occurred"), "error");
        }
    }

    // Submit reply
    async function handleSaveReply() {
        if (!selectedReview) return;
        setSavingReply(true);
        try {
            await reviewAPI.reply(selectedReview.id, replyText);
            showToast(t("reviews.msg_reply_success"));
            
            // Reload details and list
            await loadData();
            setSelectedReview(prev => ({
                ...prev,
                adminReply: replyText,
                adminReplyAt: new Date().toISOString()
            }));
        } catch (error) {
            showToast(error.message || t("common.error_occurred"), "error");
        } finally {
            setSavingReply(false);
        }
    }

    // Seed sample reviews action
    async function handleSeed() {
        setSeeding(true);
        try {
            const data = await reviewAPI.seed();
            if (data.success) {
                showToast(t("reviews.admin.seed_success") || data.message);
                await loadData();
            } else {
                showToast(data.message || t("common.error_occurred"), "error");
            }
        } catch (error) {
            console.error("Failed to seed reviews:", error);
            showToast(t("common.connection_error"), "error");
        } finally {
            setSeeding(false);
        }
    }

    // Toggle pin mock behavior
    function handleTogglePin() {
        if (!selectedReview) return;
        const reviewId = selectedReview.id;
        const isPinned = pinnedReviewIds.includes(reviewId);
        if (isPinned) {
            setPinnedReviewIds(prev => prev.filter(id => id !== reviewId));
            showToast(t("reviews.admin.drawer_btn_pin") + " off");
        } else {
            setPinnedReviewIds(prev => [...prev, reviewId]);
            showToast(t("reviews.admin.drawer_btn_pin") + " on");
        }
    }

    // Bulk selection handlers
    function handleSelectRow(id) {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    }

    function handleSelectAll() {
        if (selected.length === reviews.length) {
            setSelected([]);
        } else {
            setSelected(reviews.map(r => r.id));
        }
    }

    // Bulk Approve API action
    async function handleBulkApprove() {
        if (selected.length === 0) return;
        try {
            await reviewAPI.bulkApprove(selected);
            showToast(t("common.approved_count", { count: selected.length }));
            setSelected([]);
            await loadData();
        } catch (error) {
            showToast(t("common.error_occurred"), "error");
        }
    }

    // Bulk Reject API action
    async function handleBulkReject() {
        if (selected.length === 0) return;
        if (!window.confirm(t("common.confirm_action") || "Xác nhận thực hiện hành động này?")) return;
        try {
            await reviewAPI.bulkReject(selected);
            showToast(t("common.rejected") + ` ${selected.length}`);
            setSelected([]);
            await loadData();
        } catch (error) {
            showToast(t("common.error_occurred"), "error");
        }
    }

    // Export CSV with bilingual encoding
    const handleExportCSV = async () => {
        try {
            // Fetch reviews matching the current filters
            const params = {
                q,
                status: statusFilter !== "all" ? statusFilter : "",
                rating: ratingFilter ? parseInt(ratingFilter) : undefined,
                productId: productFilter ? parseInt(productFilter) : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                page: 0,
                size: 1000
            };
            const data = await reviewAPI.getAll(params);
            const exportData = data.reviews || [];

            if (exportData.length === 0) {
                showToast(t("common.no_data"), "warning");
                return;
            }

            // Headers translation
            const headers = [
                t("reviews.admin.col_date"),
                t("reviews.admin.col_customer"),
                "Mã KH / Cust ID",
                t("reviews.admin.col_product"),
                "SKU",
                t("reviews.admin.col_rating"),
                t("reviews.admin.col_comment"),
                t("reviews.admin.col_status"),
                t("reviews.label_reply_content")
            ];

            // Rows formatting
            const rows = exportData.map(r => [
                formatDate(r.createdAt),
                `"${(r.customerName || "").replace(/"/g, '""')}"`,
                r.customerId,
                `"${(r.productName || "").replace(/"/g, '""')}"`,
                r.productSku,
                r.rating,
                `"${(r.content || "").replace(/"/g, '""')}"`,
                r.status,
                `"${(r.adminReply || "").replace(/"/g, '""')}"`
            ]);

            // Add UTF-8 BOM \uFEFF to preserve Vietnamese characters
            const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `reviews_report_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Export successful!");
        } catch (error) {
            console.error("Export CSV error:", error);
            showToast(t("common.error_occurred"), "error");
        }
    };

    // Open detail drawer for a review
    function handleRowClick(review) {
        setSelectedReview(review);
        setReplyText(review.adminReply || "");
        setDrawerOpen(true);
    }

    function closeDrawer() {
        setDrawerOpen(false);
        setSelectedReview(null);
    }

    const isPinned = selectedReview ? pinnedReviewIds.includes(selectedReview.id) : false;

    // Helper calculate visual pagination range
    const paginationStart = (page - 1) * pageSize + 1;
    const paginationEnd = Math.min(page * pageSize, totalItems);

    return (
        <div className="page-container" style={{ animation: "fadeIn 0.25s ease-out" }}>
            
            {/* Header section */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--admin-text)" }}>{t("reviews.admin.title")}</h1>
                    <p style={{ fontSize: 13, color: "var(--admin-text-muted)", margin: "4px 0 0" }}>
                        {t("reviews.admin.subtitle")}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btnGhost" onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <DownloadIcon /> {t("reviews.admin.export_csv")}
                    </button>
                    {selected.length > 0 && (
                        <>
                            <button
                                className="btnPrimary"
                                style={{ background: "var(--admin-success)", borderColor: "var(--admin-success)", color: "#0a0a0f", display: "flex", alignItems: "center", gap: 6 }}
                                onClick={handleBulkApprove}
                            >
                                <CheckIcon /> {t("reviews.admin.bulk_approve")} ({selected.length})
                            </button>
                            <button
                                className="btnPrimary"
                                style={{ background: "var(--admin-error)", borderColor: "var(--admin-error)", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}
                                onClick={handleBulkReject}
                            >
                                <XIcon /> {t("reviews.admin.bulk_reject")} ({selected.length})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Global statistics overview cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t("reviews.admin.average_rating")}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--admin-text)" }}>
                            {stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"}
                        </span>
                        <span style={{ fontSize: 14, color: "var(--admin-warning)" }}>★</span>
                        <span style={{ fontSize: 12, color: "var(--admin-text-muted)", marginLeft: 6 }}>/ 5.0</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--admin-text-muted)", marginTop: 6 }}>
                        {t("reviews.admin.stat_rating_sub")}
                    </div>
                </div>

                <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t("reviews.admin.total_reviews")}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "var(--admin-text)", marginTop: 8 }}>
                        {stats.totalReviews}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--admin-text-muted)", marginTop: 6 }}>
                        {t("reviews.admin.stat_total_sub")}
                    </div>
                </div>

                <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t("reviews.admin.pending_reviews")}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: stats.pendingCount > 0 ? "var(--admin-warning)" : "var(--admin-text)" }}>
                            {stats.pendingCount}
                        </span>
                        {stats.pendingCount > 0 && (
                            <span style={{ fontSize: 10, background: "var(--admin-warning-bg)", color: "var(--admin-warning)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                NEW
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--admin-text-muted)", marginTop: 6 }}>
                        {t("reviews.admin.stat_pending_sub")}
                    </div>
                </div>

                <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t("reviews.admin.rejected_reviews")}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "var(--admin-text)", marginTop: 8 }}>
                        {stats.rejectedCount}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--admin-text-muted)", marginTop: 6 }}>
                        {t("reviews.admin.stat_rejected_sub")}
                    </div>
                </div>
            </div>

            {/* Filters dashboard */}
            <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* Quick tab filters */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--admin-border)", gap: 16, margin: "-16px -16px 0 -16px", padding: "0 16px" }}>
                    {[
                        { key: "all", label: t("reviews.admin.tab_all"), count: stats.totalReviews },
                        { key: "PENDING", label: t("reviews.admin.tab_pending"), count: stats.pendingCount, icon: <ClockIcon /> },
                        { key: "APPROVED", label: t("reviews.admin.tab_approved"), count: stats.approvedCount, icon: <CheckIcon /> },
                        { key: "REJECTED", label: t("reviews.admin.tab_rejected"), count: stats.rejectedCount, icon: <XIcon /> }
                    ].map((tab) => {
                        const isActive = statusFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setStatusFilter(tab.key);
                                    setPage(1);
                                }}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    borderBottom: isActive ? "2px solid var(--admin-accent)" : "2px solid transparent",
                                    color: isActive ? "var(--admin-text)" : "var(--admin-text-muted)",
                                    padding: "12px 4px",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginBottom: -1,
                                    transition: "all 0.15s ease"
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                                <span style={{
                                    fontSize: 11,
                                    background: isActive ? "rgba(var(--admin-accent-rgb), 0.15)" : "rgba(255, 255, 255, 0.05)",
                                    color: isActive ? "var(--admin-accent)" : "var(--admin-text-muted)",
                                    padding: "2px 6px",
                                    borderRadius: 10
                                }}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Advanced dropdown and input filters */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    
                    {/* Search box */}
                    <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
                        <input
                            className="miniInput"
                            placeholder={t("reviews.admin.search_placeholder")}
                            value={q}
                            onChange={(e) => {
                                setQ(e.target.value);
                                setPage(1);
                            }}
                            style={{ width: "100%", paddingLeft: 36, paddingRight: 12 }}
                        />
                        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5, pointerEvents: "none", display: "flex", alignItems: "center" }}>
                            <SearchIcon />
                        </div>
                    </div>

                    {/* Product Selection */}
                    <select
                        className="miniSelect"
                        value={productFilter}
                        onChange={(e) => {
                            setProductFilter(e.target.value);
                            setPage(1);
                        }}
                        style={{ minWidth: 160, maxWidth: 220 }}
                    >
                        <option value="">{t("reviews.admin.filter_product")}</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                    </select>

                    {/* Rating Select */}
                    <select
                        className="miniSelect"
                        value={ratingFilter}
                        onChange={(e) => {
                            setRatingFilter(e.target.value);
                            setPage(1);
                        }}
                        style={{ minWidth: 140 }}
                    >
                        <option value="">{t("reviews.admin.filter_rating")}</option>
                        <option value="5">★★★★★ 5</option>
                        <option value="4">★★★★☆ 4</option>
                        <option value="3">★★★☆☆ 3</option>
                        <option value="2">★★☆☆☆ 2</option>
                        <option value="1">★☆☆☆☆ 1</option>
                    </select>

                    {/* Date ranges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>{t("reviews.admin.filter_start_date")}:</span>
                        <input
                            type="date"
                            className="miniInput"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPage(1);
                            }}
                            style={{ minWidth: 120, padding: "8px 10px" }}
                        />
                        <span style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>{t("reviews.admin.filter_end_date")}:</span>
                        <input
                            type="date"
                            className="miniInput"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPage(1);
                            }}
                            style={{ minWidth: 120, padding: "8px 10px" }}
                        />
                    </div>

                    {/* Reset button if filters active */}
                    {(q || productFilter || ratingFilter || startDate || endDate) && (
                        <button
                            className="linkBtn"
                            onClick={() => {
                                setQ("");
                                setProductFilter("");
                                setRatingFilter("");
                                setStartDate("");
                                setEndDate("");
                                setPage(1);
                            }}
                            style={{ color: "var(--admin-error)" }}
                        >
                            {t("reviews.admin.filter_clear")}
                        </button>
                    )}
                </div>

                {/* Table list */}
                <div style={{ overflowX: "auto", margin: "0 -16px -16px -16px" }}>
                    <div className="table" style={{ minWidth: 1000, border: "none", borderRadius: 0 }}>
                        
                        {/* Table head */}
                        <div className="tr th" style={{ gridTemplateColumns: "40px 1.5fr 1.8fr 1fr 3fr 1.2fr 1.2fr 100px", padding: "12px 16px" }}>
                            <div>
                                <input
                                    type="checkbox"
                                    checked={reviews.length > 0 && selected.length === reviews.length}
                                    onChange={handleSelectAll}
                                    style={{ cursor: "pointer", width: 15, height: 15 }}
                                />
                            </div>
                            <div>{t("reviews.admin.col_customer")}</div>
                            <div>{t("reviews.admin.col_product")}</div>
                            <div>{t("reviews.admin.col_rating")}</div>
                            <div>{t("reviews.admin.col_comment")}</div>
                            <div>{t("reviews.admin.col_date")}</div>
                            <div>{t("reviews.admin.col_status")}</div>
                            <div style={{ textAlign: "right" }}>{t("reviews.admin.col_action")}</div>
                        </div>

                        {/* Table body */}
                        {loading ? (
                            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--admin-text-muted)" }}>
                                {t("common.loading_data")}...
                            </div>
                        ) : reviews.length === 0 ? (
                            <div style={{ padding: "60px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                                <span style={{ color: "var(--admin-text-muted)", fontSize: 14 }}>{t("common.no_data")}</span>
                                {stats.totalReviews === 0 && (
                                    <button
                                        className="btnPrimary"
                                        onClick={handleSeed}
                                        disabled={seeding}
                                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}
                                    >
                                        {seeding ? t("reviews.admin.seeding") + "..." : t("reviews.admin.seed_data")}
                                    </button>
                                )}
                            </div>
                        ) : (
                            reviews.map((r) => {
                                const isRowSelected = selected.includes(r.id);
                                return (
                                    <div
                                        key={r.id}
                                        className="tr"
                                        style={{
                                            gridTemplateColumns: "40px 1.5fr 1.8fr 1fr 3fr 1.2fr 1.2fr 100px",
                                            padding: "14px 16px",
                                            background: isRowSelected ? "rgba(var(--admin-accent-rgb), 0.05)" : "transparent",
                                            borderLeft: pinnedReviewIds.includes(r.id) ? "3px solid var(--admin-warning)" : "none",
                                            cursor: "pointer"
                                        }}
                                        onClick={() => handleRowClick(r)}
                                    >
                                        {/* Checkbox column */}
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isRowSelected}
                                                onChange={() => handleSelectRow(r.id)}
                                                style={{ cursor: "pointer", width: 15, height: 15 }}
                                            />
                                        </div>

                                        {/* Customer */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: "50%",
                                                background: "var(--admin-accent-gradient)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 700,
                                                fontSize: 12,
                                                color: "#0a0a0f",
                                                flexShrink: 0
                                            }}>
                                                {(r.customerName || "K").charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--admin-text)" }}>{r.customerName}</div>
                                                <div style={{ fontSize: 11, color: "var(--admin-text-muted)" }}>ID: {r.customerId}</div>
                                            </div>
                                        </div>

                                        {/* Product */}
                                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--admin-accent)" }} title={r.productName}>
                                                {r.productName}
                                            </div>
                                            <span style={{ fontSize: 11, fontFamily: "var(--admin-font-mono)", color: "var(--admin-text-muted)" }}>
                                                SKU: {r.productSku}
                                            </span>
                                        </div>

                                        {/* Rating */}
                                        <div>
                                            <div style={{ display: "flex", gap: 2, color: "var(--admin-warning)" }}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <StarIcon key={star} filled={star <= r.rating} />
                                                ))}
                                            </div>
                                            <span style={{ fontSize: 10, color: "var(--admin-text-muted)", marginTop: 2, display: "block" }}>
                                                {r.rating} / 5
                                            </span>
                                        </div>

                                        {/* Review preview */}
                                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }} title={r.content}>
                                            {r.title && (
                                                <span style={{ fontWeight: 700, marginRight: 6, fontSize: 13, color: "var(--admin-text)" }}>
                                                    {r.title}
                                                </span>
                                            )}
                                            <span style={{ fontSize: 13, color: "var(--admin-text)", fontStyle: r.content ? "normal" : "italic" }}>
                                                {r.content ? (r.content.length > 80 ? r.content.slice(0, 80) + "..." : r.content) : `(${t("common.no_data")})`}
                                            </span>
                                            {r.imageUrls && parseImageUrls(r.imageUrls).length > 0 && (
                                                <span style={{
                                                    marginLeft: 8,
                                                    fontSize: 10,
                                                    background: "var(--glass-bg)",
                                                    border: "1px solid var(--admin-border)",
                                                    padding: "1px 6px",
                                                    borderRadius: 4,
                                                    color: "var(--admin-text-muted)"
                                                }}>
                                                    📷 {parseImageUrls(r.imageUrls).length}
                                                </span>
                                            )}
                                            {r.adminReply && (
                                                <div style={{ fontSize: 11, color: "var(--admin-success)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} />
                                                    {t("reviews.admin.replied")}
                                                </div>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <div style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>
                                            {formatDate(r.createdAt)}
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <span className={`pill ${r.status === 'APPROVED' ? 'ok' : r.status === 'REJECTED' ? 'cancel' : 'pending'}`}>
                                                {r.status === 'APPROVED' ? t("reviews.admin.status_approved") : r.status === 'REJECTED' ? t("reviews.admin.status_rejected") : t("reviews.admin.status_pending")}
                                            </span>
                                        </div>

                                        {/* Quick actions */}
                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                            {r.status === 'PENDING' ? (
                                                <>
                                                    <button
                                                        className="linkBtn"
                                                        onClick={() => handleUpdateStatus(r.id, "APPROVED")}
                                                        style={{ color: "var(--admin-success)", padding: "4px 6px" }}
                                                        title={t("reviews.admin.action_approve_tooltip")}
                                                    >
                                                        <CheckIcon />
                                                    </button>
                                                    <button
                                                        className="linkBtn"
                                                        onClick={() => handleUpdateStatus(r.id, "REJECTED")}
                                                        style={{ color: "var(--admin-error)", padding: "4px 6px" }}
                                                        title={t("reviews.admin.action_reject_tooltip")}
                                                    >
                                                        <XIcon />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="linkBtn"
                                                    onClick={() => handleRowClick(r)}
                                                    style={{ color: "var(--admin-accent)", padding: "4px 6px" }}
                                                    title={t("reviews.admin.action_detail_tooltip")}
                                                >
                                                    <EyeIcon />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Table Footer / Pagination */}
                {totalItems > 0 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 12,
                        borderTop: "1px solid var(--admin-border)",
                        flexWrap: "wrap",
                        gap: 12
                    }}>
                        <div style={{ fontSize: 13, color: "var(--admin-text-muted)" }}>
                            {t("reviews.admin.display_count", { start: paginationStart, end: paginationEnd, total: totalItems })}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            
                            {/* Page size dropdown */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>{t("reviews.admin.rows_per_page")}</span>
                                <select
                                    className="miniSelect"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(parseInt(e.target.value));
                                        setPage(1);
                                    }}
                                    style={{ padding: "6px 28px 6px 12px", minWidth: 80 }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>

                            {/* Chevron controls */}
                            <div style={{ display: "flex", gap: 4 }}>
                                <button
                                    className="btnGhost"
                                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                    disabled={page === 1}
                                    style={{ padding: "6px 10px", minWidth: 32 }}
                                    title={t("reviews.admin.prev_page")}
                                >
                                    <ChevronLeftIcon />
                                </button>
                                
                                <span style={{ fontSize: 13, color: "var(--admin-text)", display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 600 }}>
                                    {t("reviews.admin.page_info", { current: page, total: totalPages })}
                                </span>

                                <button
                                    className="btnGhost"
                                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={page === totalPages}
                                    style={{ padding: "6px 10px", minWidth: 32 }}
                                    title={t("reviews.admin.next_page")}
                                >
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Slide-out side drawer detail moderator */}
            {drawerOpen && selectedReview && createPortal(
                <div className="drawerBackdrop" onClick={closeDrawer}>
                    <div className="drawer drawer-enhanced" onClick={(e) => e.stopPropagation()} style={{ width: 520 }}>
                        
                        {/* Drawer header */}
                        <div className="drawer-header-enhanced" style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--admin-border)", position: "sticky", top: 0, background: "var(--admin-surface)", zIndex: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--admin-text)" }}>{t("reviews.admin.drawer_title")}</div>
                                <button
                                    onClick={closeDrawer}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--admin-text-muted)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        transition: "all 0.2s"
                                    }}
                                    className="btnGhost"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: "var(--admin-text-muted)" }}>
                                {t("reviews.admin.drawer_subtitle")} <strong>#{selectedReview.id}</strong>
                            </div>
                        </div>

                        {/* Drawer body container */}
                        <div style={{ padding: "20px 24px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
                            
                            {/* Review status indicator bar */}
                            <div style={{
                                padding: "12px 16px",
                                borderRadius: "var(--admin-radius-md)",
                                background: selectedReview.status === 'APPROVED' ? "rgba(var(--admin-success-rgb), 0.05)" : selectedReview.status === 'REJECTED' ? "rgba(var(--admin-error-rgb), 0.05)" : "rgba(var(--admin-warning-rgb), 0.05)",
                                border: `1px solid ${selectedReview.status === 'APPROVED' ? "rgba(var(--admin-success-rgb), 0.2)" : selectedReview.status === 'REJECTED' ? "rgba(var(--admin-error-rgb), 0.2)" : "rgba(var(--admin-warning-rgb), 0.2)"}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-text-muted)" }}>{t("reviews.admin.drawer_current_status")}</span>
                                <span className={`pill ${selectedReview.status === 'APPROVED' ? 'ok' : selectedReview.status === 'REJECTED' ? 'cancel' : 'pending'}`}>
                                    {selectedReview.status === 'APPROVED' ? t("reviews.admin.status_approved") : selectedReview.status === 'REJECTED' ? t("reviews.admin.status_rejected") : t("reviews.admin.status_pending")}
                                </span>
                            </div>

                            {/* Customer information card */}
                            <div className="drawer-card">
                                <div className="drawer-card-header">
                                    {t("reviews.admin.drawer_cust_info")}
                                </div>
                                <div className="drawer-customer-info">
                                    <div className="customer-avatar" style={{ background: "var(--admin-accent-gradient)", color: "#0a0a0f", width: 44, height: 44, borderRadius: "50%", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {(selectedReview.customerName || "K").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="customer-details">
                                        <div className="customer-name" style={{ fontSize: 14, fontWeight: 700 }}>
                                            {selectedReview.customerName}
                                        </div>
                                        <div className="customer-contact" style={{ fontSize: 12, color: "var(--admin-text-muted)", marginTop: 2 }}>
                                            <span>{t("reviews.admin.drawer_cust_id")} #{selectedReview.customerId}</span>
                                            {selectedReview.isVerifiedPurchase && (
                                                <span style={{ color: "var(--admin-success)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                                                    <CheckIcon /> {t("reviews.admin.drawer_verified")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Product Information card */}
                            <div className="drawer-card">
                                <div className="drawer-card-header">
                                    {t("reviews.admin.drawer_prod_info")}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--admin-accent)" }}>
                                        {selectedReview.productName}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--admin-text-muted)", marginTop: 4, fontFamily: "var(--admin-font-mono)" }}>
                                        SKU: {selectedReview.productSku} • ID: {selectedReview.productId}
                                    </div>
                                </div>
                            </div>

                            {/* Rating comment comment card */}
                            <div className="drawer-card">
                                <div className="drawer-card-header">
                                    {t("reviews.admin.col_comment")}
                                </div>
                                
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                    <div style={{ display: "flex", gap: 3, color: "var(--admin-warning)" }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <StarIcon key={star} filled={star <= selectedReview.rating} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-text)" }}>
                                        ({selectedReview.rating} / 5)
                                    </span>
                                    <span style={{ fontSize: 11, color: "var(--admin-text-muted)", marginLeft: "auto" }}>
                                        {t("reviews.admin.drawer_date_created")} {formatDate(selectedReview.createdAt)}
                                    </span>
                                </div>

                                {selectedReview.title && (
                                    <div style={{ fontWeight: 700, color: "var(--admin-text)", fontSize: 13, marginBottom: 8 }}>
                                        {selectedReview.title}
                                    </div>
                                )}

                                <div style={{
                                    fontSize: 13,
                                    color: "var(--admin-text)",
                                    lineHeight: 1.6,
                                    whiteSpace: "pre-wrap",
                                    background: "rgba(255, 255, 255, 0.01)",
                                    border: "1px solid var(--admin-border)",
                                    borderRadius: "var(--admin-radius-sm)",
                                    padding: 12,
                                    fontStyle: selectedReview.content ? "normal" : "italic"
                                }}>
                                    {selectedReview.content || `(${t("common.no_data")})`}
                                </div>

                                {/* Attachment images list inside drawer */}
                                {selectedReview.imageUrls && parseImageUrls(selectedReview.imageUrls).length > 0 && (
                                    <div style={{ marginTop: 14 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--admin-text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                                            📷 {parseImageUrls(selectedReview.imageUrls).length}
                                        </div>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            {parseImageUrls(selectedReview.imageUrls).map((url, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        width: 76,
                                                        height: 76,
                                                        borderRadius: 6,
                                                        overflow: "hidden",
                                                        border: "1px solid var(--admin-border)",
                                                        cursor: "pointer",
                                                        transition: "transform 0.2s"
                                                    }}
                                                    onClick={() => setLightboxImage(getAssetUrl(url))}
                                                >
                                                    <img
                                                        src={getAssetUrl(url)}
                                                        alt="Review thumbnail"
                                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Helpful count info */}
                                <div style={{ marginTop: 12, fontSize: 12, color: "var(--admin-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                    <span>{t("reviews.admin.drawer_helpful_stats")}</span>
                                    <strong style={{ color: "var(--admin-text)" }}>{t("reviews.admin.drawer_helpful_votes", { count: selectedReview.helpfulCount || 0 })}</strong>
                                </div>
                            </div>

                            {/* Response content details card */}
                            <div className="drawer-card">
                                <div className="drawer-card-header">
                                    {t("reviews.admin.drawer_admin_reply")}
                                </div>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={t("reviews.admin.drawer_reply_placeholder")}
                                    rows={4}
                                    style={{
                                        width: "100%",
                                        background: "var(--glass-bg)",
                                        border: "1px solid var(--admin-border)",
                                        borderRadius: "var(--admin-radius-md)",
                                        color: "var(--admin-text)",
                                        padding: "10px 12px",
                                        fontFamily: "inherit",
                                        fontSize: 13,
                                        resize: "vertical",
                                        outline: "none"
                                    }}
                                />
                                {selectedReview.adminReplyAt && (
                                    <div style={{ fontSize: 11, color: "var(--admin-text-muted)", marginTop: 6 }}>
                                        {t("reviews.admin.drawer_reply_last")} {formatDate(selectedReview.adminReplyAt)}
                                    </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                                    <button
                                        className="btnPrimary"
                                        onClick={handleSaveReply}
                                        disabled={savingReply || !replyText.trim()}
                                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                                    >
                                        <PinIcon /> {savingReply ? t("common.saving") + "..." : t("reviews.admin.drawer_btn_save_reply")}
                                    </button>
                                </div>
                            </div>

                            {/* Moderation actions section grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                                {selectedReview.status === 'PENDING' ? (
                                    <>
                                        <button
                                            className="btnPrimary"
                                            style={{ background: "var(--admin-success)", borderColor: "var(--admin-success)", color: "#0a0a0f" }}
                                            onClick={() => handleUpdateStatus(selectedReview.id, "APPROVED")}
                                        >
                                            {t("reviews.admin.drawer_btn_approve")}
                                        </button>
                                        <button
                                            className="btnGhost"
                                            style={{ color: "var(--admin-error)", borderColor: "var(--admin-error)" }}
                                            onClick={() => handleUpdateStatus(selectedReview.id, "REJECTED")}
                                        >
                                            {t("reviews.admin.drawer_btn_reject")}
                                        </button>
                                    </>
                                ) : selectedReview.status === 'APPROVED' ? (
                                    <button
                                        className="btnGhost"
                                        style={{ color: "var(--admin-error)", borderColor: "var(--admin-error)" }}
                                        onClick={() => handleUpdateStatus(selectedReview.id, "REJECTED")}
                                    >
                                        {t("reviews.admin.drawer_btn_hide")}
                                    </button>
                                ) : (
                                    <button
                                        className="btnGhost"
                                        style={{ color: "var(--admin-success)", borderColor: "var(--admin-success)" }}
                                        onClick={() => handleUpdateStatus(selectedReview.id, "APPROVED")}
                                    >
                                        {t("reviews.admin.drawer_btn_restore")}
                                    </button>
                                )}

                                {/* Pinned / Unpinned mock */}
                                <button
                                    className="btnGhost"
                                    onClick={handleTogglePin}
                                    style={{ color: isPinned ? "var(--admin-warning)" : "var(--admin-text)" }}
                                >
                                    {isPinned ? t("reviews.admin.drawer_btn_unpin") : t("reviews.admin.drawer_btn_pin")}
                                </button>

                                {/* Delete button */}
                                <button
                                    className="btnGhost"
                                    onClick={() => handleDeleteReview(selectedReview.id)}
                                    style={{ color: "var(--admin-error)", borderColor: "var(--admin-error)", gridColumn: "span 2", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                >
                                    <TrashIcon /> {t("reviews.admin.drawer_btn_delete")}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Fullscreen Lightbox Modal */}
            {lightboxImage && createPortal(
                <div
                    className="modalBackdrop"
                    style={{ zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", animation: "fadeIn 0.2s" }}
                    onClick={() => setLightboxImage(null)}
                >
                    <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={lightboxImage}
                            alt="Phóng to ảnh đánh giá"
                            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
                        />
                        <button
                            onClick={() => setLightboxImage(null)}
                            style={{
                                position: "absolute",
                                top: -40,
                                right: 0,
                                background: "transparent",
                                border: "none",
                                color: "#fff",
                                fontSize: 32,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 36,
                                height: 36
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}
