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
    <div className="ai-input-bar">
      <div className="ai-input-wrapper">
        
        {/* Attachment button (Mocked) */}
        <button
          type="button"
          disabled={disabled}
          className="ai-icon-btn"
          aria-label="Đính kèm tệp"
        >
          <Paperclip style={{ width: '16px', height: '16px' }} />
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
          className="ai-input-field"
        />

        {/* Voice button (Mocked) */}
        <button
          type="button"
          disabled={disabled}
          className="ai-icon-btn"
          aria-label="Tìm bằng giọng nói"
        >
          <Mic style={{ width: '16px', height: '16px' }} />
        </button>

        {/* Send Button */}
        <button
          onClick={onSend}
          type="button"
          disabled={!value.trim() || disabled}
          className="ai-icon-btn send"
          aria-label="Gửi tin nhắn"
        >
          <Send style={{ width: '14px', height: '14px' }} />
        </button>

      </div>
    </div>
  );
}
