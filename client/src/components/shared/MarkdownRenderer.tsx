import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split into paragraphs on double or more newlines
  const paragraphs = content.split(/\n\n+/);

  const formatLine = (text: string) => {
    // 1. Process inline code (`code`) first to protect it
    const codeParts = text.split(/(`[^`]+`)/g);

    return codeParts.map((cPart, cIdx) => {
      if (cPart.startsWith("`") && cPart.endsWith("`") && cPart.length >= 2) {
        return (
          <code
            key={cIdx}
            className="px-1.5 py-0.5 rounded bg-dark-900 border border-slate-800 font-mono text-xs text-brand-300"
          >
            {cPart.slice(1, -1)}
          </code>
        );
      }

      // 2. Process bold (**bold**)
      const boldParts = cPart.split(/(\*\*[^*]+\*\*)/g);

      return (
        <React.Fragment key={cIdx}>
          {boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length >= 4) {
              return (
                <strong key={bIdx} className="font-bold text-slate-100">
                  {bPart.slice(2, -2)}
                </strong>
              );
            }

            // 3. Process italics / roleplay actions (*action*) -> greyed out & italicized
            const italicParts = bPart.split(/(\*[^*]+\*)/g);

            return (
              <React.Fragment key={bIdx}>
                {italicParts.map((iPart, iIdx) => {
                  if (iPart.startsWith("*") && iPart.endsWith("*") && iPart.length >= 2) {
                    return (
                      <span
                        key={iIdx}
                        className="text-slate-400 italic font-normal"
                      >
                        {iPart.slice(1, -1)}
                      </span>
                    );
                  }

                  // 4. Process dialogue ("words")
                  const dialogueParts = iPart.split(/("[^"]+")/g);
                  return dialogueParts.map((dSub, dIdx) => {
                    if (dSub.startsWith('"') && dSub.endsWith('"') && dSub.length >= 2) {
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
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-3 leading-relaxed text-[15px] text-slate-200 break-words">
      {paragraphs.map((p, pIdx) => {
        // Handle true bullet lists (e.g. lines starting with "- " that are not closed actions)
        if (p.trim().startsWith("- ")) {
          const items = p.split(/\n/).filter((l) => l.trim().length > 0);
          return (
            <ul key={pIdx} className="list-disc list-inside space-y-1 pl-2 text-slate-300">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="whitespace-pre-wrap break-words">
                  {formatLine(item.replace(/^-\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        // Standard paragraph with whitespace-pre-wrap to preserve Shift+Enter newlines
        return (
          <p key={pIdx} className="whitespace-pre-wrap break-words">
            {formatLine(p)}
          </p>
        );
      })}
    </div>
  );
};
