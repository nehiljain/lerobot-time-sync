import { useMemo, useState } from 'react';
import { useElementWidth, useInView, usePrefersReducedMotion, useRafLoop } from '../lib/hooks';
import { clamp, mulberry32 } from '../lib/math';
import { pageHref } from '../site';

/* One interleaved stream in, one table per topic out, then the alignment step from Part 1. */

const LANES = [
  { id: 'cam', label: '/cam_front/image_raw', color: 'var(--ch-cam)', rate: 3, big: true },
  { id: 'joints', label: '/joint_states', color: 'var(--ch-joint)', rate: 9, big: false },
  { id: 'cmd', label: '/teleop/cmd', color: 'var(--ch-action)', rate: 5, big: false },
  { id: 'grip', label: '/gripper/state', color: 'var(--ch-grip)', rate: 0.7, big: false },
];

const SPAN = 12; // seconds of stream generated, looped

export function BagToRows() {
  const reduced = usePrefersReducedMotion();
  const [ref, W] = useElementWidth<HTMLDivElement>(1000);
  const [viewRef, inView] = useInView<HTMLDivElement>('0px', false);
  const [t, setT] = useState(4);
  useRafLoop(inView && !reduced, (dt) => setT((x) => x + dt));

  const msgs = useMemo(() => {
    const rnd = mulberry32(4);
    const out: { t: number; lane: number }[] = [];
    LANES.forEach((l, i) => {
      for (let k = 0; k < SPAN * l.rate; k++) out.push({ t: (k + rnd() * 0.6) / l.rate, lane: i });
    });
    return out.sort((a, b) => a.t - b.t);
  }, []);

  const compact = W < 720;
  const H = 230;
  const tapeY = 52;
  const xSplit = compact ? W * 0.3 : W * 0.34;
  const xAlign = W - (compact ? 86 : 150);
  const laneY = (i: number) => 104 + i * 30;
  const speed = (xAlign - 20) / 5.5; // px per second

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }} ref={viewRef}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 6</b> &nbsp;From one bag stream to rows
        </div>
      </div>
      <div className="fig__body" ref={ref}>
        <svg className="fig__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Messages from the bag arrive interleaved, get grouped by topic into separate tables, then aligned onto one grid.">
          <text x={0} y={tapeY - 16} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            bag: all topics, receive-time order
          </text>
          <line x1={0} x2={xSplit} y1={tapeY} y2={tapeY} stroke="var(--screen-rule)" strokeWidth={22} strokeLinecap="round" />
          <rect x={xSplit - 8} y={tapeY - 24} width={compact ? 70 : 104} height={48} rx={8} fill="var(--screen-2)" stroke="var(--screen-ink-3)" />
          <text x={xSplit + (compact ? 27 : 44)} y={tapeY - 3} textAnchor="middle" fontSize={compact ? 9.5 : 11} fill="var(--screen-ink)" fontFamily="var(--font-mono)">
            group by
          </text>
          <text x={xSplit + (compact ? 27 : 44)} y={tapeY + 12} textAnchor="middle" fontSize={compact ? 9.5 : 11} fill="var(--screen-ink)" fontFamily="var(--font-mono)">
            topic
          </text>
          {LANES.map((l, i) => (
            <g key={l.id}>
              <path
                d={`M${xSplit + (compact ? 62 : 96)},${tapeY} C${xSplit + 130},${tapeY} ${xSplit + 90},${laneY(i)} ${xSplit + 150},${laneY(i)} L${xAlign},${laneY(i)}`}
                fill="none"
                stroke="var(--screen-grid)"
                strokeWidth={2}
              />
              {!compact && (
                <text x={xSplit + 156} y={laneY(i) - 8} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                  {l.label}
                </text>
              )}
            </g>
          ))}
          <a href={pageHref('lerobot') + '#sync'}>
            <rect x={xAlign + 6} y={laneY(0) - 18} width={W - xAlign - 8} height={laneY(3) - laneY(0) + 36} rx={10} fill="rgba(224,164,58,0.12)" stroke="var(--focus-screen)" />
            <text x={xAlign + (W - xAlign) / 2} y={laneY(1) + 4} textAnchor="middle" fontSize={compact ? 10 : 12} fontWeight={700} fill="var(--screen-ink)">
              align
            </text>
            <text x={xAlign + (W - xAlign) / 2} y={laneY(2) + 2} textAnchor="middle" fontSize={compact ? 9 : 10.5} fill="var(--screen-ink-2)" fontFamily="var(--font-mono)">
              {compact ? 'Part 1' : 'see Part 1 →'}
            </text>
          </a>

          {/* messages */}
          {msgs.map((m, k) => {
            const local = ((t - m.t) % SPAN + SPAN) % SPAN;
            const x = local * speed;
            if (x > xAlign || x < -10) return null;
            const l = LANES[m.lane];
            let y = tapeY;
            let xx = x;
            if (x > xSplit + 40) {
              const p = clamp((x - (xSplit + 40)) / 110, 0, 1);
              const e = p * p * (3 - 2 * p);
              y = tapeY + (laneY(m.lane) - tapeY) * e;
              xx = x;
            }
            return l.big ? (
              <rect key={k} x={xx - 6} y={y - 8} width={12} height={16} rx={2} fill={l.color} />
            ) : (
              <circle key={k} cx={xx} cy={y} r={3.4} fill={l.color} />
            );
          })}
        </svg>
      </div>
      <p className="fig__note">
        A bag is one stream sorted by receive time. Training wants one table per topic, then one row per tick. The grouping is easy; the
        alignment is the work.
      </p>
    </figure>
  );
}
