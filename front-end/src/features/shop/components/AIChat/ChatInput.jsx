import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, X } from 'lucide-react';

export default function ChatInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled,
  attachedImage,
  onAttachImage,
  onClearImage,
  isRecording,
  onToggleRecording
}) {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!disabled && inputRef.current && !isRecording) {
      inputRef.current.focus();
    }
  }, [disabled, isRecording]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64 DataURL for preview and submission
    const reader = new FileReader();
    reader.onload = (event) => {
      onAttachImage(event.target.result, file.name);
    };
    reader.readAsDataURL(file);

    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="ai-input-bar">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* Image Preview Block */}
      {attachedImage && (
        <div className="ai-input-image-preview">
          <img src={attachedImage} alt="Attached Preview" />
          <button
            type="button"
            onClick={onClearImage}
            className="ai-input-image-preview-close"
          >
            <X size={10} />
          </button>
        </div>
      )}

      <div className="ai-input-wrapper">
        {/* Attachment button */}
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={disabled || isRecording}
          className="ai-icon-btn"
          aria-label="Đính kèm tệp"
        >
          <Paperclip style={{ width: '16px', height: '16px' }} />
        </button>

        {/* Recording Soundwave or Text Input */}
        {isRecording ? (
          <div className="ai-soundwave animate-pulse cursor-pointer" onClick={onToggleRecording}>
            <span className="ai-soundwave-bar"></span>
            <span className="ai-soundwave-bar"></span>
            <span className="ai-soundwave-bar"></span>
            <span className="ai-soundwave-bar"></span>
            <span className="ai-soundwave-bar"></span>
            <span className="text-xs text-[var(--muted)] ml-2 font-semibold select-none">
              Đang nghe... Bấm để dừng
            </span>
          </div>
        ) : (
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
        )}

        {/* Voice button */}
        <button
          type="button"
          onClick={onToggleRecording}
          disabled={disabled}
          className={`ai-icon-btn ${isRecording ? 'ai-recording-pulse' : ''}`}
          aria-label="Tìm bằng giọng nói"
        >
          <Mic style={{ width: '16px', height: '16px' }} />
        </button>

        {/* Send Button */}
        <button
          onClick={onSend}
          type="button"
          disabled={(!value.trim() && !attachedImage) || disabled || isRecording}
          className="ai-icon-btn send"
          aria-label="Gửi tin nhắn"
        >
          <Send style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
    </div>
  );
}
