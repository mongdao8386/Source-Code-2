import { Fragment, type ReactNode } from 'react';

/**
 * Dependency-free, XSS-safe renderer for the small Markdown subset the CMS
 * allows in page bodies. Produces React elements only — no raw HTML is ever
 * injected, so untrusted `dangerouslySetInnerHTML` is avoided entirely.
 *
 * Supported: #/##/### headings, - bullet lists, 1. ordered lists, blank-line
 * paragraphs, **bold**, *italic*, [text](https url), `code`.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const re =
    /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) tokens.push(text.slice(last, match.index));
    const key = `${keyBase}-${i++}`;
    if (match[2]) tokens.push(<strong key={key}>{match[2]}</strong>);
    else if (match[4]) tokens.push(<em key={key}>{match[4]}</em>);
    else if (match[6])
      tokens.push(
        <code key={key} className="bg-surface-2 px-1 py-0.5 text-[0.85em]">
          {match[6]}
        </code>,
      );
    else if (match[8] && match[9])
      tokens.push(
        <a
          key={key}
          href={match[9]}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-gold underline underline-offset-4"
        >
          {match[8]}
        </a>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

export function Prose({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p-${k++}`} className="my-4 leading-relaxed text-bone-dim">
          {inline(para.join(' '), `p-${k}`)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul';
      const cls = list.ordered ? 'list-decimal' : 'list-disc';
      blocks.push(
        <Tag key={`l-${k++}`} className={`my-4 ${cls} space-y-2 pl-6 text-bone-dim`}>
          {list.items.map((it, idx) => (
            <li key={idx}>{inline(it, `li-${k}-${idx}`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);

    if (h) {
      flushPara();
      flushList();
      const level = h[1]!.length;
      const content = inline(h[2]!, `h-${k}`);
      if (level === 1)
        blocks.push(
          <h2 key={`h-${k++}`} className="mt-10 font-display text-3xl text-bone">
            {content}
          </h2>,
        );
      else if (level === 2)
        blocks.push(
          <h3 key={`h-${k++}`} className="mt-8 font-display text-2xl text-bone">
            {content}
          </h3>,
        );
      else
        blocks.push(
          <h4 key={`h-${k++}`} className="mt-6 text-lg font-medium text-bone">
            {content}
          </h4>,
        );
    } else if (ul) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]!);
    } else if (ol) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]!);
    } else if (line === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="max-w-2xl">{blocks.map((b, i) => (
    <Fragment key={i}>{b}</Fragment>
  ))}</div>;
}
