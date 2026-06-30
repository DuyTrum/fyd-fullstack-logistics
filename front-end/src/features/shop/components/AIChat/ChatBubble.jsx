import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export default function ChatBubble({ isOpen, onClick, hasNotification }) {
  return (
    <motion.button
      onClick={onClick}
      type="button"
      className="ai-chat-bubble"
      
      // Floating breathing effect when closed
      animate={isOpen ? {} : {
        y: [0, -6, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      
      // Hover animations
      whileHover={{
        scale: 1.08,
        y: isOpen ? 0 : -3
      }}
      
      aria-label={isOpen ? "Đóng chat AI" : "Mở trợ lý AI"}
    >
      {/* Glow Ring Effect */}
      {!isOpen && (
        <span className="ai-chat-glow-ring" />
      )}

      {/* Online indicator badge */}
      {!isOpen && (
        <span className="ai-status-dot" />
      )}

      {/* Notification badge */}
      {hasNotification && !isOpen && (
        <span className="ai-unread-badge">1</span>
      )}

      {/* Icon toggle */}
      {isOpen ? (
        <X style={{ width: '24px', height: '24px', color: 'var(--danger)' }} />
      ) : (
        <Sparkles style={{ width: '24px', height: '24px' }} />
      )}
    </motion.button>
  );
}
