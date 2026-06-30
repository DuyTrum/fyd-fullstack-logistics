import React from 'react';

export default function SuggestionChip({ text, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="ai-suggestion-chip"
    >
      {text}
    </button>
  );
}
