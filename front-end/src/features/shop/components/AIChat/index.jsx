import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/ai-chat.css';
import ChatBubble from './ChatBubble';
import ChatWindow from './ChatWindow';
import { aiAPI, productAPI } from '@shared/utils/api.js';
import { getCustomerData } from '@shared/utils/customerSession.js';

export default function AIChat() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);

  // Attachment States
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedImageName, setAttachedImageName] = useState('');

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Suggested quick action actions
  const quickActions = [
    "Có gì mới không?",
    "Áo thun size M",
    "Sản phẩm bán chạy",
    "Giá dưới 500k",
  ];

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'vi-VN';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setInputValue((prev) => (prev ? prev + ' ' + text : text));
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleToggleRecording = () => {
    if (!recognition) {
      alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói tiếng Việt.');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleAttachImage = (base64, filename) => {
    setAttachedImage(base64);
    setAttachedImageName(filename);
  };

  const handleClearImage = () => {
    setAttachedImage(null);
    setAttachedImageName('');
  };

  // Send message
  const handleSend = async () => {
    if ((!inputValue.trim() && !attachedImage) || isLoading) return;

    const userMessage = inputValue.trim();
    const currentImage = attachedImage;
    const currentImageName = attachedImageName;

    // Reset inputs
    setInputValue('');
    handleClearImage();

    // Add user message with image details
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage || 'Tìm kiếm bằng hình ảnh', image: currentImage }
    ]);
    setIsLoading(true);
    setHasNotification(false);

    // Image attachment flow (visual product search simulation)
    if (currentImage) {
      try {
        // Fetch all products from store
        const prodResponse = await productAPI.getAll({ size: 100 });
        const allProducts = prodResponse.products || [];

        const nameLower = currentImageName.toLowerCase();
        let matched = [];

        const keywordMap = [
          { keys: ['jordan'], tag: 'jordan' },
          { keys: ['air', 'force', 'af1'], tag: 'air force' },
          { keys: ['max', 'airmax'], tag: 'air max' },
          { keys: ['lebron'], tag: 'lebron' },
          { keys: ['gato'], tag: 'gato' },
          { keys: ['court'], tag: 'court' },
          { keys: ['sandal', 'dép', 'quai'], tag: 'sandal' },
          { keys: ['quần', 'pant', 'jean', 'short', 'jogger'], tag: 'quần' },
          { keys: ['áo', 't-shirt', 'polo', 'hoodie', 'jacket', 'khoác'], tag: 'áo' },
          { keys: ['túi', 'balo', 'backpack', 'bag'], tag: 'túi' }
        ];

        // Match tag based on filename keywords
        let matchedTag = '';
        for (const item of keywordMap) {
          if (item.keys.some(k => nameLower.includes(k))) {
            matchedTag = item.tag;
            break;
          }
        }

        if (matchedTag) {
          matched = allProducts.filter(p => p.name.toLowerCase().includes(matchedTag));
        }

        // Broad fallback checking for word matches
        if (matched.length === 0) {
          const filenameWords = nameLower.split(/[-_.\s]/).filter(w => w.length > 3);
          for (const word of filenameWords) {
            matched = allProducts.filter(p => p.name.toLowerCase().includes(word));
            if (matched.length > 0) break;
          }
        }

        // Simulate scanning overlay delay
        setTimeout(() => {
          let replyText = `Tôi đã quét hình ảnh **${currentImageName}** và tìm thấy các sản phẩm phù hợp dưới đây:\n\n`;
          if (matched.length === 0) {
            replyText = `Tôi đã phân tích hình ảnh **${currentImageName}** nhưng chưa tìm thấy sản phẩm chính xác trong cửa hàng. Bạn có thể tham khảo một số sản phẩm mới nhất của chúng tôi:\n\n`;
            matched = allProducts.slice(0, 3);
          }

          // Build product tags format
          matched.slice(0, 3).forEach(p => {
            const primaryImg = p.images?.find(img => img.isPrimary)?.imageUrl || p.images?.[0]?.imageUrl || '';
            replyText += `PRODUCT[${p.id}|${p.name}|${p.basePrice}|${primaryImg}]\n`;
          });

          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: replyText }
          ]);
          setIsLoading(false);
          if (!isOpen) {
            setHasNotification(true);
          }
        }, 2200);

      } catch (err) {
        console.error('Image search failed:', err);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Lỗi khi phân tích hình ảnh. Vui lòng thử lại sau.' }
        ]);
        setIsLoading(false);
      }
      return;
    }

    // Normal text message flow
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
          setMessages([]); // Reset messages on close
        }}
        quickActions={quickActions}
        attachedImage={attachedImage}
        onAttachImage={handleAttachImage}
        onClearImage={handleClearImage}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
      />
    </>
  );
}
