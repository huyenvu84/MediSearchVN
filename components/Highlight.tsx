import React from 'react';

interface HighlightProps {
  text: string;
  highlight: string;
  className?: string;
}

const Highlight: React.FC<HighlightProps> = ({ text, highlight, className }) => {
  if (!highlight.trim()) {
    return <span className={className}>{text}</span>;
  }
  // Escape special characters in the highlight string for RegExp
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="bg-amber-200 dark:bg-amber-600/70 text-black dark:text-white rounded-sm px-0.5 py-0.5">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

export default Highlight;