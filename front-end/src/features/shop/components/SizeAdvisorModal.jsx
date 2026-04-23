import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { aiAPI } from "@shared/utils/api.js";
import "../styles/size-advisor.css";

/**
 * Detect product category type for showing relevant measurement inputs
 */
function detectCategoryType(product) {
    if (!product) return "general";
    const categoryName = (product.categoryName || product.category || "").toLowerCase();
    const productName = (product.name || "").toLowerCase();
    const combined = categoryName + " " + productName;

    if (/giày|shoe|sneaker|boot|sandal|dép/.test(combined)) return "shoes";
    if (/quần|pants|jean|short|jogger|trouser/.test(combined)) return "pants";
    if (/áo|shirt|polo|hoodie|jacket|khoác|vest|sweater|blazer/.test(combined)) return "shirt";
    return "general";
}

export default function SizeAdvisorModal({ isOpen, onClose, product }) {
    const { t } = useTranslation();
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [fit, setFit] = useState("regular");
    const [bust, setBust] = useState("");
    const [waist, setWaist] = useState("");
    const [footLength, setFootLength] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const categoryType = useMemo(() => detectCategoryType(product), [product]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError("");

            // Try to load saved measurements
            const saved = localStorage.getItem("fyd-measurements");
            if (saved) {
                try {
                    const { h, w, f, b, wa, fl } = JSON.parse(saved);
                    setHeight(h || "");
                    setWeight(w || "");
                    setFit(f || "regular");
                    setBust(b || "");
                    setWaist(wa || "");
                    setFootLength(fl || "");
                } catch (e) { }
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!height || !weight) {
            setError("Vui lòng nhập chiều cao và cân nặng");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            // Build extra params based on category
            const extraParams = {};
            if (categoryType === "shirt" && bust) extraParams.bust = bust;
            if (categoryType === "pants" && waist) extraParams.waist = waist;
            if (categoryType === "shoes" && footLength) extraParams.footLength = footLength;

            const response = await aiAPI.suggestSize(product.id, height, weight, fit, extraParams);
            if (response.success) {
                setResult(response.reply);

                // Save measurements for next time
                localStorage.setItem("fyd-measurements", JSON.stringify({
                    h: height, w: weight, f: fit,
                    b: bust, wa: waist, fl: footLength
                }));
            } else {
                setError(response.error || "Không thể lấy gợi ý lúc này. Vui lòng thử lại.");
            }
        } catch (err) {
            setError("Lỗi kết nối. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    const getCategoryLabel = () => {
        switch (categoryType) {
            case "shirt": return "👕 Áo";
            case "pants": return "👖 Quần";
            case "shoes": return "👟 Giày/Dép";
            default: return "👔 Thời trang";
        }
    };

    return (
        <div className="size-advisor-overlay" onClick={onClose}>
            <div className="size-advisor-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <div className="advisor-header">
                    <div className="advisor-icon">📏</div>
                    <h3>{t("shop.size_advisor_title")}</h3>
                    <p>{t("shop.size_advisor_desc")}</p>
                    <span className="category-badge">{getCategoryLabel()}</span>
                </div>

                <div className="advisor-content">
                    {!result ? (
                        <form className="advisor-form" onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>{t("shop.height_label")}</label>
                                    <input
                                        type="number"
                                        placeholder="VD: 170"
                                        value={height}
                                        onChange={e => setHeight(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t("shop.weight_label")}</label>
                                    <input
                                        type="number"
                                        placeholder="VD: 65"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Category-specific measurements */}
                            {categoryType === "shirt" && (
                                <div className="form-group extra-measurement">
                                    <label>📐 Vòng ngực (cm) <span className="optional">- không bắt buộc</span></label>
                                    <input
                                        type="number"
                                        placeholder="VD: 92"
                                        value={bust}
                                        onChange={e => setBust(e.target.value)}
                                    />
                                    <small className="measurement-hint">Đo vòng ngực nơi rộng nhất, qua đầu ngực</small>
                                </div>
                            )}

                            {categoryType === "pants" && (
                                <div className="form-group extra-measurement">
                                    <label>📐 Vòng eo (cm) <span className="optional">- không bắt buộc</span></label>
                                    <input
                                        type="number"
                                        placeholder="VD: 76"
                                        value={waist}
                                        onChange={e => setWaist(e.target.value)}
                                    />
                                    <small className="measurement-hint">Đo vòng eo nơi nhỏ nhất, ngay trên rốn</small>
                                </div>
                            )}

                            {categoryType === "shoes" && (
                                <div className="form-group extra-measurement">
                                    <label>📐 Chiều dài bàn chân (cm) <span className="optional">- không bắt buộc</span></label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="VD: 25.5"
                                        value={footLength}
                                        onChange={e => setFootLength(e.target.value)}
                                    />
                                    <small className="measurement-hint">Đo từ gót đến ngón chân dài nhất khi đứng</small>
                                </div>
                            )}

                            <div className="form-group">
                                <label>{t("shop.fit_label")}</label>
                                <div className="fit-options">
                                    <button
                                        type="button"
                                        className={fit === "slim" ? "active" : ""}
                                        onClick={() => setFit("slim")}
                                    >
                                        {t("shop.fit_slim")}
                                    </button>
                                    <button
                                        type="button"
                                        className={fit === "regular" ? "active" : ""}
                                        onClick={() => setFit("regular")}
                                    >
                                        {t("shop.fit_regular")}
                                    </button>
                                    <button
                                        type="button"
                                        className={fit === "loose" ? "active" : ""}
                                        onClick={() => setFit("loose")}
                                    >
                                        {t("shop.fit_loose")}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="advisor-error">{error}</div>}

                            <button type="submit" className="advisor-submit" disabled={loading}>
                                {loading ? t("shop.analyzing") : t("shop.get_suggestion")}
                            </button>
                        </form>
                    ) : (
                        <div className="advisor-result">
                            <div className="result-badge">{t("shop.ai_suggestion")}</div>
                            <div className="result-text">{result}</div>
                            <button className="advisor-reset" onClick={() => setResult(null)}>
                                {t("shop.reset_measurements")}
                            </button>
                        </div>
                    )}
                </div>

                <div className="advisor-footer">
                    * Gợi ý chỉ mang tính chất tham khảo dựa trên thông tin trung bình.
                </div>
            </div>
        </div>
    );
}
