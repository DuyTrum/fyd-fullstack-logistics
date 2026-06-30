import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function ProductCard({ id, name, price, image, onClick }) {
  const formattedPrice = new Intl.NumberFormat('vi-VN').format(price) + '₫';

  return (
    <div
      onClick={onClick}
      className="flex gap-4 p-3.5 my-3 rounded-2xl bg-[var(--panel2)] border border-[var(--border)] hover:border-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent)]/5 hover:-translate-y-0.5 transition-all duration-350 cursor-pointer group relative overflow-hidden active:scale-98"
    >
      {/* Product Image */}
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/10 flex-shrink-0 border border-[var(--border)]">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="%231a1a2e" width="64" height="64"/><text x="50%" y="50%" font-size="8" text-anchor="middle" dy=".3em" fill="%234bf0c8">No Image</text></svg>';
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <h4 className="text-xs font-bold text-[var(--text)] line-clamp-2 leading-tight group-hover:text-[var(--accent)] transition-colors duration-200">
          {name}
        </h4>
        <div className="flex items-end justify-between mt-1">
          <span className="text-sm font-extrabold text-[var(--accent)]">
            {formattedPrice}
          </span>
          <span className="text-[10px] font-semibold text-[var(--muted2)] group-hover:text-[var(--text)] transition-colors duration-200 flex items-center gap-0.5">
            Chi tiết
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
          </span>
        </div>
      </div>
    </div>
  );
}
