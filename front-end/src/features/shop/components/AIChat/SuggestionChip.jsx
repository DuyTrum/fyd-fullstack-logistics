import React from 'react';

export default function SuggestionChip({ text, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="px-4 py-2 text-xs font-semibold rounded-full bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--panel2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-350 active:scale-95 shadow-sm"
    >
      {text}
    </button>
  );
}
