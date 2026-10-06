import { useEffect, useMemo, useRef, useState } from 'react';
import { FrameGlyph, MissingFrame } from '../components/FrameGlyph';
import { IconReplay, Seg } from '../components/controls';
import { useElementWidth, usePrefersReducedMotion, useRafLoop } from '../lib/hooks';
import { clamp, easeInOut, fmtMs, fmtTs, lerp, linear } from '../lib/math';
import { DT, FPS, LOGS, STREAM_OFFSET, holdAt, interpAt, nearestFrame, type Frame } from '../lib/world';

/* opening sequence, seconds */
const T_DRAW: [number, number] = [0.15, 1.15];
const T_SHIFT: [number, number] = [1.5, 2.4];
const T_SWEEP: [number, number] = [2.75, 4.75];
const T_END = 4.9;

const LANES = [
  { id: 'cam', name: 'Front camera', meta: '30 Hz · camera PC', short: 'CAM', color: 'var(--ch-cam)' },
  { id: 'joint', name: 'Joint encoders', meta: '500 Hz · robot PC', short: 'JNT', color: 'var(--ch-joint)' },
  { id: 'action', name: 'Teleop commands', meta: '100 Hz · teleop PC', short: 'CMD', color: 'var(--ch-action)' },
  { id: 'grip', name: 'Gripper state', meta: 'on change · robot PC', short: 'GRP', color: 'var(--ch-grip)' },
] as const;

type LaneId = (typeof LANES)[number]['id'];
const OFFSET: Record<LaneId, number> = STREAM_OFFSET;

export type HeroRow = {
  k: number;
  t: number;
  frame: Frame | null;
  frameDist: number;
  state: number;
  action: number;
  grip: number;
};

/** What alignment produces: one row per 30 Hz tick. */
export function heroRow(k: number): HeroRow {
  const t = k * DT;
  const { frame, dist } = nearestFrame(LOGS.frames, t, DT / 2, (f) => f.logged - OFFSET.cam);
  return {
    k,
    t,
    frame,
    frameDist: dist,
    state: interpAt(LOGS.joints, t + OFFSET.joint),
    action: interpAt(LOGS.teleop, t + OFFSET.action),
    grip: holdAt(LOGS.grip, t + OFFSET.grip),
  };
}

const ROWS: HeroRow[] = Array.from({ length: 30 }, (_, k) => heroRow(k));

export function HeroScope() {
  const reduced = usePrefersReducedMotion();
  const [wrapRef, W] = useElementWidth<HTMLDivElement>(1000);
  const [clock, setClock] = useState(reduced ? T_END : 0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<'raw' | 'aligned'>('aligned');
  const [hoverK, setHoverK] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (reduced) return;
    const id = window.setTimeout(() => setPlaying(true), 350);
    return () => window.clearTimeout(id);
  }, [reduced]);

  useRafLoop(playing, (dt) => {
    setClock((c) => {
      const next = c + dt;
      if (next >= T_END) {
        setPlaying(false);
        return T_END;
      }
      return next;
    });
  });

  const replay = () => {
    setView('aligned');
    setHoverK(null);
    if (reduced) {
      setClock(T_END);
      return;
    }
    setClock(0);
    setPlaying(true);
  };

  const pickView = (v: 'raw' | 'aligned') => {
    setView(v);
    setPlaying(false);
    setHoverK(null);
    setClock(v === 'raw' ? T_SHIFT[0] - 0.01 : T_END);
  };

  const drawP = clamp((clock - T_DRAW[0]) / (T_DRAW[1] - T_DRAW[0]), 0, 1);
  const shiftP = easeInOut((clock - T_SHIFT[0]) / (T_SHIFT[1] - T_SHIFT[0]));
  const sweepP = clamp((clock - T_SWEEP[0]) / (T_SWEEP[1] - T_SWEEP[0]), 0, 1);
  const done = clock >= T_END;

  /* ---------- layout, in real pixels ---------- */
  const compact = W < 700;
  const labelW = compact ? 50 : 172;
  const x0 = labelW + 10;
  const x1 = W - 12;
  const k0 = compact ? 9 : 0;
  const k1 = compact ? 23 : 29;
  const tA = k0 * DT - DT / 2;
  const tB = k1 * DT + DT / 2;
  const x = linear(tA, tB, x0, x1);
  const cellW = (x1 - x0) / (k1 - k0 + 1);
  const top = 14;
  const laneH = compact ? 40 : 48;
  const laneGap = compact ? 8 : 10;
  const laneTop = (i: number) => top + i * (laneH + laneGap);
  const lanesBottom = laneTop(LANES.length) - laneGap;
  const rowsTop = lanesBottom + 46;
  const rowsH = 60;
  const H = rowsTop + rowsH + 30;
  const yIn = (i: number, v: number) => laneTop(i) + laneH / 2 - v * (laneH / 2 - 6);
  const ts = lerp(tA, tB, sweepP);
  const visibleK = ROWS.filter((r) => r.k >= k0 && r.k <= k1);

  /* ---------- lanes (memoized: they only move during the shift) ---------- */
  const lanes = useMemo(() => {
    const drawn = (logged: number, id: LaneId) => logged - OFFSET[id] * shiftP;
    const inWin = (t: number) => t > tA - 0.08 && t < tB + 0.08;

    const fw = Math.min(cellW * 0.74, 24);
    const fh = laneH * 0.6;
    const cam = LOGS.frames
      .filter((f) => !f.dropped)
      .map((f) => ({ f, t: drawn(f.logged, 'cam') }))
      .filter((d) => inWin(d.t));

    const jpts = LOGS.joints.map((s) => ({ t: drawn(s.t, 'joint'), v: s.v })).filter((d) => inWin(d.t));
    const jpath = jpts.map((d, i) => `${i ? 'L' : 'M'}${x(d.t).toFixed(1)},${yIn(1, d.v).toFixed(1)}`).join('');

    const tpts = LOGS.teleop.map((s) => ({ t: drawn(s.t, 'action'), v: s.v })).filter((d) => inWin(d.t));

    const gEvt = drawn(LOGS.grip[1].t, 'grip');
    const gy0 = yIn(3, -0.7);
    const gy1 = yIn(3, 0.7);

    return (
      <g>
        {cam.map(({ f, t }) => (
          <FrameGlyph key={f.k} x={x(t)} y={laneTop(0) + laneH / 2} w={fw} h={fh} pose={f.pose} grip={f.grip} />
        ))}
        <path d={jpath} fill="none" stroke="var(--ch-joint)" strokeWidth={1.4} strokeLinejoin="round" />
        {jpts.map((d, i) => (
          <circle key={i} cx={x(d.t)} cy={yIn(1, d.v)} r={0.95} fill="var(--ch-joint)" opacity={0.55} />
        ))}
        {tpts.map((d, i) => (
          <g key={i}>
            <line x1={x(d.t)} x2={x(d.t)} y1={laneTop(2) + laneH / 2} y2={yIn(2, d.v)} stroke="var(--ch-action)" strokeWidth={1} opacity={0.55} />
            <circle cx={x(d.t)} cy={yIn(2, d.v)} r={1.9} fill="var(--ch-action)" />
          </g>
        ))}
        <rect x={x(gEvt)} y={gy1} width={Math.max(0, x1 + 40 - x(gEvt))} height={gy0 - gy1} fill="var(--ch-grip)" opacity={0.12} />
        <path d={`M${x0 - 40},${gy0}H${x(gEvt)}V${gy1}H${x1 + 40}`} fill="none" stroke="var(--ch-grip)" strokeWidth={2} />
      </g>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, shiftP]);

  const status = !done
    ? clock < T_SHIFT[0]
      ? view === 'raw' && !playing
        ? 'Raw logs as written. Same grasp, four devices, four timelines.'
        : '1/3 · Raw logs: four streams, four rates, three clocks'
      : clock < T_SWEEP[0]
        ? '2/3 · One clock: shift each stream by its measured offset'
        : '3/3 · One grid: sample every stream at each 30 Hz tick'
    : 'Each tick becomes one LeRobot row · timestamp = frame_index / 30';

  const hover = hoverK !== null && done ? ROWS[hoverK] : null;

  const pickK = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    if (px < x0 - 4 || px > x1 + 4) return null;
    return clamp(Math.round(x.invert(px) / DT), k0, k1);
  };

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label" aria-live="polite">
          <b>Fig. 1</b> &nbsp;{status}
        </div>
        <div className="fig__controls">
          <Seg
            label="View"
            value={done ? 'aligned' : view === 'raw' && !playing ? 'raw' : 'aligned'}
            onChange={pickView}
            options={[
              { value: 'raw', label: 'Raw logs' },
              { value: 'aligned', label: 'Aligned' },
            ]}
          />
          <button type="button" className="btn" onClick={replay}>
            <IconReplay /> Replay
          </button>
        </div>
      </div>

      <div className="fig__body" ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          className="fig__svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Four sensor streams with different rates and clock offsets are shifted onto one clock, then sampled on a 30 Hz grid. Each grid tick becomes one dataset row."
          tabIndex={done ? 0 : -1}
          onPointerMove={(e) => done && setHoverK(pickK(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerDown={(e) => done && setHoverK(pickK(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setHoverK(null)}
          onKeyDown={(e) => {
            if (!done) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const d = e.key === 'ArrowRight' ? 1 : -1;
              setHoverK((k) => clamp((k ?? k0 - (d > 0 ? 1 : -1)) + d, k0, k1));
            }
            if (e.key === 'Escape') setHoverK(null);
          }}
          onBlur={() => setHoverK(null)}
        >
          <defs>
            <clipPath id="hero-plot">
              <rect x={x0 - 2} y={0} width={(x1 - x0 + 4) * drawP} height={H} />
            </clipPath>
          </defs>

          {/* lane guides and labels */}
          {LANES.map((lane, i) => (
            <g key={lane.id}>
              <line x1={x0} x2={x1} y1={laneTop(i) + laneH / 2} y2={laneTop(i) + laneH / 2} stroke="var(--screen-grid)" strokeWidth={1} />
              <rect x={0} y={laneTop(i) + (compact ? laneH / 2 - 4 : 7)} width={8} height={8} rx={2} fill={lane.color} />
              {compact ? (
                <text x={14} y={laneTop(i) + laneH / 2 + 3.5} fontFamily="var(--font-mono)" fontSize={10} fill="var(--screen-ink-2)">
                  {lane.short}
                </text>
              ) : (
                <>
                  <text x={16} y={laneTop(i) + 15} fontSize={13} fill="var(--screen-ink)" fontFamily="var(--font-body)">
                    {lane.name}
                  </text>
                  <text x={16} y={laneTop(i) + 30} fontSize={9.5} fill="var(--screen-ink-3)" fontFamily="var(--font-mono)">
                    {lane.meta}
                  </text>
                  <text x={16} y={laneTop(i) + 43} fontSize={9.5} fill="var(--screen-ink-2)" fontFamily="var(--font-mono)" opacity={shiftP}>
                    shift {fmtMs(-OFFSET[lane.id], true)}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* grid ticks laid down by the sweep */}
          {visibleK.map((r) =>
            ts >= r.t ? (
              <line key={r.k} x1={x(r.t)} x2={x(r.t)} y1={top - 6} y2={lanesBottom + 6} stroke="var(--screen-rule)" strokeWidth={1} />
            ) : null,
          )}

          <g clipPath="url(#hero-plot)">{lanes}</g>

          {/* samples taken at each tick */}
          {visibleK.map((r) => {
            if (ts < r.t) return null;
            const cx = x(r.t);
            const a = done ? 1 : clamp((ts - r.t) / 0.05, 0, 1);
            return (
              <g key={r.k} opacity={a}>
                {r.frame ? (
                  <rect
                    x={cx - Math.min(cellW * 0.74, 24) / 2 - 2.5}
                    y={laneTop(0) + laneH * 0.2 - 2.5}
                    width={Math.min(cellW * 0.74, 24) + 5}
                    height={laneH * 0.6 + 5}
                    rx={4}
                    fill="none"
                    stroke="var(--screen-ink)"
                    strokeWidth={1}
                    opacity={0.7}
                  />
                ) : (
                  <circle cx={cx} cy={laneTop(0) + laneH / 2} r={5} fill="none" stroke="var(--bad)" strokeWidth={1.5} />
                )}
                <circle cx={cx} cy={yIn(1, r.state)} r={3} fill="var(--screen-ink)" stroke="var(--screen)" strokeWidth={1.5} />
                <circle cx={cx} cy={yIn(2, r.action)} r={3} fill="var(--screen-ink)" stroke="var(--screen)" strokeWidth={1.5} />
                <circle cx={cx} cy={yIn(3, -0.7 + 1.4 * r.grip)} r={3} fill="var(--screen-ink)" stroke="var(--screen)" strokeWidth={1.5} />
              </g>
            );
          })}

          {/* sweep head */}
          {sweepP > 0 && sweepP < 1 && (
            <line x1={x(ts)} x2={x(ts)} y1={top - 10} y2={rowsTop + rowsH} stroke="var(--screen-ink)" strokeWidth={1.5} opacity={0.75} />
          )}

          {/* rows */}
          <g opacity={sweepP > 0 ? 1 : 0.3}>
            <rect x={0} y={rowsTop - 30} width={8} height={8} rx={2} fill="var(--screen-ink)" />
            <text x={14} y={rowsTop - 22} fontSize={13} fill="var(--screen-ink)" fontFamily="var(--font-body)">
              {compact ? 'Rows' : 'LeRobot rows, one per tick'}
            </text>
            {!compact &&
              [
                ['image', rowsTop + 11],
                ['state · action', rowsTop + 37],
                ['gripper', rowsTop + 56],
              ].map(([label, yy]) => (
                <text key={label} x={x0 - 14} y={yy as number} textAnchor="end" fontSize={9.5} fill="var(--screen-ink-3)" fontFamily="var(--font-mono)">
                  {label}
                </text>
              ))}
          </g>
          <line x1={x0} x2={x1} y1={rowsTop - 10} y2={rowsTop - 10} stroke="var(--screen-rule)" strokeWidth={1} opacity={sweepP > 0 ? 1 : 0} />
          {visibleK.map((r) => {
            if (ts < r.t) return null;
            const cx = x(r.t);
            const a = done ? 1 : clamp((ts - r.t) / 0.07, 0, 1);
            const fw = Math.min(cellW - 6, 20);
            const barH = 11;
            const mid = rowsTop + 34;
            return (
              <g key={r.k} opacity={a} transform={`translate(0 ${(1 - a) * 6})`}>
                {r.frame ? (
                  <FrameGlyph x={cx} y={rowsTop + 8} w={fw} h={13} pose={r.frame.pose} grip={r.frame.grip} />
                ) : (
                  <MissingFrame x={cx} y={rowsTop + 8} w={fw} h={13} id={`hero-miss-${r.k}`} />
                )}
                <rect x={cx - 4} y={Math.min(mid, mid - r.state * barH)} width={3} height={Math.max(1, Math.abs(r.state * barH))} rx={1} fill="var(--ch-joint)" />
                <rect x={cx + 1} y={Math.min(mid, mid - r.action * barH)} width={3} height={Math.max(1, Math.abs(r.action * barH))} rx={1} fill="var(--ch-action)" />
                <rect
                  x={cx - 3}
                  y={rowsTop + 50}
                  width={6}
                  height={6}
                  rx={1.5}
                  fill={r.grip ? 'var(--ch-grip)' : 'none'}
                  stroke="var(--ch-grip)"
                  strokeWidth={1.2}
                />
                {r.k % 5 === 0 && (
                  <text x={cx} y={rowsTop + rowsH + 16} textAnchor="middle" fontSize={9.5} fill="var(--screen-ink-3)" fontFamily="var(--font-mono)">
                    {fmtTs(r.t)}
                  </text>
                )}
              </g>
            );
          })}

          {/* hover column */}
          {hover && (
            <rect
              x={x(hover.t) - cellW / 2}
              y={top - 8}
              width={cellW}
              height={rowsTop + rowsH - top + 10}
              rx={4}
              fill="rgba(219,227,234,0.07)"
              stroke="rgba(219,227,234,0.35)"
              strokeWidth={1}
              pointerEvents="none"
            />
          )}
        </svg>

        {hover && <RowTooltip row={hover} left={(x(hover.t) / W) * 100} />}
      </div>

      <div className="fig__note" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <span>
          {done
            ? 'Point at a row, or use the arrow keys, to read it. Tick 13 has no frame: it was dropped over USB, so a real pipeline flags or splits there.'
            : 'Each device stamps its own time. The camera PC also stamps frames on arrival, about 40 ms after exposure.'}
        </span>
        {done && (
          <button type="button" className="btn" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
            {showTable ? 'Hide table' : 'Show rows as a table'}
          </button>
        )}
      </div>
      {done && showTable && <RowsTable />}
    </figure>
  );
}

function RowTooltip({ row, left }: { row: HeroRow; left: number }) {
  const lines: [string, string, string][] = [
    ['var(--ch-cam)', 'image', row.frame ? `frame ${row.frame.k} (${fmtMs(row.frameDist)} off)` : 'no frame within ½ tick'],
    ['var(--ch-joint)', 'state', row.state.toFixed(2)],
    ['var(--ch-action)', 'action', row.action.toFixed(2)],
    ['var(--ch-grip)', 'gripper', row.grip ? 'closed' : 'open'],
  ];
  const flip = left > 62;
  return (
    <div
      className="tip"
      style={{ left: `calc(${left}% ${flip ? '- 14px' : '+ 14px'})`, transform: flip ? 'translateX(-100%)' : undefined }}
      role="status"
    >
      <div className="tip__head">
        row {row.k} · t = {fmtTs(row.t)} s
      </div>
      {lines.map(([c, k, v]) => (
        <div className="tip__row" key={k}>
          <span className="tip__key" style={{ background: c }} />
          <span className="tip__val">{v}</span>
          <span className="tip__name">{k}</span>
        </div>
      ))}
    </div>
  );
}

function RowsTable() {
  return (
    <div className="rows-table">
      <table className="table table--screen">
        <thead>
          <tr>
            <th>frame_index</th>
            <th>timestamp</th>
            <th>observation.images.front</th>
            <th>observation.state</th>
            <th>action</th>
            <th>gripper</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.k}>
              <td className="num">{r.k}</td>
              <td className="num">{fmtTs(r.t)}</td>
              <td className="num">{r.frame ? `frame ${r.frame.k}` : 'missing'}</td>
              <td className="num">{r.state.toFixed(3)}</td>
              <td className="num">{r.action.toFixed(3)}</td>
              <td className="num">{r.grip ? 'closed' : 'open'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fig__note" style={{ paddingTop: 10 }}>
        timestamp is frame_index / {FPS}. The writer computes it; the row can't carry the real capture time.
      </p>
    </div>
  );
}
