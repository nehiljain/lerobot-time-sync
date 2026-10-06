import { useState } from 'react';
import { Seg } from './controls';

export type Gotcha = {
  status: 'open' | 'workaround' | 'fixed';
  area: string;
  title: string;
  body: string;
  fix?: string;
  links: { href: string; label: string }[];
};

/** Backticks mark commands and identifiers; render those spans in the mono face. */
function rich(text: string) {
  return text.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

const STATUS_LABEL: Record<Gotcha['status'], string> = {
  open: 'Unsolved',
  workaround: 'Workaround',
  fixed: 'Fixed, still bites',
};

/** Community pain points as a filterable wall of cards. Every card links to its source. */
export function GotchaWall({ items, label }: { items: Gotcha[]; label: string }) {
  const [filter, setFilter] = useState<'all' | Gotcha['status']>('all');
  const shown = items.filter((g) => filter === 'all' || g.status === filter);
  const count = (s: Gotcha['status']) => items.filter((g) => g.status === s).length;
  return (
    <div>
      <div className="gotcha-filter">
        <Seg
          label={label}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All ${items.length}` },
            { value: 'open', label: `Unsolved ${count('open')}` },
            { value: 'workaround', label: `Workaround ${count('workaround')}` },
            { value: 'fixed', label: `Fixed, still bites ${count('fixed')}` },
          ]}
        />
      </div>
      <div className="gotchas" aria-live="polite">
        {shown.map((g) => (
          <article key={g.title} className="gotcha">
            <div className="gotcha__top">
              <span className={`gotcha__tag gotcha__tag--${g.status}`}>{STATUS_LABEL[g.status]}</span>
              <span className="gotcha__area">{g.area}</span>
            </div>
            <h3>{g.title}</h3>
            <p>{rich(g.body)}</p>
            {g.fix && (
              <p className="gotcha__fix">
                <b>Do this:</b> {rich(g.fix)}
              </p>
            )}
            <div className="gotcha__links">
              {g.links.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
