import React from 'react';
import { Sparkles, User } from 'lucide-react';
import ProductCard from './ProductCard';
import { getAssetUrl } from '@shared/utils/api.js';

export default function ChatMessage({ role, content, image, onProductClick }) {
  const isAssistant = role === 'assistant';

  // Function to parse the message content for markdown and custom tags
  const renderContent = (text) => {
    if (!text) return null;

    // First split by code blocks to separate text from code
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const segments = [];
    let lastIdx = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ type: 'text', content: text.substring(lastIdx, match.index) });
      }
      segments.push({ type: 'code', content: match[1].trim() });
      lastIdx = codeBlockRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      segments.push({ type: 'text', content: text.substring(lastIdx) });
    }

    // Now process each segment
    return segments.map((seg, sIdx) => {
      if (seg.type === 'code') {
        return (
          <pre key={`code-${sIdx}`}>
            <code>{seg.content}</code>
          </pre>
        );
      }

      // For text segments, parse product tags and formatting
      const textVal = seg.content;
      const productRegex = /PRODUCT\[(\d+)\|([^|]+)\|(\d+)(?:\|([^\]]+))?\]/g;
      const subParts = [];
      let subLastIdx = 0;
      let pMatch;

      while ((pMatch = productRegex.exec(textVal)) !== null) {
        if (pMatch.index > subLastIdx) {
          subParts.push(
            <span key={`txt-${subLastIdx}`}>
              {formatMarkdown(textVal.substring(subLastIdx, pMatch.index))}
            </span>
          );
        }

        const id = pMatch[1];
        const name = pMatch[2];
        const price = pMatch[3];
        const rawImage = pMatch[4];
        const image = rawImage ? getAssetUrl(rawImage) : null;

        subParts.push(
          <ProductCard
            key={`prod-${id}-${pMatch.index}`}
            id={id}
            name={name}
            price={price}
            image={image}
            onClick={() => onProductClick(id)}
          />
        );

        subLastIdx = productRegex.lastIndex;
      }

      if (subLastIdx < textVal.length) {
        subParts.push(
          <span key={`txt-${subLastIdx}`}>
            {formatMarkdown(textVal.substring(subLastIdx))}
          </span>
        );
      }

      return <React.Fragment key={`seg-${sIdx}`}>{subParts}</React.Fragment>;
    });
  };

  // Helper to format simple markdown-like syntax
  const formatMarkdown = (text) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Bold formatting: **text** -> <strong>text</strong>
      const boldRegex = /\*\*([^*]+)\*\*/g;
      const parts = [];
      let lastIdx = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIdx) {
          parts.push(line.substring(lastIdx, match.index));
        }
        parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
        lastIdx = boldRegex.lastIndex;
      }

      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      // Check if bullet point
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');
      const cleanLine = isBullet ? line.trim().replace(/^[-•*]\s*/, '') : line;

      const element = parts.length > 0 ? parts : cleanLine;

      return (
        <span key={lIdx} className={`ai-block ${isBullet ? 'ai-bullet-point' : ''} ${lIdx > 0 ? 'ai-mt-1' : ''}`}>
          {element}
        </span>
      );
    });
  };

  return (
    <div className={`ai-msg-wrapper ${role}`}>
      {/* Avatar */}
      <div className="ai-msg-avatar-bubble">
        {isAssistant ? <Sparkles style={{ width: '16px', height: '16px' }} /> : <User style={{ width: '16px', height: '16px' }} />}
      </div>

      {/* Message content */}
      <div className="ai-msg-text-bubble">
        {image && (
          <img
            src={image}
            alt="Đính kèm"
            className="ai-message-attachment"
          />
        )}
        {renderContent(content)}
      </div>
    </div>
  );
}
