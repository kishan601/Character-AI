import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  // Normalize Windows line endings to \n
  const normalizedContent = content.replace(/\r\n/g, "\n");

  // Split into paragraphs by double newlines
  const paragraphs = normalizedContent.split(/\n\n+/);

  const formatLine = (text: string) => {
    // We parse *actions* into <span class="rp-action">...</span>
    // and "quotes" into <span class="rp-dialogue">...</span>
    // and `code` into <code>...</code>

    // 1. Process inline code first to protect it
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, idx) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-dark-900 border border-slate-800 font-mono text-xs text-brand-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // 2. Process italics (*action*)
      const italicParts = part.split(/(\*[^*]+\*)/g);

      return (
        <span key={idx}>
          {italicParts.map((sub, sIdx) => {
            if (sub.startsWith("*") && sub.endsWith("*")) {
              return (
                <span
                  key={sIdx}
                  className="text-slate-400 italic font-normal"
                >
                  {sub.slice(1, -1)}
                </span>
              );
            }

            // 3. Process dialogue ("words")
            const dialogueParts = sub.split(/("[^"]+")/g);
            return dialogueParts.map((dSub, dIdx) => {
              if (dSub.startsWith('"') && dSub.endsWith('"')) {
                return (
                  <span
                    key={dIdx}
                    className="text-slate-100 font-medium tracking-wide text-[1.01em]"
                  >
                    {dSub}
                  </span>
                );
              }
              return <span key={dIdx}>{dSub}</span>;
            });
          })}
        </span>
      );
    });
  };

  return (
    <div className={`space-y-3 leading-relaxed text-[15px] ${className || "text-slate-200"}`}>
      {paragraphs.map((p, pIdx) => {
        // Handle bullet points, but protect roleplay actions that start/end with asterisks
        const trimmed = p.trim();
        const isBulletList =
          (trimmed.startsWith("- ") || trimmed.startsWith("* ")) &&
          !trimmed.endsWith("*");

        if (isBulletList) {
          const items = p.split(/\n/).filter((l) => l.trim().length > 0);
          return (
            <ul key={pIdx} className="list-disc list-inside space-y-1 pl-2 text-slate-300">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="whitespace-pre-wrap break-words">
                  {formatLine(item.replace(/^[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={pIdx} className="whitespace-pre-wrap break-words">
            {formatLine(p)}
          </p>
        );
      })}
    </div>
  );
};

