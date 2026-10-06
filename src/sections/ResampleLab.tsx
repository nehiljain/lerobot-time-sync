import { useMemo, useState } from 'react';
import { FrameGlyph, MissingFrame } from '../components/FrameGlyph';
import { Seg } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { clamp, linear, mulberry32 } from '../lib/math';
import {
  DT,
  armPos,
  gripTrue,
  holdAt,
  holdSample,
  interpAt,
  makeForce,
  meanAt,
  nearestFrame,
  nearestSample,
  type Frame,
  type Sample,
} from '../lib/world';

type Stream = 'joint' | 'grip' | 'force' | 'cam';
type Method = 'interp' | 'hold' | 'nearest' | 'mean';

const TA = 0.385;
const TB = 0.785;
const TICKS = Array.from({ length: 12 }, (_, i) => (12 + i) * DT);

const JOINT: Sample[] = Array.from({ length: 31 }, (_, i) => ({ t: (15 + i) / 50, v: armPos((15 + i) / 50) }));
const GRIP: Sample[] = [
  { t: 0.43, v: 0 },
  { t: 0.644, v: 1 },
];
const FORCE = makeForce();
const FRAMES: Frame[] = (() => {
  const rnd = mulberry32(21);
  return Array.from({ length: 16 }, (_, i) => {
    const k = 10 + i;
    const exposure = k * DT + 0.011 + (rnd() * 2 - 1) * 0.001;
    return { k, exposure, logged: exposure, pose: armPos(exposure), grip: gripTrue(exposure), dropped: k === 13 };
  });
})();

type Verdict = { kind: 'good' | 'mid' | 'bad'; text: string };

const VERDICTS: Record<Stream, Partial<Record<Method, Verdict>>> = {
  joint: {
    interp: { kind: 'good', text: 'A smooth signal, read between its samples.' },
    hold: { kind: 'mid', text: 'Lags by up to one sample: 20 ms at 50 Hz.' },
    nearest: { kind: 'mid', text: 'Up to half a sample of timing error: 10 ms.' },
    mean: { kind: 'mid', text: 'Smooths slightly. Fine while the window is one tick or less.' },
  },
  grip: {
    interp: { kind: 'bad', text: 'Invents half-closed values that never happened.' },
    hold: { kind: 'good', text: 'A state holds until it changes.' },
    nearest: { kind: 'bad', text: 'Flips at the midpoint between log lines: here about 80 ms before the gripper closed.' },
    mean: { kind: 'bad', text: 'Turns a yes/no state into fractions.' },
  },
  force: {
    interp: { kind: 'bad', text: 'Picks whatever noise sits at the tick. One raw sample per tick from a 1 kHz signal aliases.' },
    hold: { kind: 'bad', text: 'Same aliasing, plus up to 1 ms of lag.' },
    nearest: { kind: 'bad', text: 'Same aliasing: the value depends on which noisy sample was closest.' },
    mean: { kind: 'good', text: 'Average (low-pass) over the tick, then sample.' },
  },
  cam: {
    nearest: { kind: 'good', text: 'Closest frame. A tick with no frame within half a tick gets flagged, not filled.' },
    hold: { kind: 'mid', text: 'Adds up to one frame of lag: 33 ms at 30 fps.' },
    interp: { kind: 'bad', text: 'Blends two frames into a ghost image that never existed.' },
  },
};

const METHOD_LABEL: Record<Method, string> = {
  interp: 'Interpolate',
  hold: 'Hold last',
  nearest: 'Nearest',
  mean: 'Average',
};

const STREAM_LABEL: Record<Stream, string> = {
  joint: 'Joint angle · 50 Hz',
  grip: 'Gripper · on change',
  force: 'Force · 1 kHz',
  cam: 'Camera · 30 Hz',
};

export function ResampleLab() {
  const [stream, setStream] = useState<Stream>('grip');
  const [method, setMethod] = useState<Method>('interp');
  const [ref, W] = useElementWidth<HTMLDivElement>(640);

  const methods: Method[] = stream === 'cam' ? ['nearest', 'hold', 'interp'] : ['interp', 'hold', 'nearest', 'mean'];
  const m: Method = methods.includes(method) ? method : methods[0];
  const verdict = VERDICTS[stream][m]!;

  const x0 = 6;
  const x1 = W - 6;
  const x = linear(TA, TB, x0, x1);
  const laneTop = 18;
  const laneH = 150;
  const y = (v: number) => laneTop + laneH / 2 - clamp(v, -1.15, 1.15) * (laneH / 2 - 10);
  const outTop = laneTop + laneH + 18;
  const H = stream === 'cam' ? outTop + 56 : laneTop + laneH + 34;

  const samples = stream === 'joint' ? JOINT : stream === 'grip' ? GRIP : FORCE;
  const map = (v: number) => (stream === 'grip' ? -0.7 + 1.4 * v : v);

  const out = useMemo(() => {
    if (stream === 'cam') return [];
    return TICKS.map((t) => {
      const v =
        m === 'interp' ? interpAt(samples, t) : m === 'hold' ? holdAt(samples, t) : m === 'nearest' ? nearestSample(samples, t).v : meanAt(samples, t, DT);
      const src = m === 'nearest' ? nearestSample(samples, t) : m === 'hold' ? holdSample(samples, t) : null;
      return { t, v, src };
    });
  }, [stream, m, samples]);

  const fw = Math.min(26, ((x1 - x0) / ((TB - TA) / DT)) * 0.7);

  return (
    <div className="step-fig">
      <div className="lab-controls">
        <Seg
          label="Stream"
          value={stream}
          onChange={(s) => {
            setStream(s);
          }}
          options={(['joint', 'grip', 'force', 'cam'] as Stream[]).map((s) => ({ value: s, label: STREAM_LABEL[s] }))}
        />
        <Seg label="Method" value={m} onChange={setMethod} options={methods.map((mm) => ({ value: mm, label: METHOD_LABEL[mm] }))} />
      </div>
      <div ref={ref}>
        <svg className="fig__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${STREAM_LABEL[stream]} resampled onto a 30 Hz grid with ${METHOD_LABEL[m]}. ${verdict.text}`}>
          <defs>
            <clipPath id="lab-plot">
              <rect x={x0 - 2} y={0} width={x1 - x0 + 4} height={H} />
            </clipPath>
          </defs>
          {/* grid */}
          {TICKS.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={laneTop - 6} y2={stream === 'cam' ? outTop + 44 : laneTop + laneH + 6} stroke="var(--screen-rule)" />
          ))}
          <text x={x0} y={10} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            grid: 30 Hz ticks
          </text>

          <g clipPath="url(#lab-plot)">
          {stream === 'joint' && (
            <>
              <path
                d={Array.from({ length: 160 }, (_, i) => TA + (i / 159) * (TB - TA))
                  .map((t, i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(armPos(t)).toFixed(1)}`)
                  .join('')}
                fill="none"
                stroke="var(--ch-joint)"
                strokeWidth={1}
                opacity={0.35}
              />
              {JOINT.filter((s) => s.t >= TA && s.t <= TB).map((s) => (
                <circle key={s.t} cx={x(s.t)} cy={y(s.v)} r={3.2} fill="var(--ch-joint)" />
              ))}
            </>
          )}

          {stream === 'grip' && (
            <>
              <path d={`M${x0},${y(map(0))}H${x(0.644)}V${y(map(1))}H${x1}`} fill="none" stroke="var(--ch-grip)" strokeWidth={1} opacity={0.4} />
              {GRIP.map((s) => (
                <g key={s.t}>
                  <circle cx={x(s.t)} cy={y(map(s.v))} r={4} fill="var(--ch-grip)" />
                  <text x={x(s.t) + 7} y={y(map(s.v)) + (s.v ? -10 : 20)} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-2)">
                    {s.v ? 'logged: closed' : 'logged: open'}
                  </text>
                </g>
              ))}
            </>
          )}

          {stream === 'force' && (
            <path
              d={FORCE.filter((s) => s.t >= TA && s.t <= TB)
                .map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${y(s.v).toFixed(1)}`)
                .join('')}
              fill="none"
              stroke="var(--screen-ink-3)"
              strokeWidth={1}
            />
          )}

          {stream !== 'cam' && (
            <>
              {out.map((o) =>
                o.src ? (
                  <line key={`c${o.t}`} x1={x(o.t)} y1={y(map(o.v))} x2={x(o.src.t)} y2={y(map(o.src.v))} stroke="var(--focus-screen)" strokeWidth={1.2} />
                ) : null,
              )}
              <path
                d={out.map((o, i) => `${i ? 'L' : 'M'}${x(o.t).toFixed(1)},${y(map(o.v)).toFixed(1)}`).join('')}
                fill="none"
                stroke="var(--screen-ink)"
                strokeWidth={1.6}
              />
              {out.map((o) => (
                <rect
                  key={o.t}
                  x={x(o.t) - 4.5}
                  y={y(map(o.v)) - 4.5}
                  width={9}
                  height={9}
                  transform={`rotate(45 ${x(o.t)} ${y(map(o.v))})`}
                  fill="var(--screen-ink)"
                  stroke="var(--screen)"
                  strokeWidth={1.5}
                />
              ))}
            </>
          )}

          {stream === 'cam' && (
            <CamLayer x={x} laneTop={laneTop} laneH={laneH} outTop={outTop} fw={fw} method={m} />
          )}
          </g>
        </svg>
      </div>
      <div className={`verdict verdict--${verdict.kind}`} aria-live="polite">
        <span className="verdict__icon" aria-hidden="true">
          {verdict.kind === 'good' ? '✓' : verdict.kind === 'mid' ? '~' : '✕'}
        </span>
        <span>
          <b>{verdict.kind === 'good' ? 'Right call.' : verdict.kind === 'mid' ? 'Usable.' : 'Wrong.'}</b> {verdict.text}
        </span>
      </div>
    </div>
  );
}

function CamLayer({
  x,
  laneTop,
  laneH,
  outTop,
  fw,
  method,
}: {
  x: (t: number) => number;
  laneTop: number;
  laneH: number;
  outTop: number;
  fw: number;
  method: Method;
}) {
  const cy = laneTop + laneH / 2;
  const fh = 30;
  const oh = 26;
  const live = FRAMES.filter((f) => !f.dropped);
  return (
    <g>
      {FRAMES.filter((f) => f.exposure >= TA - 0.01 && f.exposure <= TB + 0.01).map((f) =>
        f.dropped ? (
          <g key={f.k}>
            <rect x={x(f.exposure) - fw / 2} y={cy - fh / 2} width={fw} height={fh} rx={3} fill="none" stroke="var(--bad)" strokeDasharray="3 3" />
            <text x={x(f.exposure)} y={cy + fh / 2 + 14} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--bad)">
              dropped
            </text>
          </g>
        ) : (
          <FrameGlyph key={f.k} x={x(f.exposure)} y={cy} w={fw} h={fh} pose={f.pose} grip={f.grip} />
        ),
      )}
      <text x={x(TA) + 2} y={outTop - 6} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
        what each row gets
      </text>
      {TICKS.map((t) => {
        const ox = x(t);
        const oy = outTop + oh / 2 + 4;
        if (method === 'nearest') {
          const { frame } = nearestFrame(FRAMES, t, DT / 2, (f) => f.exposure);
          return frame ? (
            <g key={t}>
              <line x1={ox} y1={oy - oh / 2} x2={x(frame.exposure)} y2={cy + fh / 2} stroke="var(--focus-screen)" strokeWidth={1.1} />
              <FrameGlyph x={ox} y={oy} w={fw * 0.9} h={oh} pose={frame.pose} grip={frame.grip} />
            </g>
          ) : (
            <g key={t}>
              <MissingFrame x={ox} y={oy} w={fw * 0.9} h={oh} id={`lab-miss-${Math.round(t * 1000)}`} />
            </g>
          );
        }
        if (method === 'hold') {
          let held: Frame | null = null;
          for (const f of live) if (f.exposure <= t) held = f;
          if (!held) return null;
          return (
            <g key={t}>
              <line x1={ox} y1={oy - oh / 2} x2={x(held.exposure)} y2={cy + fh / 2} stroke="var(--focus-screen)" strokeWidth={1.1} />
              <FrameGlyph x={ox} y={oy} w={fw * 0.9} h={oh} pose={held.pose} grip={held.grip} />
            </g>
          );
        }
        // blend the two frames around the tick (skipping the dropped one)
        let a: Frame | null = null;
        let b: Frame | null = null;
        for (const f of live) {
          if (f.exposure <= t) a = f;
          else if (!b) b = f;
        }
        if (!a || !b) return null;
        const w = (t - a.exposure) / (b.exposure - a.exposure);
        return (
          <g key={t}>
            {/* a double exposure: both frames, weighted by distance */}
            <FrameGlyph x={ox - 2.5} y={oy - 1.5} w={fw * 0.9} h={oh} pose={a.pose} grip={a.grip} opacity={Math.max(0.35, 1 - w)} />
            <FrameGlyph x={ox + 2.5} y={oy + 1.5} w={fw * 0.9} h={oh} pose={b.pose} grip={b.grip} opacity={Math.max(0.35, w)} />
          </g>
        );
      })}
      {method === 'nearest' && (
        <text x={x(13 * DT)} y={outTop + oh + 26} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--bad)">
          no frame within ½ tick
        </text>
      )}
    </g>
  );
}
