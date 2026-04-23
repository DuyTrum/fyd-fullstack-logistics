import { useState, useEffect } from "react";
import { reviewAPI, getAssetUrl, BASE_URL } from "@shared/utils/api.js";
import { getCustomerSession } from "@shared/utils/customerSession.js";
import "./ProductReviews.css";

// Star rating display
function StarRating({ rating, size = 16 }) {
    return (
        <div className="star-rating" style={{ gap: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill={star <= rating ? "#f59e0b" : "none"}
                    stroke="#f59e0b"
                    strokeWidth="2"
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

    return (
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
            <span className="rating-label">
                {value === 1 && "Rất tệ"}
                {value === 2 && "Tệ"}
                {value === 3 && "Bình thường"}
                {value === 4 && "Tốt"}
                {value === 5 && "Rất tốt"}
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
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, breakdown: {} });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ rating: 5, title: "", content: "" });
    const [reviewImages, setReviewImages] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [eligibility, setEligibility] = useState({ canReview: false, alreadyReviewed: false, hasPurchased: false });
    const [lightboxImage, setLightboxImage] = useState(null);

    useEffect(() => {
        loadReviews();
    }, [productId]);

    async function loadReviews() {
        setLoading(true);
        try {
            const session = getCustomerSession();
            const customerId = session?.customer?.id;

            const data = await reviewAPI.getProductReviews(productId, customerId);
            setReviews(data.reviews || []);
            setStats({
                avgRating: data.averageRating || 0,
                totalReviews: data.reviews?.length || 0,
                breakdown: data.ratingDistribution || {}, // Note: changed from breakdown to ratingDistribution based on backend
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
        }
    }

    function handleWriteReview() {
        const session = getCustomerSession();
        if (!session?.customer) {
            onLoginRequired?.();
            return;
        }

        if (!eligibility.hasPurchased) {
            setSubmitError("Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công.");
            return;
        }

        if (eligibility.alreadyReviewed) {
            setSubmitError("Bạn đã đánh giá sản phẩm này rồi.");
            return;
        }

        setShowForm(true);
        setSubmitSuccess(false);
        setSubmitError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (formData.rating < 1) {
            setSubmitError("Vui lòng chọn số sao đánh giá");
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
            // Convert images to JSON string
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
            // Update eligibility locally
            setEligibility(prev => ({ ...prev, canReview: false, alreadyReviewed: true }));
        } catch (error) {
            setSubmitError(error.message || "Có lỗi xảy ra khi gửi đánh giá");
        } finally {
            setSubmitting(false);
        }
    }

    // Handle image upload
    async function handleImageUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        if (reviewImages.length + files.length > 5) {
            setSubmitError("Tối đa 5 ảnh cho mỗi đánh giá");
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
            setSubmitError("Không thể tải ảnh lên. Vui lòng thử lại.");
        } finally {
            setUploadingImages(false);
        }
    }

    function removeImage(index) {
        setReviewImages(prev => prev.filter((_, i) => i !== index));
    }

    // Parse image URLs from JSON string
    function parseImageUrls(imageUrlsStr) {
        if (!imageUrlsStr) return [];
        try {
            return JSON.parse(imageUrlsStr);
        } catch {
            return [];
        }
    }

    if (loading) {
        return (
            <div className="product-reviews loading">
                <div className="reviews-header">
                    <h3>ĐÁNH GIÁ SẢN PHẨM</h3>
                </div>
                <div className="reviews-loading">Đang tải đánh giá...</div>
            </div>
        );
    }

    const session = getCustomerSession();
    const isLoggedIn = !!session?.customer;

    return (
        <div className="product-reviews">
            <div className="reviews-header">
                <h3>ĐÁNH GIÁ SẢN PHẨM</h3>
                {(!isLoggedIn || eligibility.canReview) && (
                    <button className="write-review-btn" onClick={handleWriteReview}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Viết đánh giá
                    </button>
                )}
            </div>

            {/* Error Message if not eligible but tried to click or generic feedback */}
            {isLoggedIn && !eligibility.canReview && !showForm && (
                <div className="review-info-msg">
                    {eligibility.alreadyReviewed ? (
                        "Bạn đã gửi đánh giá cho sản phẩm này."
                    ) : !eligibility.hasPurchased ? (
                        "Bạn cần mua và nhận hàng thành công để có thể đánh giá sản phẩm này."
                    ) : null}
                </div>
            )}

            {/* Success Message */}
            {submitSuccess && (
                <div className="review-success-msg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }}>
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Cảm ơn bạn đã đánh giá! Đánh giá sẽ được hiển thị sau khi được duyệt.
                </div>
            )}

            {/* Review Form */}
            {showForm && (
                <form className="review-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Đánh giá của bạn *</label>
                        <StarInput value={formData.rating} onChange={(v) => setFormData({ ...formData, rating: v })} />
                    </div>

                    <div className="form-group">
                        <label>Tiêu đề</label>
                        <input
                            type="text"
                            placeholder="Tóm tắt đánh giá của bạn..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            maxLength={100}
                        />
                    </div>

                    <div className="form-group">
                        <label>Nội dung đánh giá</label>
                        <textarea
                            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={4}
                        />
                    </div>

                    {/* Image Upload Section */}
                    <div className="form-group">
                        <label>Hình ảnh (tối đa 5 ảnh)</label>
                        <div className="review-images-upload">
                            {reviewImages.map((url, index) => (
                                <div key={index} className="uploaded-image-preview">
                                    <img src={getAssetUrl(url)} alt={`Review ${index + 1}`} />
                                    <button type="button" className="remove-image-btn" onClick={() => removeImage(index)}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {reviewImages.length < 5 && (
                                <label className="upload-image-btn">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        disabled={uploadingImages}
                                        style={{ display: "none" }}
                                    />
                                    {uploadingImages ? (
                                        <span>Đang tải...</span>
                                    ) : (
                                        <>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <span>Thêm ảnh</span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>

                    {submitError && <div className="form-error">{submitError}</div>}

                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={() => { setShowForm(false); setReviewImages([]); }}>
                            Hủy
                        </button>
                        <button type="submit" className="submit-btn" disabled={submitting || uploadingImages}>
                            {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                    </div>
                </form>
            )}

            {/* Stats Summary */}
            {stats.totalReviews > 0 && (
                <div className="reviews-summary">
                    <div className="summary-score">
                        <div className="big-rating">{stats.avgRating.toFixed(1)}</div>
                        <StarRating rating={Math.round(stats.avgRating)} size={20} />
                        <div className="total-count">{stats.totalReviews} đánh giá</div>
                    </div>
                    <div className="rating-bars">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = stats.breakdown[star] || 0;
                            const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                            return (
                                <div key={star} className="rating-bar-row">
                                    <span className="star-label">{star} ★</span>
                                    <div className="bar-track">
                                        <div className="bar-fill" style={{ width: `${percent}%` }} />
                                    </div>
                                    <span className="bar-count">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Reviews List */}
            <div className="reviews-list">
                {reviews.length === 0 ? (
                    <div className="no-reviews">
                        <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                        <p>Hãy là người đầu tiên đánh giá!</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="review-item">
                            <div className="review-header">
                                <div className="reviewer-avatar">
                                    {(review.customerName || "K").charAt(0).toUpperCase()}
                                </div>
                                <div className="reviewer-info">
                                    <div className="reviewer-name">
                                        {review.customerName}
                                        {review.isVerifiedPurchase && (
                                            <span className="verified-badge">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                Đã mua hàng
                                            </span>
                                        )}
                                    </div>
                                    <div className="review-meta">
                                        <StarRating rating={review.rating} size={14} />
                                        <span className="review-date">{formatDate(review.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {review.title && <div className="review-title">{review.title}</div>}
                            <div className="review-content">{review.content || "(Không có nội dung)"}</div>

                            {/* Review Images */}
                            {parseImageUrls(review.imageUrls).length > 0 && (
                                <div className="review-images">
                                    {parseImageUrls(review.imageUrls).map((url, idx) => (
                                        <img
                                            key={idx}
                                            src={getAssetUrl(url)}
                                            alt={`Review image ${idx + 1}`}
                                            className="review-image-thumb"
                                            onClick={() => setLightboxImage(getAssetUrl(url))}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Admin Reply */}
                            {review.adminReply && (
                                <div className="admin-reply">
                                    <div className="reply-header">
                                        <span className="reply-label">Phản hồi từ Shop</span>
                                        <span className="reply-date">{formatDate(review.adminReplyAt)}</span>
                                    </div>
                                    <div className="reply-content">{review.adminReply}</div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div className="review-lightbox" onClick={() => setLightboxImage(null)}>
                    <img src={lightboxImage} alt="Review full size" onClick={(e) => e.stopPropagation()} />
                    <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
