import { useState, useEffect } from "react";
import { getAssetUrl } from "@shared/utils/api.js";

export default function HeroBanner({ products = [], onExploreClick, onProductClick }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = products.length > 0
    ? products.map((p, index) => ({
      image: getAssetUrl(p.customThumbnail || p.product?.image || p.image || "/placeholder.jpg"),
      title: p.product?.name || p.name || "SẢN PHẨM MỚI",
      subtitle: "BỘ SƯU TẬP 2026",
      cta: "MUA NGAY",
      dark: index % 2 === 0,
      id: p.product?.id || p.id
    }))
    : [
      {
        image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920&q=80",
        title: "BỘ SƯU TẬP MỚI",
        subtitle: "STREETWEAR 2026",
        cta: "MUA NGAY",
        dark: true
      },
      {
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80",
        title: "GIẢM ĐẾN 50%",
        subtitle: "SALE CUỐI MÙA",
        cta: "XEM NGAY",
        dark: false
      },
      {
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80",
        title: "PHONG CÁCH MỚI",
        subtitle: "THỜI TRANG ĐƯỜNG PHỐ",
        cta: "KHÁM PHÁ",
        dark: true
      }
    ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleCtaClick = (slide) => {
    if (slide.id && onProductClick) {
      // Find the original product object if possible
      const product = products.find(p => (p.product?.id || p.id) === slide.id);
      // Pass an object with both id and productId to ensure proper lookup
      const productInfo = product?.product || product || { id: slide.id, productId: slide.id };
      if (!productInfo.productId) {
        productInfo.productId = productInfo.id || slide.id;
      }
      onProductClick(productInfo);
    } else if (onExploreClick) {
      onExploreClick();
    } else {
      // Default: scroll to products section
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };


  return (
    <section className="hero-banner">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`hero-slide ${index === currentSlide ? 'active' : ''} ${slide.dark ? 'dark' : 'light'}`}
          style={{ backgroundImage: `url(${slide.image})`, cursor: 'pointer' }}
          onClick={(e) => {
            if (e.target.tagName !== 'BUTTON') {
              handleCtaClick(slide);
            }
          }}
        >
          <div className="hero-content">
            <span className="hero-subtitle">{slide.subtitle}</span>
            <h1 className="hero-title">{slide.title}</h1>
            <button className="hero-cta" onClick={(e) => { e.stopPropagation(); handleCtaClick(slide); }}>{slide.cta}</button>
          </div>
        </div>
      ))}
      <div className="hero-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </section>
  );
}
