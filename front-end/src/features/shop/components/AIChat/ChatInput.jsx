import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';

export default function ChatInput({ value, onChange, onSend, onKeyPress, disabled }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  return (
    <div className="p-4 bg-[var(--panel)] border-t border-[var(--border)] backdrop-blur-md">
      <div className="flex items-center gap-2 bg-[var(--panel2)] border border-[var(--border)] rounded-2xl p-1.5 focus-within:border-[var(--accent)] transition-all duration-350">
        
        {/* Attachment button (Mocked) */}
        <button
          type="button"
          disabled={disabled}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] disabled:opacity-50 transition-colors duration-200 active:scale-95"
          aria-label="Đính kèm tệp"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyPress}
          disabled={disabled}
          placeholder="Hỏi bất cứ điều gì về sản phẩm..."
          className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--muted2)] px-1 py-2 min-w-0"
        />

        {/* Voice button (Mocked) */}
        <button
          type="button"
          disabled={disabled}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] disabled:opacity-50 transition-colors duration-200 active:scale-95"
          aria-label="Tìm bằng giọng nói"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Send Button */}
        <button
          onClick={onSend}
          type="button"
          disabled={!value.trim() || disabled}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] text-black font-extrabold disabled:from-[var(--panel)] disabled:to-[var(--panel)] disabled:text-[var(--muted2)] disabled:cursor-not-allowed transition-all duration-350 active:scale-95 shadow-md"
          aria-label="Gửi tin nhắn"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
}
