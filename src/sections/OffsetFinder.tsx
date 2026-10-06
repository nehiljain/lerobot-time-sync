import { useMemo, useRef, useState } from 'react';
import { IconTarget, Range } from '../components/controls';
import { useElementWidth, usePrefersReducedMotion } from '../lib/hooks';
import { fmtMs, linear, pearson } from '../lib/math';
import { HIDDEN_OFFSET, SESSION_LEN, interpAt, makeSession } from '../lib/world';

const SHIFTS = Array.from({ length: 251 }, (_, i) => -0.25 + i * 0.002);

export function OffsetFinder() {
  const reduced = usePrefersReducedMotion();
  const { motion, speed } = useMemo(() => makeSession(), []);
  const [shift, setShift] = useState(0);
  const [ref, W] = useElementWidth<HTMLDivElement>(640);
  const anim = useRef(0);

  const curve = useMemo(() => {
    const a = motion.map((m) => m.v);
    return SHIFTS.map((d) => ({ d, r: pearson(a, motion.map((m) => interpAt(speed, m.t - d))) }));
  }, [motion, speed]);
  const best = curve.reduce((p, c) => (c.r > p.r ? c : p));
  const rNow = useMemo(() => {
    const a = motion.map((m) => m.v);
    return pearson(a, motion.map((m) => interpAt(speed, m.t - shift)));
  }, [motion, speed, shift]);
  const locked = Math.abs(shift - best.d) < 0.0035;

  const findPeak = () => {
    cancelAnimationFrame(anim.current);
    if (reduced) {
      setShift(best.d);
      return;
    }
    const from = shift;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      const e = 1 - Math.pow(1 - p, 3);
      setShift(from + (best.d - from) * e);
      if (p < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  /* layout */
  const x0 = 6;
  const x1 = W - 6;
  const topH = 132;
  const x = linear(0, SESSION_LEN, x0, x1);
  const yMax = Math.max(...motion.map((m) => m.v), ...speed.map((s) => s.v)) * 1.05;
  const y = linear(0, yMax, topH - 8, 8);
  const motionPath = motion.map((m, i) => `${i ? 'L' : 'M'}${x(m.t).toFixed(1)},${y(m.v).toFixed(1)}`).join('');
  const speedPath = speed
    .filter((s) => s.t + shift >= 0 && s.t + shift <= SESSION_LEN)
    .map((s, i) => `${i ? 'L' : 'M'}${x(s.t + shift).toFixed(1)},${y(s.v).toFixed(1)}`)
    .join('');

  const cTop = topH + 66;
  const cH = 88;
  const cx = linear(-0.25, 0.25, x0, x1);
  const rMin = Math.min(...curve.map((c) => c.r));
  const cy = linear(rMin, 1, cTop + cH - 6, cTop + 8);
  const corrPath = curve.map((c, i) => `${i ? 'L' : 'M'}${cx(c.d).toFixed(1)},${cy(c.r).toFixed(1)}`).join('');
  const H = cTop + cH + 22;

  return (
    <div className="step-fig">
      <div ref={ref}>
        <svg className="fig__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Camera motion and joint speed overlaid. Current shift ${fmtMs(shift, true)}, match ${rNow.toFixed(2)}. Best match at ${fmtMs(best.d, true)}.`}>
          <defs>
            <clipPath id="of-top">
              <rect x={x0} y={0} width={x1 - x0} height={topH} />
            </clipPath>
          </defs>
          <line x1={x0} x2={x1} y1={topH - 8} y2={topH - 8} stroke="var(--screen-rule)" />
          <g clipPath="url(#of-top)">
            <path d={motionPath} fill="none" stroke="var(--ch-cam)" strokeWidth={1.6} strokeLinejoin="round" />
            <path d={speedPath} fill="none" stroke="var(--ch-joint)" strokeWidth={1.6} strokeLinejoin="round" />
          </g>
          <g transform={`translate(${x0}, ${topH + 14})`}>
            <rect width={14} height={3} y={-3} rx={1.5} fill="var(--ch-cam)" />
            <text x={20} y={1} fontSize={11} fill="var(--screen-ink)">
              pixel change between frames (camera, 30 Hz)
            </text>
            <rect width={14} height={3} y={13} rx={1.5} fill="var(--ch-joint)" />
            <text x={20} y={17} fontSize={11} fill="var(--screen-ink)">
              joint speed (encoders, 100 Hz), shifted {fmtMs(shift, true)}
            </text>
          </g>

          {/* match vs shift */}
          <text x={x0} y={cTop - 6} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            match (correlation) vs shift
          </text>
          <line x1={x0} x2={x1} y1={cTop + cH - 6} y2={cTop + cH - 6} stroke="var(--screen-rule)" />
          <path d={corrPath} fill="none" stroke="var(--screen-ink-2)" strokeWidth={1.5} />
          <line x1={cx(best.d)} x2={cx(best.d)} y1={cTop + 4} y2={cTop + cH - 6} stroke="var(--screen-ink-3)" strokeWidth={1} />
          <text x={cx(best.d) + 6} y={cTop + cH - 14} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-2)">
            peak {fmtMs(best.d, true)}
          </text>
          <circle cx={cx(shift)} cy={cy(rNow)} r={5} fill="var(--focus-screen)" stroke="var(--screen)" strokeWidth={2} />
          {[-0.2, -0.1, 0, 0.1, 0.2].map((d) => (
            <text key={d} x={cx(d)} y={cTop + cH + 12} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
              {fmtMs(d, true)}
            </text>
          ))}
        </svg>
      </div>
      <div className="step-fig__controls">
        <Range label="Shift the encoder stream" value={Math.round(shift * 1000)} min={-250} max={250} display={fmtMs(shift, true)} onChange={(v) => setShift(v / 1000)} />
        <button type="button" className="btn btn--solid" onClick={findPeak}>
          <IconTarget /> Find the peak
        </button>
      </div>
      <p className="step-fig__readout" aria-live="polite">
        {locked ? (
          <>
            <b>Offset found: {fmtMs(-best.d)}.</b> The clock error built into this example is {fmtMs(HIDDEN_OFFSET)}; sensor
            noise moves the peak a millisecond or two. Shift the encoder logs back by that much and the streams agree.
          </>
        ) : (
          <>
            Match <b>{rNow.toFixed(2)}</b>. Both streams saw the same motion. Slide until the bumps line up, or let the
            correlation peak find it.
          </>
        )}
      </p>
    </div>
  );
}
