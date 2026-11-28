import React from 'react';

const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '₊': '+',
  '₋': '-',
  'ₙ': 'n',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
};

const SCRIPT_TOKEN_REGEX = /([₀₁₂₃₄₅₆₇₈₉₊₋ₙ]+|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g;

export function renderChemicalAndMathText(text: string): React.ReactNode[] {
  const parts = text.split(SCRIPT_TOKEN_REGEX);
  return parts.map((part, idx) => {
    if (!part) return null;

    if (part[0] in SUBSCRIPT_MAP) {
      const normalized = Array.from(part)
        .map((ch) => SUBSCRIPT_MAP[ch] ?? ch)
        .join('');
      return (
        <sub
          key={`sub-${idx}`}
          className="text-[0.74em] leading-none align-baseline relative -bottom-[0.18em] font-medium"
        >
          {normalized}
        </sub>
      );
    }

    if (part[0] in SUPERSCRIPT_MAP) {
      const normalized = Array.from(part)
        .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
        .join('');
      return (
        <sup
          key={`sup-${idx}`}
          className="text-[0.72em] leading-none align-baseline relative -top-[0.34em] font-medium"
        >
          {normalized}
        </sup>
      );
    }

    return <React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>;
  });
}

export function renderInlineStudyText(text: string): React.ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((segment, idx) => {
    if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
      const inner = segment.slice(2, -2);
      return (
        <strong key={`b-${idx}`} className="font-bold text-[#071F14]">
          {renderChemicalAndMathText(inner)}
        </strong>
      );
    }
    return (
      <React.Fragment key={`n-${idx}`}>
        {renderChemicalAndMathText(segment)}
      </React.Fragment>
    );
  });
}

interface TopicBlock {
  title: string;
  originNote?: string;
  items: string[];
}

function splitSubtopicTitleAndOrigin(rawHeading: string): {
  title: string;
  originNote?: string;
} {
  const cleaned = rawHeading.replace(/:+\s*$/, '').trim();
  const trailingOriginMatch = cleaned.match(
    /^(.*?)\s*\(([^)]*(?:Transpetro|Petrobras|TP-\d+|PB-B\d+)[^)]*)\)$/i
  );

  if (!trailingOriginMatch) {
    return { title: cleaned };
  }

  return {
    title: trailingOriginMatch[1].trim(),
    originNote: trailingOriginMatch[2].trim(),
  };
}

function splitMultiDefinitionBullet(line: string): string[] {
  // Separa itens distintos quando um único tópico traz múltiplas definições **Termo:** na mesma linha
  return line
    .split(/(?<=[.;])\s+(?=\*\*[^*]+:\*\*)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseStudyMarkdown(markdown: string): TopicBlock[] {
  const lines = markdown.split('\n');
  const blocks: TopicBlock[] = [];
  let currentBlock: TopicBlock | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('•')) {
      const afterBullet = trimmed.slice(1).trim();
      const headingMatch = afterBullet.match(/^\*\*([^*]+)\*\*(.*)$/);

      if (headingMatch) {
        const { title, originNote } = splitSubtopicTitleAndOrigin(headingMatch[1]);
        const trailingBody = headingMatch[2].replace(/^:\s*/, '').trim();

        currentBlock = {
          title,
          originNote,
          items: [],
        };
        blocks.push(currentBlock);

        if (trailingBody) {
          currentBlock.items.push(...splitMultiDefinitionBullet(trailingBody));
        }
        continue;
      }

      currentBlock = {
        title: afterBullet.replace(/:+\s*$/, '').trim(),
        items: [],
      };
      blocks.push(currentBlock);
      continue;
    }

    const bulletText = trimmed.startsWith('-') ? trimmed.slice(1).trim() : trimmed;
    if (!currentBlock) {
      currentBlock = { title: '', items: [] };
      blocks.push(currentBlock);
    }

    currentBlock.items.push(...splitMultiDefinitionBullet(bulletText));
  }

  return blocks;
}

interface StudyMarkdownRendererProps {
  markdown: string;
}

export const StudyMarkdownRenderer: React.FC<StudyMarkdownRendererProps> = ({
  markdown,
}) => {
  const blocks = React.useMemo(() => parseStudyMarkdown(markdown), [markdown]);

  return (
    <div className="space-y-7 max-w-[78ch]">
      {blocks.map((block, bIdx) => (
        <section
          key={`${block.title}-${bIdx}`}
          className={
            bIdx > 0 ? 'pt-6 border-t border-slate-200/80' : undefined
          }
        >
          {block.title && (
            <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mb-3.5">
              <span className="font-mono text-xs font-semibold text-[#008542] tabular-nums select-none">
                {String(bIdx + 1).padStart(2, '0')}.
              </span>
              <h5 className="font-display text-[17px] sm:text-[18px] font-bold text-[#071F14] tracking-[-0.015em] leading-snug">
                {renderChemicalAndMathText(block.title)}
              </h5>
              {block.originNote && (
                <span className="text-xs font-medium text-slate-500">
                  · {block.originNote}
                </span>
              )}
            </header>
          )}

          <ul className="space-y-3">
            {block.items.map((item, iIdx) => {
              const leadMatch = item.match(/^\*\*([^*]+?):\*\*\s*(.+)$/);

              return (
                <li
                  key={iIdx}
                  className="flex items-start gap-3 text-[15px] leading-[1.7] text-slate-700"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-[2px] bg-[#008542] mt-[0.68em] shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    {leadMatch ? (
                      <>
                        <strong className="font-bold text-[#071F14]">
                          {renderChemicalAndMathText(leadMatch[1])}:
                        </strong>{' '}
                        <span>{renderInlineStudyText(leadMatch[2])}</span>
                      </>
                    ) : (
                      <span>{renderInlineStudyText(item)}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
