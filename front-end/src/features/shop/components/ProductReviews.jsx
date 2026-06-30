import { useState, useEffect, useRef } from "react";
import { reviewAPI, getAssetUrl, BASE_URL } from "@shared/utils/api.js";
import { getCustomerSession } from "@shared/utils/customerSession.js";
import { useTranslation } from "react-i18next";
import "./ProductReviews.css";

// Star rating display helper
function StarRating({ rating, size = 14 }) {
    return (
        <div className="star-rating" style={{ gap: 2, display: "inline-flex", alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill={star <= rating ? "#f59e0b" : "none"}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
}

// Interactive star rating for form
function StarInput({ value, onChange }) {
    const [hover, setHover] = useState(0);
    const { t } = useTranslation();

    return (
        <div className="star-input-container">
            <div className="star-input">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        className={star <= (hover || value) ? "active" : ""}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill={star <= (hover || value) ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </button>
                ))}
            </div>
            <span className="rating-label">
                {value === 1 && t("reviews.rating_1")}
                {value === 2 && t("reviews.rating_2")}
                {value === 3 && t("reviews.rating_3")}
                {value === 4 && t("reviews.rating_4")}
                {value === 5 && t("reviews.rating_5")}
            </span>
        </div>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default function ProductReviews({ productId, onLoginRequired }) {
    const { t } = useTranslation();
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, breakdown: {}, withPhotosCount: 0, allImages: [] });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Pagination & Filters State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedFilter, setSelectedFilter] = useState("all"); // "all", 5, 4, 3, 2, 1, "photos"
    const [selectedSort, setSelectedSort] = useState("newest"); // "newest", "highest", "lowest", "helpful"
    const [votedHelpful, setVotedHelpful] = useState(() => {
        try {
            const saved = localStorage.getItem(`voted_helpful_${productId}`);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }); // Track reviews voted in current session
    
    // Form State
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ rating: 5, title: "", content: "" });
    const [reviewImages, setReviewImages] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [eligibility, setEligibility] = useState({ canReview: false, alreadyReviewed: false, hasPurchased: false });
    const [lightboxImage, setLightboxImage] = useState(null);

    // Fetch initial page when productId, filter, or sort changes
    useEffect(() => {
        setPage(1);
        loadReviews(1, true);
    }, [productId, selectedFilter, selectedSort]);

    // Load reviews
    async function loadReviews(pageNum, isReset = false) {
        if (pageNum > 1) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const session = getCustomerSession();
            const customerId = session?.customer?.id;

            const ratingParam = (selectedFilter === "all" || selectedFilter === "photos") ? undefined : parseInt(selectedFilter);
            const hasPhotosParam = selectedFilter === "photos" ? true : undefined;

            const data = await reviewAPI.getProductReviews(productId, {
                customerId: customerId || undefined,
                page: pageNum - 1, // 0-based in backend
                size: 5,
                rating: ratingParam,
                hasPhotos: hasPhotosParam,
                sort: selectedSort
            });

            if (isReset) {
                setReviews(data.reviews || []);
            } else {
                setReviews(prev => [...prev, ...(data.reviews || [])]);
            }

            setTotalItems(data.totalItems || 0);
            setTotalPages(data.totalPages || 1);

            // Set aggregate stats (always computed across all approved reviews)
            setStats({
                avgRating: data.averageRating || 0,
                totalReviews: data.totalReviews || 0,
                breakdown: data.ratingDistribution || {},
                withPhotosCount: data.withPhotosCount || 0,
                allImages: data.allImages || []
            });

            if (customerId && data.canReview !== undefined) {
                setEligibility({
                    canReview: data.canReview,
                    alreadyReviewed: data.alreadyReviewed,
                    hasPurchased: data.hasPurchased
                });
            }
        } catch (error) {
            console.error("Failed to load reviews:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    // Load next page
    const handleLoadMore = () => {
        if (page < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadReviews(nextPage, false);
        }
    };

    function handleWriteReview() {
        const session = getCustomerSession();
        if (!session?.customer) {
            onLoginRequired?.();
            return;
        }

        if (!eligibility.hasPurchased) {
            setSubmitError(t("reviews.error_not_purchased"));
            return;
        }

        if (eligibility.alreadyReviewed) {
            setSubmitError(t("reviews.error_already_reviewed"));
            return;
        }

        setShowForm(true);
        setSubmitSuccess(false);
        setSubmitError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (formData.rating < 1) {
            setSubmitError(t("reviews.error_select_stars"));
            return;
        }

        const session = getCustomerSession();
        if (!session?.customer) {
            onLoginRequired?.();
            return;
        }

        setSubmitting(true);
        setSubmitError("");

        try {
            const imageUrlsJson = reviewImages.length > 0 ? JSON.stringify(reviewImages) : null;

            await reviewAPI.create({
                productId: parseInt(productId),
                customerId: session.customer.id,
                rating: formData.rating,
                title: formData.title,
                content: formData.content,
                imageUrls: imageUrlsJson,
            });

            setSubmitSuccess(true);
            setShowForm(false);
            setFormData({ rating: 5, title: "", content: "" });
            setReviewImages([]);
            setEligibility(prev => ({ ...prev, canReview: false, alreadyReviewed: true }));
        } catch (error) {
            setSubmitError(error.message || t("reviews.error_submit_failed"));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleImageUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        if (reviewImages.length + files.length > 5) {
            setSubmitError(t("reviews.error_max_images"));
            return;
        }

        setUploadingImages(true);
        setSubmitError("");

        try {
            const uploadPromises = files.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch(`${BASE_URL}/api/upload`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("customer_token")}`,
                    },
                    body: formData,
                });

                if (!res.ok) throw new Error("Upload failed");
                const data = await res.json();
                return data.url;
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            setReviewImages(prev => [...prev, ...uploadedUrls]);
        } catch (error) {
            setSubmitError(t("reviews.error_upload_failed"));
        } finally {
            setUploadingImages(false);
        }
    }

    function removeImage(index) {
        setReviewImages(prev => prev.filter((_, i) => i !== index));
    }

    function parseImageUrls(imageUrlsStr) {
        if (!imageUrlsStr) return [];
        try {
            return JSON.parse(imageUrlsStr);
        } catch {
            return [];
        }
    }

    const handleHelpfulToggle = async (reviewId, isCurrentlyVoted) => {
        try {
            if (isCurrentlyVoted) {
                await reviewAPI.unvoteHelpful(reviewId);
                setVotedHelpful(prev => {
                    const next = prev.filter(id => id !== reviewId);
                    try {
                        localStorage.setItem(`voted_helpful_${productId}`, JSON.stringify(next));
                    } catch (e) {
                        console.error(e);
                    }
                    return next;
                });
                setReviews(prev => prev.map(r => {
                    if (r.id === reviewId) {
                        return { ...r, helpfulCount: Math.max(0, (r.helpfulCount || 0) - 1) };
                    }
                    return r;
                }));
            } else {
                await reviewAPI.voteHelpful(reviewId);
                setVotedHelpful(prev => {
                    const next = [...prev, reviewId];
                    try {
                        localStorage.setItem(`voted_helpful_${productId}`, JSON.stringify(next));
                    } catch (e) {
                        console.error(e);
                    }
                    return next;
                });
                setReviews(prev => prev.map(r => {
                    if (r.id === reviewId) {
                        return { ...r, helpfulCount: (r.helpfulCount || 0) + 1 };
                    }
                    return r;
                }));
            }
        } catch (error) {
            console.error("Failed to toggle helpful vote:", error);
        }
    };

    const session = getCustomerSession();
    const isLoggedIn = !!session?.customer;

    return (
        <div className="product-reviews-section">
            <div className="reviews-header">
                <h3>{t("reviews.title")}</h3>
                {(!isLoggedIn || eligibility.canReview) && (
                    <button className="write-review-btn" onClick={handleWriteReview}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {t("reviews.write_btn")}
                    </button>
                )}
            </div>

            {isLoggedIn && !eligibility.canReview && !showForm && (
                <div className="review-eligibility-info">
                    {eligibility.alreadyReviewed ? (
                        <span>{t("reviews.cannot_review_already")}</span>
                    ) : !eligibility.hasPurchased ? (
                        <span>{t("reviews.cannot_review_not_purchased")}</span>
                    ) : null}
                </div>
            )}

            {submitSuccess && (
                <div className="review-form-success-banner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: 8 }}>
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t("reviews.submit_success_banner")}
                </div>
            )}

            {showForm && (
                <form className="review-submit-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label>{t("reviews.form_quality")}</label>
                        <StarInput value={formData.rating} onChange={(v) => setFormData({ ...formData, rating: v })} />
                    </div>

                    <div className="form-row">
                        <label>{t("reviews.form_title")}</label>
                        <input
                            type="text"
                            placeholder={t("reviews.form_title_placeholder")}
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            maxLength={100}
                        />
                    </div>

                    <div className="form-row">
                        <label>{t("reviews.form_content")}</label>
                        <textarea
                            placeholder={t("reviews.form_content_placeholder")}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={4}
                        />
                    </div>

                    <div className="form-row">
                        <label>{t("reviews.form_photos")}</label>
                        <div className="form-image-uploader">
                            {reviewImages.map((url, index) => (
                                <div key={index} className="uploaded-thumb-preview">
                                    <img src={getAssetUrl(url)} alt="Review preview" />
                                    <button type="button" className="remove-thumb-btn" onClick={() => removeImage(index)}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {reviewImages.length < 5 && (
                                <label className="upload-trigger-btn">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        disabled={uploadingImages}
                                        style={{ display: "none" }}
                                    />
                                    {uploadingImages ? (
                                        <span className="spinner-text">{t("reviews.form_uploading")}</span>
                                    ) : (
                                        <>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <span className="upload-label-text">{t("reviews.form_upload_btn")}</span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>

                    {submitError && <div className="form-submit-error-banner">{submitError}</div>}

                    <div className="form-submit-actions">
                        <button type="button" className="form-btn-cancel" onClick={() => { setShowForm(false); setReviewImages([]); }}>
                            {t("reviews.form_cancel")}
                        </button>
                        <button type="submit" className="form-btn-submit" disabled={submitting || uploadingImages}>
                            {submitting ? t("reviews.form_submitting") : t("reviews.form_submit")}
                        </button>
                    </div>
                </form>
            )}

            {/* Premium Photos Gallery */}
            {stats.allImages && stats.allImages.length > 0 && (
                <div className="customer-gallery-section">
                    <h4 className="gallery-section-title">{t("reviews.customer_photos_title", { count: stats.allImages.length })}</h4>
                    <div className="gallery-row-scroll">
                        {stats.allImages.map((imgUrl, idx) => (
                            <div key={idx} className="gallery-thumb-wrapper" onClick={() => setLightboxImage(getAssetUrl(imgUrl))}>
                                <img src={getAssetUrl(imgUrl)} alt="Customer review feedback" className="gallery-thumb-img" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Statistics Card */}
            {stats.totalReviews > 0 ? (
                <div className="reviews-summary-card">
                    <div className="score-summary-col">
                        <span className="average-score">{stats.avgRating.toFixed(1)}</span>
                        <div className="stars-wrapper">
                            <StarRating rating={Math.round(stats.avgRating)} size={18} />
                        </div>
                        <span className="total-reviews-count">{stats.totalReviews} {t("common.reviews")?.toLowerCase()}</span>
                    </div>

                    <div className="distribution-chart-col">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = stats.breakdown[star] || 0;
                            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                            return (
                                <div key={star} className="distribution-row">
                                    <span className="star-label-text">{star}★</span>
                                    <div className="distribution-bar-track">
                                        <div className="distribution-bar-fill" style={{ width: `${percentage}%` }} />
                                    </div>
                                    <span className="distribution-count-text">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="no-reviews-state-card">
                    <p className="primary-text">{t("reviews.no_reviews")}</p>
                    <p className="secondary-text">{t("reviews.no_reviews_sub")}</p>
                </div>
            )}

            {/* Filters and Sorting Controls */}
            {stats.totalReviews > 0 && (
                <div className="filters-and-sorting-controls">
                    <div className="horizontal-filter-chips">
                        <button
                            className={`filter-chip ${selectedFilter === "all" ? "active" : ""}`}
                            onClick={() => setSelectedFilter("all")}
                        >
                            {t("reviews.filter_all", { count: stats.totalReviews })}
                        </button>
                        {[5, 4, 3, 2, 1].map((star) => (
                            <button
                                key={star}
                                className={`filter-chip ${parseInt(selectedFilter) === star ? "active" : ""}`}
                                onClick={() => setSelectedFilter(String(star))}
                            >
                                {t("reviews.filter_stars", { count: star, total: stats.breakdown[star] || 0 })}
                            </button>
                        ))}
                        <button
                            className={`filter-chip ${selectedFilter === "photos" ? "active" : ""}`}
                            onClick={() => setSelectedFilter("photos")}
                        >
                            {t("reviews.filter_photos", { count: stats.withPhotosCount })}
                        </button>
                    </div>

                    <div className="sorting-dropdown-wrapper">
                        <select
                            className="sorting-select-dropdown"
                            value={selectedSort}
                            onChange={(e) => setSelectedSort(e.target.value)}
                        >
                            <option value="newest">{t("reviews.sort_newest")}</option>
                            <option value="highest">{t("reviews.sort_highest")}</option>
                            <option value="lowest">{t("reviews.sort_lowest")}</option>
                            <option value="helpful">{t("reviews.sort_helpful")}</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Paginated Reviews List */}
            {reviews.length > 0 && (
                <div className="reviews-list-container">
                    {reviews.map((review) => {
                        const parsedImages = parseImageUrls(review.imageUrls);
                        const hasVoted = votedHelpful.includes(review.id);
                        return (
                            <div key={review.id} className="review-card-item">
                                <div className="review-card-header">
                                    <div className="reviewer-profile">
                                        <div className="reviewer-initials-avatar">
                                            {(review.customerName || "K").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="reviewer-meta-info">
                                            <div className="name-and-verified-row">
                                                <span className="reviewer-full-name">{review.customerName}</span>
                                                {review.isVerifiedPurchase && (
                                                    <span className="buyer-verified-badge">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        {t("reviews.verified_purchase")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="rating-and-date-row">
                                                <StarRating rating={review.rating} size={13} />
                                                <span className="dot-divider">•</span>
                                                <span className="formatted-date">{formatDate(review.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="review-card-body">
                                    {review.title && <h5 className="review-card-heading-title">{review.title}</h5>}
                                    <p className="review-card-content-text">{review.content || t("reviews.no_comment")}</p>

                                    {/* Uploaded Photos Grid */}
                                    {parsedImages.length > 0 && (
                                        <div className="review-card-photos-grid">
                                            {parsedImages.map((url, idx) => (
                                                <div key={idx} className="review-photo-item" onClick={() => setLightboxImage(getAssetUrl(url))}>
                                                    <img src={getAssetUrl(url)} alt={`Hình ảnh đánh giá ${idx + 1}`} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Helpful Button and Moderation Replies */}
                                <div className="review-card-footer">
                                    <button
                                        className={`helpful-vote-btn ${hasVoted ? "voted" : ""}`}
                                        onClick={() => handleHelpfulToggle(review.id, hasVoted)}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                        </svg>
                                        <span>{hasVoted ? t("reviews.helpful_voted") : t("reviews.helpful_vote")} ({review.helpfulCount || 0})</span>
                                    </button>
                                </div>

                                {/* Shop Response reply */}
                                {review.adminReply && (
                                    <div className="shop-reply-message-box">
                                        <div className="reply-header-info">
                                            <span className="shop-badge-label">{t("reviews.shop_reply")}</span>
                                            <span className="reply-date-info">{formatDate(review.adminReplyAt)}</span>
                                        </div>
                                        <p className="reply-message-text">{review.adminReply}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Load More Button and UX state */}
            {reviews.length > 0 && (
                <div className="load-more-section-footer">
                    <span className="display-count-status-label">
                        {t("reviews.display_status", { current: reviews.length, total: totalItems })}
                    </span>
                    {page < totalPages && (
                        <button
                            className="load-more-action-btn"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? t("reviews.loading_more") : t("reviews.load_more")}
                        </button>
                    )}
                </div>
            )}

            {/* Image Full Size Lightbox */}
            {lightboxImage && (
                <div className="review-fullscreen-lightbox-overlay" onClick={() => setLightboxImage(null)}>
                    <img src={lightboxImage} alt="Full size view" onClick={(e) => e.stopPropagation()} />
                    <button className="lightbox-close-action" onClick={() => setLightboxImage(null)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
