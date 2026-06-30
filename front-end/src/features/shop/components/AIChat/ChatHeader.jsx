import React from 'react';
import { Sparkles, Minus, X } from 'lucide-react';

export default function ChatHeader({ onMinimize, onClose }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--panel)] border-b border-[var(--border)] backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative w-9 h-9 rounded-full bg-[var(--panel2)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center shadow-inner">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--bg)]" />
        </div>
        
        {/* Title */}
        <div>
          <h3 className="text-xs sm:text-sm font-extrabold text-[var(--text)] tracking-wider uppercase">
            FYD AI Concierge
          </h3>
          <span className="text-[10px] text-[var(--muted)] font-semibold flex items-center gap-1 mt-0.5">
            Sẵn sàng tư vấn
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onMinimize}
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel2)] transition-all duration-200 active:scale-95"
          aria-label="Thu nhỏ"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--panel2)] transition-all duration-200 active:scale-95"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
