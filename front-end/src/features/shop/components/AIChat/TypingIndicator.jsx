import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 self-start max-w-[80%]">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--panel)] border border-[var(--border)] text-[var(--accent)] flex-shrink-0 shadow-inner">
        <SparklesIcon className="w-4 h-4 animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--accent)]"
            animate={{
              y: ["0%", "-40%", "0%"],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
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
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 10.5l-.5 3.5-3.5.5 3.5.5.5 3.5.5-3.5 3.5-.5-3.5-.5-.5-3.5zM6 3l-.25 1.75-1.75.25 1.75.25.25 1.75.25-1.75 1.75-.25-1.75-.25-.25-1.75z"
      />
    </svg>
  );
}
