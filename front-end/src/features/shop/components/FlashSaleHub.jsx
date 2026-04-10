import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { flashSalePublicAPI } from "@shared/utils/api.js";
import ProductCard from "./ProductCard";
import "../styles/flash-sale.css";

export default function FlashSaleHub({ onQuickView, onToggleWishlist, wishlist = [] }) {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [flashSaleData, setFlashSaleData] = useState(null); // { status, name, startTime, endTime, products, serverTime }
    const [timeLeft, setTimeLeft] = useState({
        hours: 0,
        minutes: 0,
        seconds: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFlashSaleData();
    }, []);

    const fetchFlashSaleData = async () => {
        setLoading(true);
        try {
            const data = await flashSalePublicAPI.getActive();
            setFlashSaleData(data); // Store full response (status, config, products, serverTime)
            
            if (data.status === "RUNNING" && data.products?.length > 0) {
                setProducts(data.products);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error("Failed to fetch flash sale data:", error);
            setFlashSaleData(null);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Countdown timer handling 3 states: UPCOMING, RUNNING, ENDED
    useEffect(() => {
        if (!flashSaleData || !flashSaleData.config) {
            setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            return;
        }

        const { status, serverTime, config } = flashSaleData;
        const { startTime, endTime } = config;

        // Sync with server time
        const serverNow = serverTime ? new Date(serverTime).getTime() : Date.now();
        const clientNow = Date.now();
        const timeOffset = serverNow - clientNow;

        const timer = setInterval(() => {
            const now = Date.now() + timeOffset;
            const start = startTime ? new Date(startTime).getTime() : 0;
            const end = endTime ? new Date(endTime).getTime() : 0;
            
            let target = 0;
            
            if (now < start) {
                target = start; // Countdown to start
            } else if (now >= start && now <= end) {
                target = end; // Countdown to end
            } else {
                // Already ended
                clearInterval(timer);
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                // If it was running but now ended, refresh to see if next one is available
                if (status === "RUNNING" || status === "UPCOMING") {
                    setTimeout(fetchFlashSaleData, 3000);
                }
                return;
            }

            const distance = target - now;
            if (distance <= 0) {
                clearInterval(timer);
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                setTimeout(fetchFlashSaleData, 2000);
                return;
            }

            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
        }, 1000);

        return () => clearInterval(timer);
    }, [flashSaleData]);

    if (loading) return null;
    if (!flashSaleData) return null;

    const isUpcoming = flashSaleData.status === "UPCOMING";
    const displayLabel = flashSaleData.config?.discountLabel || "FLASH SALE";

    return (
        <section className="flash-sale-hub">
            <div className="flash-sale-container">
                <div className="flash-sale-header">
                    <div className="flash-sale-title">
                        <div className="flash-tag">⚡ {displayLabel}</div>
                        <h2>
                            {isUpcoming
                                ? t("shop.flash_sale_coming_soon", "Sắp diễn ra")
                                : flashSaleData.config?.name || t("shop.flash_sale_title", "Siêu sale giờ vàng")}
                        </h2>
                        <div className="countdown-timer">
                            <div className="time-block">
                                <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                            </div>
                            <span className="separator">:</span>
                            <div className="time-block">
                                <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                            </div>
                            <span className="separator">:</span>
                            <div className="time-block">
                                <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flash-promo">
                        {isUpcoming
                            ? `🔔 ${t("shop.flash_sale_notify", "Bắt đầu sau")} ${String(timeLeft.hours).padStart(2, '0')}h`
                            : `🔥 ${products.length} ${t("shop.flash_sale_products_count", "sản phẩm giảm giá")}`}
                    </div>
                </div>

                {!isUpcoming && products.length > 0 && (
                    <div className="flash-sale-products">
                        <div className="products-scroll-container">
                            {products.map(product => (
                                <div key={product.id} className="flash-product-wrapper">
                                    <ProductCard
                                        product={product}
                                        onQuickView={onQuickView}
                                        onToggleWishlist={onToggleWishlist}
                                        isWishlisted={wishlist.includes(product.id)}
                                    />
                                    {product.salePrice && product.basePrice && (
                                        <div className="discount-badge-large">
                                            -{Math.round((1 - product.salePrice / product.basePrice) * 100)}%
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
