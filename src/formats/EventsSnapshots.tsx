import { useMemo, useState } from 'react';
import { Seg } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { clamp, linear, mulberry32 } from '../lib/math';

/*
  Logs (ROS bags, MCAP) keep every event with its own time. Training formats (LeRobot) keep one
  snapshot per tick. This figure shows the mapping and how many events never make it into a row.
*/

const SPAN = 0.5; // seconds shown
const LANES = [
  { id: 'cam', label: 'camera', rate: 30, color: 'var(--ch-cam)' },
  { id: 'joints', label: 'joints', rate: 500, color: 'var(--ch-joint)' },
  { id: 'cmd', label: 'command', rate: 100, color: 'var(--ch-action)' },
  { id: 'grip', label: 'gripper', rate: 0, color: 'var(--ch-grip)' },
] as const;

export function EventsSnapshots() {
  const [fps, setFps] = useState<'10' | '30' | '50'>('30');
  const [hover, setHover] = useState<number | null>(4);
  const [ref, W] = useElementWidth<HTMLDivElement>(1000);
  const f = Number(fps);

  const events = useMemo(() => {
    const rnd = mulberry32(12);
    const out: Record<string, number[]> = { cam: [], joints: [], cmd: [], grip: [0.213, 0.388] };
    for (let k = 0; k * (1 / 30) < SPAN; k++) out.cam.push(k / 30 + 0.006 + rnd() * 0.004);
    for (let k = 0; k * (1 / 500) < SPAN; k++) out.joints.push(k / 500 + rnd() * 0.0004);
    for (let k = 0; k * (1 / 100) < SPAN; k++) out.cmd.push(k / 100 + 0.002 + rnd() * 0.002);
    return out;
  }, []);

  const ticks = Array.from({ length: Math.round(SPAN * f) }, (_, i) => i / f);
  const totalEvents = Object.values(events).reduce((a, e) => a + e.length, 0);
  const rowsCells = ticks.length * LANES.length;

  const compact = W < 720;
  const labelW = compact ? 56 : 78;
  const x0 = labelW;
  const x1 = W - 8;
  const x = linear(0, SPAN, x0, x1);
  const laneH = 30;
  const top = 26;
  const laneY = (i: number) => top + i * laneH + laneH / 2;
  const rowsTop = top + LANES.length * laneH + 34;
  const rowH = 46;
  const H = rowsTop + rowH + 26;
  const cellW = (x1 - x0) / ticks.length;

  const used = (lane: string, t: number): number[] => {
    const e = events[lane];
    if (lane === 'cam') {
      let best = 0;
      e.forEach((v, i) => {
        if (Math.abs(v - t) < Math.abs(e[best] - t)) best = i;
      });
      return [e[best]];
    }
    if (lane === 'grip') {
      const before = e.filter((v) => v <= t);
      return before.length ? [before[before.length - 1]] : [];
    }
    const i = e.findIndex((v) => v > t);
    return i <= 0 ? [e[0]] : [e[i - 1], e[i]];
  };

  const hovered = hover !== null && hover < ticks.length ? ticks[hover] : null;

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 2</b> &nbsp;Events in, snapshots out
        </div>
        <div className="fig__controls">
          <Seg
            label="Snapshot rate"
            value={fps}
            onChange={(v) => {
              setFps(v);
              setHover(null);
            }}
            options={[
              { value: '10', label: '10 fps' },
              { value: '30', label: '30 fps' },
              { value: '50', label: '50 fps' },
            ]}
          />
        </div>
      </div>
      <div className="fig__body" ref={ref}>
        <svg
          className="fig__svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Half a second of events (${totalEvents}) becomes ${ticks.length} snapshot rows at ${f} fps.`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            if (px < x0 || px > x1) return;
            setHover(clamp(Math.floor((px - x0) / cellW), 0, ticks.length - 1));
          }}
        >
          <text x={0} y={14} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            events · what a bag or MCAP file keeps
          </text>
          {LANES.map((l, i) => (
            <g key={l.id}>
              <text x={0} y={laneY(i) + 4} fontSize={10.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-2)">
                {l.label}
              </text>
              <line x1={x0} x2={x1} y1={laneY(i)} y2={laneY(i)} stroke="var(--screen-grid)" />
              {events[l.id].map((t, k) => {
                const isUsed = hovered !== null && used(l.id, hovered).includes(t);
                const h = l.id === 'joints' ? 7 : l.id === 'cam' ? 18 : 12;
                return (
                  <rect
                    key={k}
                    x={x(t) - (l.id === 'joints' ? 0.4 : 1.5)}
                    y={laneY(i) - h / 2}
                    width={l.id === 'joints' ? 0.8 : 3}
                    height={h}
                    rx={0.5}
                    fill={isUsed ? 'var(--screen-ink)' : l.color}
                    opacity={hovered === null || isUsed ? 1 : 0.4}
                  />
                );
              })}
            </g>
          ))}
          {hovered !== null && (
            <line x1={x(hovered)} x2={x(hovered)} y1={top - 4} y2={rowsTop + rowH} stroke="var(--focus-screen)" strokeWidth={1.5} />
          )}

          <text x={0} y={rowsTop - 12} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            snapshots · what a LeRobot dataset keeps, one row per tick
          </text>
          {ticks.map((t, i) => (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect
                x={x0 + i * cellW + 1}
                y={rowsTop}
                width={Math.max(2, cellW - 2)}
                height={rowH}
                rx={3}
                fill={hover === i ? 'rgba(224,164,58,0.22)' : 'var(--screen-2)'}
                stroke={hover === i ? 'var(--focus-screen)' : 'var(--screen-rule)'}
              />
              {cellW > 14 &&
                LANES.map((l, li) => (
                  <rect key={l.id} x={x0 + i * cellW + 4} y={rowsTop + 6 + li * 9} width={Math.max(2, cellW - 8)} height={5} rx={1.5} fill={l.color} opacity={0.85} />
                ))}
              {i % Math.max(1, Math.round(f / 10)) === 0 && (
                <text x={x0 + i * cellW + cellW / 2} y={rowsTop + rowH + 16} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                  {t.toFixed(2)}
                </text>
              )}
            </g>
          ))}
        </svg>
        <div className="es-stats">
          <div>
            <span className="es-stats__n">{totalEvents}</span>
            <span className="es-stats__l">events in half a second</span>
          </div>
          <div>
            <span className="es-stats__n">{ticks.length}</span>
            <span className="es-stats__l">rows at {f} fps</span>
          </div>
          <div>
            <span className="es-stats__n">{Math.round((1 - rowsCells / totalEvents) * 100)}%</span>
            <span className="es-stats__l">fewer values kept</span>
          </div>
        </div>
      </div>
      <p className="fig__note">
        Point at a row: highlighted events are the ones it is built from (nearest frame, last gripper event, joint and command samples around the
        tick). Everything else stays in the log.
      </p>
    </figure>
  );
}
