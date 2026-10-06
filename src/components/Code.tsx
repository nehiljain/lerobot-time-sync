import { Fragment, type ReactNode } from 'react';

const KEYWORDS = new Set([
  'def', 'return', 'import', 'from', 'for', 'in', 'as', 'if', 'else', 'lambda', 'with', 'None', 'True', 'False',
]);

/** Just enough Python highlighting for short snippets: comments, strings, numbers, keywords. */
function highlight(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const [tok, comment, str, num, word] = m;
    if (comment) out.push(<span key={key++} className="tok-c">{tok}</span>);
    else if (str) out.push(<span key={key++} className="tok-s">{tok}</span>);
    else if (num) out.push(<span key={key++} className="tok-n">{tok}</span>);
    else if (word && KEYWORDS.has(word)) out.push(<span key={key++} className="tok-k">{tok}</span>);
    else out.push(<Fragment key={key++}>{tok}</Fragment>);
    last = m.index + tok.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export function Code({ children, title, note }: { children: string; title?: string; note?: string }) {
  return (
    <figure style={{ margin: 0 }}>
      {(title || note) && (
        <figcaption className="code-head">
          <span>{title}</span>
          {note && <span>{note}</span>}
        </figcaption>
      )}
      <pre className="code">
        <code>{highlight(children.trim())}</code>
      </pre>
    </figure>
  );
}
