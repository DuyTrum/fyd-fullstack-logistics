import React from 'react';
import { Sparkles, Minus, X } from 'lucide-react';

export default function ChatHeader({ onMinimize, onClose }) {
  return (
    <div className="ai-chat-header">
      <div className="ai-header-profile">
        {/* Avatar */}
        <div className="ai-header-avatar">
          <Sparkles style={{ width: '18px', height: '18px' }} />
          <span className="online-indicator" />
        </div>
        
        {/* Title */}
        <div className="ai-header-meta">
          <h3>FYD AI Concierge</h3>
          <span>Sẵn sàng tư vấn</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="ai-header-actions">
        <button
          onClick={onMinimize}
          type="button"
          className="ai-action-btn-circle"
          aria-label="Thu nhỏ"
        >
          <Minus style={{ width: '14px', height: '14px' }} />
        </button>
        <button
          onClick={onClose}
          type="button"
          className="ai-action-btn-circle close"
          aria-label="Đóng"
        >
          <X style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
    </div>
  );
}
