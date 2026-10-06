import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Code } from '../components/Code';
import { usePrefersReducedMotion } from '../lib/hooks';
import { pageHref } from '../site';
import { EDGES, FORMATS, POLICIES, STATUS_LABEL, type Edge, type FormatId, type PolicyId } from './data';

/*
  The ecosystem as one clickable map. Left: logs that record events. Middle: the align step (Part 1).
  Right of that: training formats that store snapshots. Far right: the trainers that read them.
*/

type Sel = { type: 'format'; id: FormatId } | { type: 'policy'; id: PolicyId } | { type: 'edge'; i: number };

const VB_W = 1120;
const VB_H = 640;
const NODE_W = 168;
const NODE_H = 46;

const LOG_X = 58;
const TRAIN_X = 520;
const POLICY_X = 900;

const POS: Record<FormatId, { x: number; y: number }> = {
  custom: { x: LOG_X, y: 96 },
  rosbag1: { x: LOG_X, y: 196 },
  rosbag2: { x: LOG_X, y: 296 },
  mcap: { x: LOG_X, y: 396 },
  viz: { x: 286, y: 548 },
  lerobot3: { x: TRAIN_X, y: 78 },
  lerobot2: { x: TRAIN_X, y: 158 },
  rlds: { x: TRAIN_X, y: 238 },
  hdf5: { x: TRAIN_X, y: 318 },
  zarr: { x: TRAIN_X, y: 398 },
  wds: { x: TRAIN_X, y: 478 },
  lance: { x: TRAIN_X, y: 558 },
};

const PPOS: Record<PolicyId, { x: number; y: number }> = {
  lerobotp: { x: POLICY_X, y: 58 },
  openpi: { x: POLICY_X, y: 128 },
  gr00t: { x: POLICY_X, y: 198 },
  openvla: { x: POLICY_X, y: 268 },
  robomimic: { x: POLICY_X, y: 338 },
  act: { x: POLICY_X, y: 408 },
  dp: { x: POLICY_X, y: 478 },
  rdt2: { x: POLICY_X, y: 548 },
};

const ALIGN = { x: 292, y: 70, w: 160, h: 420 };

const dash = (s: Edge['status']) => (s === 'official' ? undefined : s === 'vendor' ? '7 4' : '2 4');

function edgePath(e: Edge): string {
  const a = POS[e.from];
  const b = POS[e.to];
  const logs: FormatId[] = ['custom', 'rosbag1', 'rosbag2', 'mcap'];
  const sameCol = (logs.includes(e.from) && logs.includes(e.to)) || (a.x === b.x && a.x === TRAIN_X);
  if (e.to === 'viz') {
    const sx = e.from === 'mcap' ? a.x + NODE_W / 2 : a.x;
    const sy = e.from === 'mcap' ? a.y + NODE_H : a.y + NODE_H / 2;
    return `M${sx},${sy} C${sx},${b.y - 30} ${b.x + NODE_W / 2},${b.y - 50} ${b.x + NODE_W / 2},${b.y}`;
  }
  if (sameCol) {
    // arcs: left side for logs and for edges into LeRobot v3, right side for edges out of it
    const isLog = logs.includes(e.from);
    const left = isLog || e.to === 'lerobot3';
    const x = left ? a.x : a.x + NODE_W;
    const reach = isLog ? 24 + Math.abs(a.y - b.y) * 0.08 : 38 + Math.abs(a.y - b.y) * 0.12;
    const bulge = left ? -reach : reach;
    return `M${x},${a.y + NODE_H / 2} C${x + bulge},${a.y + NODE_H / 2} ${x + bulge},${b.y + NODE_H / 2} ${x},${b.y + NODE_H / 2}`;
  }
  const sx = a.x + NODE_W;
  const sy = a.y + NODE_H / 2;
  const tx = b.x;
  const ty = b.y + NODE_H / 2;
  return `M${sx},${sy} C${sx + 140},${sy} ${tx - 140},${ty} ${tx},${ty}`;
}

export function FormatMap() {
  const reduced = usePrefersReducedMotion();
  const [sel, setSel] = useState<Sel>({ type: 'format', id: 'lerobot3' });
  const [hover, setHover] = useState<Sel | null>(null);
  const focus = hover ?? sel;

  const related = useMemo(() => {
    const edges = new Set<number>();
    const nodes = new Set<string>();
    const reads = new Set<string>();
    if (focus.type === 'format') {
      nodes.add(focus.id);
      EDGES.forEach((e, i) => {
        if (e.from === focus.id || e.to === focus.id) {
          edges.add(i);
          nodes.add(e.from);
          nodes.add(e.to);
        }
      });
      POLICIES.forEach((p) => {
        if (p.reads === focus.id || p.also === focus.id) {
          nodes.add(p.id);
          reads.add(`${p.id}:${focus.id}`);
        }
      });
    } else if (focus.type === 'policy') {
      const p = POLICIES.find((x) => x.id === focus.id)!;
      nodes.add(p.id);
      nodes.add(p.reads);
      reads.add(`${p.id}:${p.reads}`);
      if (p.also) {
        nodes.add(p.also);
        reads.add(`${p.id}:${p.also}`);
      }
    } else {
      const e = EDGES[focus.i];
      edges.add(focus.i);
      nodes.add(e.from);
      nodes.add(e.to);
    }
    return { edges, nodes, reads };
  }, [focus]);

  const dimmed = (key: string) => !related.nodes.has(key);
  const pick = (s: Sel) => setSel(s);
  const keyProps = (s: Sel, label: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick: () => pick(s),
    onMouseEnter: () => setHover(s),
    onMouseLeave: () => setHover(null),
    onFocus: () => setHover(s),
    onBlur: () => setHover(null),
    onKeyDown: (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        pick(s);
      }
    },
    style: { cursor: 'pointer' },
  });

  return (
    <figure className="fig fmap" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 1</b> &nbsp;The robot data map · click any box or arrow
        </div>
        <div className="fmap-legend" aria-hidden="true">
          <span>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke="var(--ink)" strokeWidth="2" />
            </svg>
            official tool
          </span>
          <span>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke="var(--ink)" strokeWidth="2" strokeDasharray="7 4" />
            </svg>
            vendor
          </span>
          <span>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke="var(--ink)" strokeWidth="2" strokeDasharray="2 4" />
            </svg>
            community
          </span>
        </div>
      </div>
      <div className="fmap__scroll">
        <svg className="fmap__svg" viewBox={`0 0 ${VB_W} ${VB_H}`} role="group" aria-label="Robot data formats, the align step, and trainers">
          <defs>
            <marker id="fm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--ink)" />
            </marker>
            <marker id="fm-arrow-dim" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="#b8c1b9" />
            </marker>
            <pattern id="fm-align" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(196,135,15,0.18)" strokeWidth="5" />
            </pattern>
          </defs>

          {/* column labels */}
          {[
            { x: LOG_X, t: 'RECORD · events' },
            { x: ALIGN.x, t: 'ALIGN · Part 1' },
            { x: TRAIN_X, t: 'TRAIN ON · snapshots' },
            { x: POLICY_X, t: 'TRAINERS' },
          ].map((c) => (
            <text key={c.t} x={c.x} y={30} fontSize={11} fontFamily="var(--font-mono)" fontWeight={600} letterSpacing="0.08em" fill="var(--ink-3)">
              {c.t}
            </text>
          ))}

          {/* the align band */}
          <a href={pageHref('lerobot') + '#sync'}>
            <rect x={ALIGN.x} y={ALIGN.y} width={ALIGN.w} height={ALIGN.h} rx={14} fill="url(#fm-align)" stroke="var(--ch-cam)" strokeDasharray="4 4" />
            <text x={ALIGN.x + ALIGN.w / 2} y={ALIGN.y + 30} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
              Align
            </text>
            <text x={ALIGN.x + ALIGN.w / 2} y={ALIGN.y + 50} textAnchor="middle" fontSize={11} fill="var(--ink-2)">
              one clock, one fps,
            </text>
            <text x={ALIGN.x + ALIGN.w / 2} y={ALIGN.y + 65} textAnchor="middle" fontSize={11} fill="var(--ink-2)">
              one row per tick
            </text>
            <text x={ALIGN.x + ALIGN.w / 2} y={ALIGN.y + ALIGN.h - 18} textAnchor="middle" fontSize={10.5} fontFamily="var(--font-mono)" fill="var(--ink-3)">
              how: Part 1 →
            </text>
          </a>

          {/* reads: training format -> trainer */}
          {POLICIES.flatMap((p) =>
            [p.reads, p.also].filter(Boolean).map((f) => {
              const a = POS[f as FormatId];
              const b = PPOS[p.id];
              const on = related.reads.has(`${p.id}:${f}`);
              const sx = a.x + NODE_W;
              const sy = a.y + NODE_H / 2;
              const tx = b.x;
              const ty = b.y + 18;
              return (
                <path
                  key={`${p.id}-${f}`}
                  d={`M${sx},${sy} C${sx + 90},${sy} ${tx - 90},${ty} ${tx},${ty}`}
                  fill="none"
                  stroke={on ? 'var(--ink)' : '#c9d1ca'}
                  strokeWidth={on ? 1.8 : 1}
                  strokeDasharray={f === p.also ? '3 3' : undefined}
                />
              );
            }),
          )}

          {/* conversions */}
          {EDGES.map((e, i) => {
            const on = related.edges.has(i);
            const d = edgePath(e);
            return (
              <g key={i} {...keyProps({ type: 'edge', i }, `${e.tool}: ${e.from} to ${e.to}`)}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                <path
                  d={d}
                  fill="none"
                  stroke={on ? 'var(--ink)' : '#b8c1b9'}
                  strokeWidth={on ? 2.2 : 1.3}
                  strokeDasharray={dash(e.status)}
                  markerEnd={on ? 'url(#fm-arrow)' : 'url(#fm-arrow-dim)'}
                />
                {on && !reduced && (
                  <circle r={3.4} fill="var(--ch-cam)">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* format nodes */}
          {FORMATS.map((f) => {
            const p = POS[f.id];
            const isSel = sel.type === 'format' && sel.id === f.id;
            const dim = dimmed(f.id);
            const fill = f.kind === 'log' ? '#111a22' : f.kind === 'viz' ? '#ffffff' : '#ffffff';
            const ink = f.kind === 'log' ? 'var(--screen-ink)' : 'var(--ink)';
            const sub = f.kind === 'log' ? 'var(--screen-ink-3)' : 'var(--ink-3)';
            return (
              <g key={f.id} opacity={dim ? 0.45 : 1} {...keyProps({ type: 'format', id: f.id }, `${f.name}, ${f.short}`)}>
                <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={9} fill={fill} stroke={isSel ? 'var(--ch-cam)' : f.kind === 'log' ? '#0b1117' : 'var(--rule-strong)'} strokeWidth={isSel ? 3 : 1.2} />
                <text x={p.x + 14} y={p.y + 20} fontSize={13.5} fontWeight={700} fill={ink}>
                  {f.name}
                </text>
                <text x={p.x + 14} y={p.y + 36} fontSize={10.5} fontFamily="var(--font-mono)" fill={sub}>
                  {f.short}
                </text>
              </g>
            );
          })}

          {/* trainer nodes */}
          {POLICIES.map((p) => {
            const q = PPOS[p.id];
            const isSel = sel.type === 'policy' && sel.id === p.id;
            return (
              <g key={p.id} opacity={dimmed(p.id) ? 0.45 : 1} {...keyProps({ type: 'policy', id: p.id }, `${p.name}: ${p.models}`)}>
                <rect x={q.x} y={q.y} width={206} height={38} rx={19} fill={isSel ? 'var(--ink)' : 'var(--card-2)'} stroke={isSel ? 'var(--ink)' : 'var(--rule-strong)'} />
                <text x={q.x + 16} y={q.y + 23.5} fontSize={12.5} fontWeight={600} fill={isSel ? 'var(--paper)' : 'var(--ink)'}>
                  {p.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <MapDetail sel={sel} onPick={pick} />
    </figure>
  );
}

function Chip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="fchip" onClick={onClick}>
      {children}
    </button>
  );
}

function MapDetail({ sel, onPick }: { sel: Sel; onPick: (s: Sel) => void }) {
  if (sel.type === 'edge') {
    const e = EDGES[sel.i];
    const from = FORMATS.find((f) => f.id === e.from)!;
    const to = FORMATS.find((f) => f.id === e.to)!;
    return (
      <div className="fdetail" aria-live="polite">
        <div className="fdetail__head">
          <span className={`fstatus fstatus--${e.status}`}>{STATUS_LABEL[e.status]}</span>
          <h3>{e.tool}</h3>
        </div>
        <div className="fdetail__route">
          <Chip onClick={() => onPick({ type: 'format', id: from.id })}>{from.name}</Chip>
          <span aria-hidden="true">→</span>
          <Chip onClick={() => onPick({ type: 'format', id: to.id })}>{to.name}</Chip>
        </div>
        <p className="fdetail__what">{e.note}</p>
        <Code title="Command" note="see the tool's docs for every flag">
          {e.cmd}
        </Code>
        <a className="fdetail__link" href={e.link}>
          Source: {e.link.replace('https://', '').slice(0, 72)}
        </a>
      </div>
    );
  }
  if (sel.type === 'policy') {
    const p = POLICIES.find((x) => x.id === sel.id)!;
    const reads = FORMATS.find((f) => f.id === p.reads)!;
    const also = p.also ? FORMATS.find((f) => f.id === p.also) : null;
    return (
      <div className="fdetail" aria-live="polite">
        <div className="fdetail__head">
          <span className="fstatus fstatus--policy">trainer</span>
          <h3>{p.name}</h3>
          <span className="fdetail__sub mono">{p.models}</span>
        </div>
        <div className="fdetail__route">
          <span className="fdetail__k">reads</span>
          <Chip onClick={() => onPick({ type: 'format', id: reads.id })}>{reads.name}</Chip>
          {also && (
            <>
              <span className="fdetail__k">and</span>
              <Chip onClick={() => onPick({ type: 'format', id: also.id })}>{also.name}</Chip>
            </>
          )}
        </div>
        <p className="fdetail__what">{p.note}</p>
        <a className="fdetail__link" href={p.link}>
          Source: {p.link.replace('https://', '').slice(0, 72)}
        </a>
      </div>
    );
  }
  const f = FORMATS.find((x) => x.id === sel.id)!;
  const into = EDGES.map((e, i) => ({ e, i })).filter(({ e }) => e.to === f.id);
  const out = EDGES.map((e, i) => ({ e, i })).filter(({ e }) => e.from === f.id);
  const readers = POLICIES.filter((p) => p.reads === f.id || p.also === f.id);
  return (
    <div className="fdetail" aria-live="polite">
      <div className="fdetail__head">
        <span className={`fstatus fstatus--${f.kind}`}>{f.kind === 'log' ? 'log · events' : f.kind === 'viz' ? 'viewer' : 'training format · snapshots'}</span>
        <h3>{f.name}</h3>
        <span className="fdetail__sub mono">{f.short}</span>
      </div>
      <p className="fdetail__what">{f.what}</p>
      <div className="fdetail__grid">
        <div>
          <pre className="ftree mono">
            {f.tree.map((t, k) => (
              <span key={k} className={t.hl ? 'is-hl' : undefined}>
                {t.line}
                {t.note ? <em>{'  '}{t.note}</em> : null}
                {'\n'}
              </span>
            ))}
          </pre>
          <dl className="fdetail__facts">
            <dt>episode 7 is</dt>
            <dd>{f.episode7}</dd>
            <dt>access</dt>
            <dd>{f.access}</dd>
            <dt>images</dt>
            <dd>{f.images}</dd>
          </dl>
        </div>
        <div>
          <Code title="Read it" note="adapted from the official docs">
            {f.read.code}
          </Code>
          <a className="fdetail__link" href={f.read.src}>
            Snippet source
          </a>
          {(into.length > 0 || out.length > 0 || readers.length > 0) && (
            <div className="fdetail__conns">
              {into.length > 0 && (
                <div>
                  <span className="fdetail__k">convert in from</span>
                  {into.map(({ e, i }) => (
                    <Chip key={i} onClick={() => onPick({ type: 'edge', i })}>
                      {FORMATS.find((x) => x.id === e.from)!.name} · {e.tool.split(',')[0]}
                    </Chip>
                  ))}
                </div>
              )}
              {out.length > 0 && (
                <div>
                  <span className="fdetail__k">convert out to</span>
                  {out.map(({ e, i }) => (
                    <Chip key={i} onClick={() => onPick({ type: 'edge', i })}>
                      {FORMATS.find((x) => x.id === e.to)!.name} · {e.tool.split(',')[0]}
                    </Chip>
                  ))}
                </div>
              )}
              {readers.length > 0 && (
                <div>
                  <span className="fdetail__k">read by</span>
                  {readers.map((p) => (
                    <Chip key={p.id} onClick={() => onPick({ type: 'policy', id: p.id })}>
                      {p.name}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <a className="fdetail__link" href={f.link}>
        Format reference: {f.link.replace('https://', '').slice(0, 72)}
      </a>
    </div>
  );
}
