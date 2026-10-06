import { useEffect, useState, type ReactNode } from 'react';
import { SERIES, pageHref, type PageId } from '../site';

type Section = { id: string; label: string };

/** Sticky bar: the series on the left, this page's sections in a menu on the right. */
export function Topbar({ page, sections }: { page: PageId; sections: Section[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? h.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, [sections]);

  return (
    <header className="topbar">
      <div className="wrap-wide topbar__inner">
        <a className="topbar__mark" href={pageHref('lerobot')} aria-label="Robot data, explained: series home">
          <Mark />
          <span className="topbar__series">Robot data, explained</span>
        </a>
        <nav className="series-tabs" aria-label="Series">
          {SERIES.map((s, i) => (
            <a key={s.id} className="series-tabs__tab" href={pageHref(s.id)} aria-current={s.id === page ? 'page' : undefined}>
              <span className="series-tabs__n">{i + 1}</span>
              {s.tab}
            </a>
          ))}
        </nav>
        <details className="toc">
          <summary>On this page</summary>
          <nav aria-label="Sections">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={active === s.id ? 'true' : undefined}
                onClick={(e) => (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </details>
      </div>
      <div className="topbar__progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    </header>
  );
}

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#111a22" />
      <path d="M9 7v18M16 7v18M23 7v18" stroke="#2b3a49" strokeWidth="1.5" />
      <circle cx="9" cy="11" r="2.6" fill="#c4870f" />
      <circle cx="16" cy="16" r="2.6" fill="#3c9ad1" />
      <circle cx="23" cy="21" r="2.6" fill="#d45a9e" />
    </svg>
  );
}

/** Hero eyebrow that places the page in the series. */
export function SeriesEyebrow({ page, extra }: { page: PageId; extra?: string }) {
  const i = SERIES.findIndex((s) => s.id === page);
  return (
    <div className="eyebrow">
      Robot data, explained · Part {i + 1} of {SERIES.length}
      {extra ? ` · ${extra}` : ''}
    </div>
  );
}

export type SourceItem = { href: string; label: string; note: string };

/** Footer: sources for this page, then the rest of the series. */
export function PageFooter({ page, intro, sources }: { page: PageId; intro: ReactNode; sources: SourceItem[] }) {
  const others = SERIES.filter((s) => s.id !== page);
  return (
    <footer className="footer">
      <div className="wrap-wide">
        <h2>Sources</h2>
        <p style={{ marginTop: 10, maxWidth: '46rem' }}>{intro}</p>
        <ul className="sources">
          {sources.map((s) => (
            <li key={s.href + s.label}>
              <a href={s.href}>{s.label}</a>
              <span>{s.note}</span>
            </li>
          ))}
        </ul>
        <h2 style={{ marginTop: 56 }}>More in this series</h2>
        <div className="next-cards">
          {others.map((s) => (
            <a key={s.id} className="next-card" href={pageHref(s.id)}>
              <span className="next-card__n mono">
                Part {SERIES.findIndex((x) => x.id === s.id) + 1} · {s.tab}
              </span>
              <span className="next-card__title">{s.title}</span>
              <span className="next-card__blurb">{s.blurb}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
