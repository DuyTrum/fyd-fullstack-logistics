import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function ProductCard({ id, name, price, image, onClick }) {
  const formattedPrice = new Intl.NumberFormat('vi-VN').format(price) + '₫';

  return (
    <div onClick={onClick} className="ai-product-card">
      {/* Product Image */}
      <div className="ai-product-image-container">
        <img
          src={image}
          alt={name}
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="%231a1a2e" width="64" height="64"/><text x="50%" y="50%" font-size="8" text-anchor="middle" dy=".3em" fill="%234bf0c8">No Image</text></svg>';
          }}
        />
      </div>

      {/* Info */}
      <div className="ai-product-info">
        <h4 className="ai-product-title">{name}</h4>
        <div className="ai-product-footer">
          <span className="ai-product-price">{formattedPrice}</span>
          <span className="ai-product-action">
            Chi tiết
            <ArrowRight style={{ width: '12px', height: '12px' }} />
          </span>
        </div>
      </div>
    </div>
  );
}
