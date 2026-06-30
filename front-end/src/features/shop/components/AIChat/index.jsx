import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatBubble from './ChatBubble';
import ChatWindow from './ChatWindow';
import { aiAPI } from '@shared/utils/api.js';
import { getCustomerData } from '@shared/utils/customerSession.js';

export default function AIChat() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);

  // Suggested quick action actions
  const quickActions = [
    "Có gì mới không?",
    "Áo thun size M",
    "Sản phẩm bán chạy",
    "Giá dưới 500k",
  ];

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setHasNotification(false);

    try {
      const customer = getCustomerData();
      const customerId = customer?.id || null;

      const response = await aiAPI.shopChat(userMessage, customerId);
      if (response.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.reply },
        ]);
        if (!isOpen) {
          setHasNotification(true);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.error || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.',
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Xin lỗi, không thể kết nối tới trợ lý ảo lúc này. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (text) => {
    setInputValue(text);
  };

  const handleProductClick = (productId) => {
    navigate(`/shop/product/${productId}`);
    setIsOpen(false);
  };

  useEffect(() => {
    if (messages.length > 0 && !isOpen) {
      setHasNotification(true);
    }
  }, [messages.length, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasNotification(false);
    }
  }, [isOpen]);

  return (
    <>
      <ChatBubble
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        hasNotification={hasNotification}
      />
      <ChatWindow
        isOpen={isOpen}
        messages={messages}
        isLoading={isLoading}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        onProductClick={handleProductClick}
        onQuickAction={handleQuickAction}
        onMinimize={() => setIsOpen(false)}
        onClose={() => {
          setIsOpen(false);
          setMessages([]); // Reset messages on explicit close
        }}
        quickActions={quickActions}
      />
    </>
  );
}
