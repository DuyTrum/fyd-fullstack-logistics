import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export default function ChatBubble({ isOpen, onClick, hasNotification }) {
  return (
    <motion.button
      onClick={onClick}
      type="button"
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-tr from-[var(--bg)] via-[var(--panel2)] to-[var(--panel)] border border-[var(--border)] text-[var(--accent)] shadow-2xl backdrop-blur-md cursor-pointer z-[9999] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2 focus:ring-offset-[var(--bg)] active:scale-95"
      
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
        y: isOpen ? 0 : -3,
        borderColor: "var(--accent)",
        boxShadow: "0 10px 25px -5px rgba(75, 240, 200, 0.25)"
      }}
      
      aria-label={isOpen ? "Đóng chat AI" : "Mở trợ lý AI"}
    >
      {/* Glow Ring Effect */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full border border-[var(--accent)]/30 animate-ping opacity-60" />
      )}

      {/* Online indicator badge */}
      {!isOpen && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[var(--bg)] rounded-full" />
      )}

      {/* Notification badge */}
      {hasNotification && !isOpen && (
        <span className="absolute -top-1 -left-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--danger)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-[var(--danger)] text-[9px] font-black text-white items-center justify-center">1</span>
        </span>
      )}

      {/* Icon toggle */}
      {isOpen ? (
        <X className="w-6 h-6 text-[var(--danger)]" />
      ) : (
        <Sparkles className="w-6 h-6 animate-pulse" />
      )}
    </motion.button>
  );
}
