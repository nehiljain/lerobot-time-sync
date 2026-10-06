import { FrameGlyph } from '../components/FrameGlyph';
import { useElementWidth } from '../lib/hooks';
import { fmtTs, linear } from '../lib/math';

const LAT = 0.04; // exposure to "frame in the buffer"
const ARRIVALS = Array.from({ length: 9 }, (_, j) => (j - 2) / 30 + 0.011);
const TICKS = [
  { start: 0, work: 0.009 },
  { start: 1 / 30, work: 0.01 },
  { start: 2 / 30, work: 0.009 },
  { start: 0.1, work: 0.048, slow: true },
  { start: 0.148, work: 0.01 },
  { start: 0.148 + 1 / 30, work: 0.009 },
];
const T0 = -0.07;
const T1 = 0.222;

export function RecorderLoop() {
  const [ref, W] = useElementWidth<HTMLDivElement>(960);
  const compact = W < 640;
  const labelW = compact ? 0 : 128;
  const x0 = labelW + 10;
  const x1 = W - 12;
  const x = linear(T0, T1, x0, x1);
  const camY = 50;
  const loopY = 132;
  const rowY = 206;
  const H = 252;
  const fw = Math.min(22, (x1 - x0) / 15);

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 7</b> &nbsp;Inside lerobot-record: sync by sampling
        </div>
      </div>
      <div className="fig__body" ref={ref}>
        <svg className="fig__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The record loop ticks at 30 Hz and peeks the newest camera frame each tick. That frame is 44 to 62 ms old. One slow tick shifts every later tick by 15 ms, but rows are still stamped frame_index divided by 30.">
          {!compact && (
            <g fontSize={12.5} fill="var(--screen-ink)">
              <text x={0} y={camY - 6}>Camera thread</text>
              <text x={0} y={camY + 9} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                newest frame wins
              </text>
              <text x={0} y={loopY - 2}>Record loop</text>
              <text x={0} y={loopY + 13} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                30 Hz ticks
              </text>
              <text x={0} y={rowY - 2}>Rows written</text>
              <text x={0} y={rowY + 13} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                frame_index / 30
              </text>
            </g>
          )}
          <line x1={x0} x2={x1} y1={camY} y2={camY} stroke="var(--screen-grid)" />
          <line x1={x0} x2={x1} y1={loopY} y2={loopY} stroke="var(--screen-grid)" />
          <line x1={x0} x2={x1} y1={rowY} y2={rowY} stroke="var(--screen-grid)" />

          {/* frames land in the buffer ~40 ms after exposure */}
          {ARRIVALS.filter((a) => a > T0 && a < T1).map((a, j) => (
            <g key={a}>
              <line x1={x(a - LAT)} x2={x(a)} y1={camY - 26} y2={camY - 26} stroke="var(--ch-cam)" strokeWidth={1} opacity={0.35} />
              <circle cx={x(a - LAT)} cy={camY - 26} r={2} fill="var(--ch-cam)" opacity={0.6} />
              <FrameGlyph x={x(a)} y={camY} w={fw} h={22} pose={-0.5 + j * 0.12} grip={0} />
            </g>
          ))}
          <text x={x(ARRIVALS[2] - LAT)} y={camY - 33} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            exposed
          </text>
          <text x={x(ARRIVALS[2]) + 12} y={camY - 33} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            in buffer
          </text>

          {TICKS.map((tk, i) => {
            const latest = [...ARRIVALS].reverse().find((a) => a <= tk.start)!;
            const age = Math.round((tk.start - (latest - LAT)) * 1000);
            const nominal = i / 30;
            const drift = Math.round((tk.start - nominal) * 1000);
            return (
              <g key={i}>
                {/* the peek: newest buffered frame */}
                <path
                  d={`M${x(tk.start)},${loopY - 10} C${x(tk.start)},${loopY - 40} ${x(latest)},${camY + 40} ${x(latest)},${camY + 13}`}
                  fill="none"
                  stroke="var(--screen-ink-2)"
                  strokeWidth={1}
                />
                <text x={x(tk.start) + 4} y={loopY - 22} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink)">
                  {age} ms
                </text>
                {/* the tick's work */}
                <rect
                  x={x(tk.start)}
                  y={loopY - 9}
                  width={Math.max(3, x(tk.start + tk.work) - x(tk.start))}
                  height={18}
                  rx={3}
                  fill={tk.slow ? 'rgba(208,59,59,0.35)' : 'var(--screen-3)'}
                  stroke={tk.slow ? 'var(--bad)' : 'var(--screen-ink-3)'}
                />
                {tk.slow && (
                  <text x={x(tk.start + tk.work / 2)} y={loopY + 26} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="#f08a8a">
                    slow tick: warning logged
                  </text>
                )}
                {/* the row it writes */}
                <line x1={x(tk.start)} x2={x(nominal)} y1={loopY + 9} y2={rowY - 11} stroke="var(--screen-rule)" strokeWidth={1} />
                <rect x={x(nominal) - 15} y={rowY - 11} width={30} height={22} rx={4} fill="var(--screen-2)" stroke={drift ? 'var(--bad)' : 'var(--screen-ink-3)'} />
                <text x={x(nominal)} y={rowY + 4} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink)">
                  {i}
                </text>
                <text x={x(nominal)} y={rowY + 26} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                  {fmtTs(nominal)}
                </text>
                {drift > 0 && (
                  <text x={x(nominal)} y={rowY + 40} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="#f08a8a">
                    real +{drift} ms
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="fig__note">
        Ages are exposure to tick. They swing with the phase between camera and loop, and the row can't record which one
        it got. Example timings.
      </p>
    </figure>
  );
}
