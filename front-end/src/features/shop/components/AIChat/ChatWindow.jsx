import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import SuggestionChip from './SuggestionChip';

export default function ChatWindow({
  isOpen,
  messages,
  isLoading,
  inputValue,
  onInputChange,
  onSend,
  onKeyPress,
  onProductClick,
  onQuickAction,
  onMinimize,
  onClose,
  quickActions
}) {
  const scrollRef = useRef(null);

  // Auto-scroll when messages change or loading state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-48px)] h-[580px] max-h-[calc(100vh-140px)] rounded-2xl bg-[var(--bg)]/95 border border-[var(--border)] shadow-2xl backdrop-blur-xl flex flex-col z-[9998] overflow-hidden"
        >
          {/* Header */}
          <ChatHeader onMinimize={onMinimize} onClose={onClose} />

          {/* Body / Scrollable Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border) transparent'
            }}
          >
            {messages.length === 0 ? (
              /* Welcome State */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center p-6 my-auto"
              >
                {/* Glowing Assist Logo */}
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-black shadow-lg shadow-[var(--accent)]/10 mb-4 animate-bounce">
                  <Sparkles className="w-7 h-7" />
                </div>
                
                <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text)] tracking-tight uppercase">
                  Xin chào! 👋
                </h4>
                <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-1.5 leading-relaxed max-w-[85%] font-medium">
                  Tôi là trợ lý ảo cao cấp của FYD Store. Tôi có thể hỗ trợ bạn:
                </p>

                {/* Features List */}
                <ul className="text-left text-[11px] sm:text-xs text-[var(--text)]/85 space-y-1.5 my-5 pl-1.5 font-semibold">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    Tìm kiếm sản phẩm phù hợp
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    So sánh các sản phẩm chi tiết
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    Tư vấn size và phối đồ thời trang
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    Theo dõi đơn hàng của bạn
                  </li>
                </ul>

                {/* Quick actions chips */}
                <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-full">
                  {quickActions.map((action, idx) => (
                    <SuggestionChip
                      key={idx}
                      text={action}
                      onClick={() => onQuickAction(action)}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Message List */
              messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  role={msg.role}
                  content={msg.content}
                  onProductClick={onProductClick}
                />
              ))
            )}

            {/* Typing status */}
            {isLoading && <TypingIndicator />}
          </div>

          {/* Input Area */}
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSend={onSend}
            onKeyPress={onKeyPress}
            disabled={isLoading}
          />

        </motion.div>
      )}
    </AnimatePresence>
  );
}
