import type { ReactNode } from 'react';
import { GROUP_COLOR, RECORDS, type Rec } from './model';

export type StripLayout = { x: number; w: number; rec: Rec }[];

export function layoutStrip(width: number, records: Rec[] = RECORDS, gap = 2): StripLayout {
  const units = records.reduce((a, r) => a + r.units, 0);
  const avail = width - gap * (records.length - 1);
  const u = avail / units;
  let x = 0;
  return records.map((rec) => {
    const w = rec.units * u;
    const item = { x, w, rec };
    x += w + gap;
    return item;
  });
}

/**
 * The file as a row of records. Each record is a block colored by what it does.
 * `visible` lets callers reveal records progressively (writing) or cut the file (crash).
 */
export function Strip({
  layout,
  y,
  h,
  visible = () => 1,
  state = () => 'normal',
  onPick,
  selected,
  hatchId,
  partial,
}: {
  layout: StripLayout;
  y: number;
  h: number;
  visible?: (rec: Rec, i: number) => number; // 0..1 reveal amount
  state?: (rec: Rec) => 'normal' | 'dim' | 'hot' | 'read';
  onPick?: (rec: Rec) => void;
  selected?: string | null;
  hatchId?: string;
  partial?: { key: string; frac: number } | null;
}): ReactNode {
  return (
    <g>
      {hatchId && (
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--bad)" strokeWidth="1.5" />
          </pattern>
        </defs>
      )}
      {layout.map(({ x, w, rec }, i) => {
        const v = visible(rec, i);
        if (v <= 0) return null;
        const st = state(rec);
        const color = GROUP_COLOR[rec.group];
        const isSel = selected === rec.key;
        const fillOpacity = st === 'dim' ? 0.18 : st === 'hot' ? 1 : st === 'read' ? 0.75 : 0.55;
        const isPartial = partial && partial.key === rec.key;
        const ww = isPartial ? w * partial!.frac : w * v;
        return (
          <g
            key={rec.key}
            onClick={onPick ? () => onPick(rec) : undefined}
            style={onPick ? { cursor: 'pointer' } : undefined}
            role={onPick ? 'button' : undefined}
            tabIndex={onPick ? 0 : undefined}
            aria-label={onPick ? `${rec.name} record` : undefined}
            onKeyDown={
              onPick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPick(rec);
                    }
                  }
                : undefined
            }
            className="strip-rec"
          >
            <rect x={x} y={y} width={Math.max(1, ww)} height={h} rx={Math.min(4, w / 3)} fill={color} fillOpacity={fillOpacity} />
            {isPartial && hatchId && (
              <rect x={x + ww} y={y} width={w - ww} height={h} rx={2} fill={`url(#${hatchId})`} stroke="var(--bad)" strokeDasharray="3 3" />
            )}
            {(isSel || st === 'hot') && (
              <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} rx={5} fill="none" stroke="var(--screen-ink)" strokeWidth={isSel ? 2 : 1.5} />
            )}
            {rec.name === 'Chunk' && w > 46 && v >= 1 && (
              <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen)" fillOpacity={st === 'dim' ? 0.5 : 0.9}>
                {rec.t0}–{rec.t1} s
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Section brackets above the strip: data, summary, end. */
export function SectionBrackets({ layout, y }: { layout: StripLayout; y: number }) {
  const span = (section: Rec['section']) => {
    const items = layout.filter((l) => l.rec.section === section);
    if (!items.length) return null;
    const x0 = items[0].x;
    const x1 = items[items.length - 1].x + items[items.length - 1].w;
    return { x0, x1 };
  };
  const parts: [Rec['section'], string][] = [
    ['data', 'data section · written as messages arrive'],
    ['summary', 'summary · written on close'],
    ['end', 'footer'],
  ];
  return (
    <g>
      {parts.map(([sec, label]) => {
        const s = span(sec);
        if (!s) return null;
        const narrow = s.x1 - s.x0 < 120;
        return (
          <g key={sec}>
            <path d={`M${s.x0},${y + 8} V${y + 2} H${s.x1} V${y + 8}`} fill="none" stroke="var(--screen-ink-3)" strokeWidth={1} />
            <text x={narrow ? s.x1 : s.x0} y={y - 4} textAnchor={narrow ? 'end' : 'start'} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
              {narrow ? sec : label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
