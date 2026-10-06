import { useState } from 'react';
import { IconPause, IconPlay, Range, Seg } from '../components/controls';
import { useElementWidth, usePrefersReducedMotion, useRafLoop } from '../lib/hooks';

/* a 2-link arm, side view, units in mm */
const S = { x: 70, y: 90 }; // shoulder
const L1 = 200;
const L2 = 260;
const A = { x: 330, y: 200 }; // start, above the table
const B = { x: 455, y: 72 }; // above the cube
const D = Math.hypot(B.x - A.x, B.y - A.y) / 1000; // metres
const HOLD_A = 0.35;
const HOLD_B = 0.55;
const REST = 0.3;
const PLAYBACK = 0.5; // slow motion, so the gap is visible on screen

type Pt = { x: number; y: number };

function tipAt(t: number, v: number): { p: Pt; closed: number } {
  const move = D / v;
  const cycle = HOLD_A + move + HOLD_B + move + REST;
  let u = ((t % cycle) + cycle) % cycle;
  const lerpPt = (a: Pt, b: Pt, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  if (u < HOLD_A) return { p: A, closed: 0 };
  u -= HOLD_A;
  if (u < move) return { p: lerpPt(A, B, u / move), closed: 0 };
  u -= move;
  if (u < HOLD_B) return { p: B, closed: Math.min(1, Math.max(0, (u - 0.25) / 0.12)) };
  u -= HOLD_B;
  if (u < move) return { p: lerpPt(B, A, u / move), closed: 1 };
  return { p: A, closed: Math.max(0, 1 - (u - move) / 0.15) };
}

function ik(p: Pt) {
  const dx = p.x - S.x;
  const dy = p.y - S.y;
  const c2 = Math.max(-1, Math.min(1, (dx * dx + dy * dy - L1 * L1 - L2 * L2) / (2 * L1 * L2)));
  const s2 = -Math.sqrt(1 - c2 * c2); // elbow up
  const t2 = Math.atan2(s2, c2);
  const t1 = Math.atan2(dy, dx) - Math.atan2(L2 * s2, L1 + L2 * c2);
  const e = { x: S.x + L1 * Math.cos(t1), y: S.y + L1 * Math.sin(t1) };
  return { e, t1, t2 };
}

export function WhyItMatters() {
  const reduced = usePrefersReducedMotion();
  const [lagMs, setLagMs] = useState(100);
  const [speed, setSpeed] = useState<'0.25' | '0.5' | '1'>('0.5');
  const v = Number(speed);
  const [t, setT] = useState(() => HOLD_A + (0.55 * D) / v);
  const [playing, setPlaying] = useState(!reduced);
  const [ref, W] = useElementWidth<HTMLDivElement>(980);

  useRafLoop(playing, (dt) => setT((x) => x + dt * PLAYBACK));

  const lag = lagMs / 1000;
  const gapMoving = v * lag * 100; // cm
  const frames = lag * 30;

  const now = tipAt(t, v);
  const seen = tipAt(t - lag, v);
  const liveGap = Math.hypot(now.p.x - seen.p.x, now.p.y - seen.p.y) / 10; // cm

  const wide = W >= 760;
  const sceneW = wide ? Math.round(W * 0.6) : W;
  const s = sceneW / 640;
  const sceneH = Math.round(370 * s);
  const X = (x: number) => x * s;
  const Y = (y: number) => sceneH - 34 * s - y * s;

  const arm = (p: Pt, closed: number, color: string, alpha: number, width: number) => {
    const { e } = ik(p);
    const f = 22;
    const spread = 9 * (1 - closed) + 3;
    return (
      <g opacity={alpha}>
        <polyline
          points={`${X(S.x)},${Y(S.y)} ${X(e.x)},${Y(e.y)} ${X(p.x)},${Y(p.y + 26)}`}
          fill="none"
          stroke={color}
          strokeWidth={width * s}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1={X(p.x)} y1={Y(p.y + 26)} x2={X(p.x)} y2={Y(p.y + 8)} stroke={color} strokeWidth={width * 0.8 * s} strokeLinecap="round" />
        <line x1={X(p.x - spread - 4)} y1={Y(p.y + 8)} x2={X(p.x + spread + 4)} y2={Y(p.y + 8)} stroke={color} strokeWidth={5 * s} strokeLinecap="round" />
        <line x1={X(p.x - spread - 4)} y1={Y(p.y + 8)} x2={X(p.x - spread)} y2={Y(p.y + 8 - f)} stroke={color} strokeWidth={4.5 * s} strokeLinecap="round" />
        <line x1={X(p.x + spread + 4)} y1={Y(p.y + 8)} x2={X(p.x + spread)} y2={Y(p.y + 8 - f)} stroke={color} strokeWidth={4.5 * s} strokeLinecap="round" />
        <circle cx={X(e.x)} cy={Y(e.y)} r={7 * s} fill="var(--screen)" stroke={color} strokeWidth={3 * s} />
      </g>
    );
  };

  // dimension line between the two tips
  const tipNow = { x: now.p.x, y: now.p.y - 14 };
  const tipSeen = { x: seen.p.x, y: seen.p.y - 14 };
  const showDim = liveGap > 0.3;
  // put the gap label beside the dimension line, on the side away from the arms
  const ddx = X(tipNow.x) - X(tipSeen.x);
  const ddy = Y(tipNow.y) - Y(tipSeen.y);
  const dl = Math.hypot(ddx, ddy) || 1;
  let px = -ddy / dl;
  let py = ddx / dl;
  if (py < 0) {
    px = -px;
    py = -py;
  }
  const perp = { x: px * 20, y: py * 20 };

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 5</b> &nbsp;Same row, two different arms
        </div>
        <div className="fig__controls">
          <button type="button" className="btn" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
            {playing ? <IconPause /> : <IconPlay />} {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
      <div className="fig__body arm" ref={ref} style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: 24 }}>
        <svg
          width={sceneW}
          height={sceneH}
          viewBox={`0 0 ${sceneW} ${sceneH}`}
          className="fig__svg"
          style={{ flex: 'none', width: sceneW }}
          role="img"
          aria-label={`A robot arm reaching for a cube. The camera image lags the joint state by ${lagMs} ms, so the gripper in the image is ${gapMoving.toFixed(1)} cm behind while moving.`}
        >
          <defs>
            <pattern id="table-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--screen-rule)" strokeWidth="1.2" />
            </pattern>
          </defs>
          {/* table */}
          <rect x={0} y={Y(0)} width={sceneW} height={sceneH - Y(0)} fill="url(#table-hatch)" />
          <line x1={0} x2={sceneW} y1={Y(0)} y2={Y(0)} stroke="var(--screen-ink-3)" strokeWidth={1.5} />
          {/* cube, 40 mm */}
          <rect x={X(435)} y={Y(40)} width={X(40)} height={X(40)} rx={2 * s} fill="#2a3644" stroke="var(--screen-ink-2)" strokeWidth={1.2} />
          <text x={X(455)} y={Y(-22)} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            cube · 4 cm
          </text>
          {/* pedestal */}
          <rect x={X(S.x - 26)} y={Y(S.y)} width={X(52)} height={Y(0) - Y(S.y)} rx={4 * s} fill="#1e2b37" stroke="var(--screen-rule)" />
          {/* arms: what the camera frame shows (behind), what the joints say (front) */}
          {arm(seen.p, seen.closed, 'var(--ch-cam)', 0.85, 13)}
          {arm(now.p, now.closed, 'var(--ch-joint)', 1, 9)}
          <circle cx={X(S.x)} cy={Y(S.y)} r={9 * s} fill="var(--screen)" stroke="var(--screen-ink-2)" strokeWidth={3 * s} />

          {showDim && (
            <g>
              <line x1={X(tipSeen.x)} y1={Y(tipSeen.y)} x2={X(tipNow.x)} y2={Y(tipNow.y)} stroke="var(--screen-ink)" strokeWidth={1.5} />
              <circle cx={X(tipSeen.x)} cy={Y(tipSeen.y)} r={3} fill="var(--screen-ink)" />
              <circle cx={X(tipNow.x)} cy={Y(tipNow.y)} r={3} fill="var(--screen-ink)" />
              <text
                x={(X(tipSeen.x) + X(tipNow.x)) / 2 + perp.x}
                y={(Y(tipSeen.y) + Y(tipNow.y)) / 2 + perp.y + 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fontFamily="var(--font-mono)"
                fill="var(--screen-ink)"
              >
                {liveGap.toFixed(1)} cm
              </text>
            </g>
          )}

          {/* legend */}
          <g transform={`translate(${sceneW - 236}, 18)`}>
            <rect width={14} height={4} y={-4} rx={2} fill="var(--ch-joint)" />
            <text x={20} y={0} fontSize={11.5} fill="var(--screen-ink)">
              joint encoders say
            </text>
            <rect width={14} height={4} y={14} rx={2} fill="var(--ch-cam)" />
            <text x={20} y={18} fontSize={11.5} fill="var(--screen-ink)">
              camera frame in the same row shows
            </text>
          </g>
        </svg>

        <div className="arm__side">
          <div className="hero-num" aria-live="polite">
            {gapMoving.toFixed(1)}
            <span> cm</span>
          </div>
          <p className="arm__sub">
            gap between the gripper in the image and the gripper the joints describe, while the arm moves
          </p>
          <ul className="arm__facts">
            <li>
              <b>{frames.toFixed(1)}</b> frames of lag at 30 fps
            </li>
            <li>
              <b>{v.toFixed(2)} m/s</b> × <b>{lagMs} ms</b> = <b>{gapMoving.toFixed(1)} cm</b>
            </li>
            <li>the cube is 4 cm wide</li>
          </ul>
          <div className="arm__controls">
            <Range label="Image lags state by" value={lagMs} min={0} max={200} step={5} display={`${lagMs} ms`} onChange={setLagMs} />
            <div>
              <div className="range__top" style={{ marginBottom: 6 }}>
                <span>Arm speed</span>
              </div>
              <Seg
                label="Arm speed"
                value={speed}
                onChange={(sp) => {
                  setSpeed(sp);
                }}
                options={[
                  { value: '0.25', label: '0.25 m/s' },
                  { value: '0.5', label: '0.5 m/s' },
                  { value: '1', label: '1 m/s' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
      <p className="fig__note">Half-speed playback. The gap only exists while the arm moves: at rest, a late image still shows the right pose.</p>
    </figure>
  );
}
