import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="ai-typing-container">
      <div className="ai-msg-avatar-bubble">
        <SparklesIcon className="w-4 h-4" />
      </div>
      <div className="ai-typing-dots-box">
        <span className="ai-typing-dot"></span>
        <span className="ai-typing-dot"></span>
        <span className="ai-typing-dot"></span>
      </div>
    </div>
  );
}

function SparklesIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      style={{ width: '16px', height: '16px' }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 10.5l-.5 3.5-3.5.5 3.5.5.5 3.5.5-3.5 3.5-.5-3.5-.5-.5-3.5zM6 3l-.25 1.75-1.75.25 1.75.25.25 1.75.25-1.75 1.75-.25-1.75-.25-.25-1.75z"
      />
    </svg>
  );
}
