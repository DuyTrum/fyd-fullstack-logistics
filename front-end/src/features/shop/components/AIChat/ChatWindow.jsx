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
  quickActions,
  attachedImage,
  onAttachImage,
  onClearImage,
  isRecording,
  onToggleRecording
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
          className="ai-chat-window"
        >
          {/* Header */}
          <ChatHeader onMinimize={onMinimize} onClose={onClose} />

          {/* Body / Scrollable Area */}
          <div ref={scrollRef} className="ai-chat-body">
            {messages.length === 0 ? (
              /* Welcome State */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="ai-welcome-card"
              >
                {/* Glowing Assist Logo */}
                <div className="ai-welcome-logo">
                  <Sparkles style={{ width: '28px', height: '28px' }} />
                </div>
                
                <h4>Xin chào! 👋</h4>
                <p>
                  Tôi là trợ lý ảo cao cấp của FYD Store. Tôi có thể hỗ trợ bạn:
                </p>

                {/* Features List */}
                <ul className="ai-features-list">
                  <li>Tìm kiếm sản phẩm phù hợp</li>
                  <li>So sánh các sản phẩm chi tiết</li>
                  <li>Tư vấn size và phối đồ thời trang</li>
                  <li>Theo dõi đơn hàng của bạn</li>
                </ul>

                {/* Quick actions chips */}
                <div className="ai-welcome-suggested">
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
                  image={msg.image}
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
            attachedImage={attachedImage}
            onAttachImage={onAttachImage}
            onClearImage={onClearImage}
            isRecording={isRecording}
            onToggleRecording={onToggleRecording}
          />

        </motion.div>
      )}
    </AnimatePresence>
  );
}
