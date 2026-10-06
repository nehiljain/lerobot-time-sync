import { useState, type ReactNode } from 'react';
import { Code } from '../components/Code';
import { Seg } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { linear } from '../lib/math';
import { armPos } from '../lib/world';
import { OffsetFinder } from './OffsetFinder';
import { ResampleLab } from './ResampleLab';

type StepId = 'stamp' | 'clock' | 'grid' | 'resample' | 'validate';

const STEPS: { id: StepId; title: string; body: ReactNode }[] = [
  {
    id: 'stamp',
    title: 'Stamp at capture',
    body: (
      <>
        Use the sensor or driver timestamp: exposure time, a message's <code>header.stamp</code>. The time a logger
        wrote the line includes delivery delay.
      </>
    ),
  },
  {
    id: 'clock',
    title: 'Put every stream on one clock',
    body: (
      <>
        Best: a hardware trigger, or PTP between PCs (under a microsecond with hardware timestamps). Next: NTP or chrony
        (a millisecond or better on a LAN). Without either, estimate each offset from the data. Clocks also drift: 50 ppm
        is 180 ms per hour, so estimate per session, not once.
      </>
    ),
  },
  {
    id: 'grid',
    title: 'Pick the grid',
    body: (
      <>
        Usually the main camera's rate. It becomes <code>fps</code> in <code>info.json</code>, and every feature gets
        sampled on it.
      </>
    ),
  },
  {
    id: 'resample',
    title: 'Resample each stream by type',
    body: (
      <>
        Continuous signals: interpolate (slerp for rotations). Discrete states: hold the last value. Images: nearest
        frame. High-rate signals: low-pass before you downsample.
      </>
    ),
  },
  {
    id: 'validate',
    title: 'Validate, then cut',
    body: (
      <>
        Check monotonic time, gaps and leftover offsets. Split the episode at a long dropout instead of filling it.
        Then write the rows.
      </>
    ),
  },
];

export function HowToSync() {
  const [step, setStep] = useState<StepId>('stamp');
  const i = STEPS.findIndex((s) => s.id === step);
  const current = STEPS[i];
  return (
    <div className="sync">
      <ol className="steps">
        {STEPS.map((s, j) => (
          <li key={s.id} className="steps__item" data-active={s.id === step}>
            <button type="button" className="steps__btn" aria-expanded={s.id === step} onClick={() => setStep(s.id)}>
              <span className="steps__num mono">{j + 1}</span>
              <span className="steps__title">{s.title}</span>
            </button>
            {s.id === step && <p className="steps__body">{s.body}</p>}
          </li>
        ))}
      </ol>
      <figure className="fig fig--screen sync__fig" style={{ margin: 0 }}>
        <div className="fig__head">
          <div className="fig__label">
            <b>Fig. 6</b> &nbsp;Step {i + 1} of 5 · {current.title}
          </div>
          <div className="fig__controls">
            <button type="button" className="btn" disabled={i === 0} onClick={() => setStep(STEPS[i - 1].id)}>
              Back
            </button>
            <button type="button" className="btn btn--solid" disabled={i === STEPS.length - 1} onClick={() => setStep(STEPS[i + 1].id)}>
              Next step
            </button>
          </div>
        </div>
        <div className="fig__body">
          {step === 'stamp' && <StampFigure />}
          {step === 'clock' && <OffsetFinder />}
          {step === 'grid' && <GridFigure />}
          {step === 'resample' && <ResampleLab />}
          {step === 'validate' && <ValidateFigure />}
        </div>
      </figure>
    </div>
  );
}

/* ---------- step 1: where a camera timestamp should come from ---------- */

const STAGES = [
  { name: 'exposure', ms: 8 },
  { name: 'readout', ms: 9 },
  { name: 'USB transfer', ms: 14 },
  { name: 'decode', ms: 7 },
  { name: 'log write', ms: 4 },
];

function StampFigure() {
  const [ref, W] = useElementWidth<HTMLDivElement>(640);
  const total = STAGES.reduce((a, s) => a + s.ms, 0);
  const x0 = 4;
  const x1 = W - 4;
  const x = linear(0, total, x0, x1);
  let acc = 0;
  return (
    <div className="step-fig" ref={ref}>
      <svg className="fig__svg" width={W} height={178} viewBox={`0 0 ${W} 178`} role="img" aria-label="One camera frame takes 42 ms from exposure to log write. Stamp it at exposure, not at the log write.">
        <text x={x0} y={12} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
          one frame, example timings
        </text>
        {STAGES.map((s) => {
          const a = acc;
          acc += s.ms;
          const w = x(acc) - x(a) - 2;
          return (
            <g key={s.name}>
              <rect x={x(a) + 1} y={58} width={w} height={34} rx={5} fill={s.name === 'exposure' ? 'rgba(196,135,15,0.35)' : 'var(--screen-3)'} stroke={s.name === 'exposure' ? 'var(--ch-cam)' : 'var(--screen-rule)'} />
              {w > 52 && (
                <text x={x(a) + 1 + w / 2} y={79} textAnchor="middle" fontSize={11} fill="var(--screen-ink)">
                  {s.name}
                </text>
              )}
              <text x={x(a) + 1 + w / 2} y={108} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                {w > 52 ? `${s.ms} ms` : s.ms}
              </text>
            </g>
          );
        })}
        {/* good stamp */}
        <line x1={x(4)} x2={x(4)} y1={36} y2={92} stroke="var(--good)" strokeWidth={2} />
        <circle cx={x(4)} cy={32} r={9} fill="var(--good)" />
        <text x={x(4)} y={35.5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
          ✓
        </text>
        <text x={x(4) + 14} y={36} fontSize={11.5} fill="var(--screen-ink)">
          stamp here: mid-exposure
        </text>
        {/* bad stamp */}
        <line x1={x(total)} x2={x(total)} y1={58} y2={138} stroke="var(--bad)" strokeWidth={2} />
        <circle cx={x(total)} cy={142} r={9} fill="var(--bad)" />
        <text x={x(total)} y={145.5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
          ✕
        </text>
        <text x={x(total) - 14} y={146} textAnchor="end" fontSize={11.5} fill="var(--screen-ink)">
          what a naive logger stamps: {total} ms late
        </text>
      </svg>
      <ul className="step-fig__list">
        <li>
          <b>USB cameras:</b> the driver's buffer timestamp, not the time your loop read the frame.
        </li>
        <li>
          <b>RealSense and similar:</b> per-frame metadata carries a sensor timestamp.
        </li>
        <li>
          <b>ROS:</b> the message's <code>header.stamp</code>, not the time the bag received it.
        </li>
      </ul>
    </div>
  );
}

/* ---------- step 3: the grid ---------- */

function GridFigure() {
  const [fps, setFps] = useState<'15' | '30' | '50'>('30');
  const [ref, W] = useElementWidth<HTMLDivElement>(640);
  const f = Number(fps);
  const t0 = 0.08;
  const t1 = 0.68;
  const x = linear(t0, t1, 6, W - 6);
  const y = (v: number) => 92 - v * 62;
  const ticks: number[] = [];
  for (let k = Math.ceil(t0 * f); k / f <= t1; k++) ticks.push(k / f);
  const curve = Array.from({ length: 200 }, (_, i) => t0 + (i / 199) * (t1 - t0));
  const camTicks: number[] = [];
  for (let k = Math.ceil(t0 * 30); k / 30 <= t1; k++) camTicks.push(k / 30);
  return (
    <div className="step-fig" ref={ref}>
      <div className="lab-controls">
        <Seg
          label="Grid rate"
          value={fps}
          onChange={setFps}
          options={[
            { value: '15', label: '15 Hz' },
            { value: '30', label: '30 Hz · camera rate' },
            { value: '50', label: '50 Hz' },
          ]}
        />
      </div>
      <svg className="fig__svg" width={W} height={196} viewBox={`0 0 ${W} 196`} role="img" aria-label={`A reach motion sampled at ${fps} Hz, with camera frames at 30 Hz for comparison.`}>
        {ticks.map((t) => (
          <line key={t} x1={x(t)} x2={x(t)} y1={14} y2={176} stroke="var(--screen-rule)" />
        ))}
        <path d={curve.map((t, i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(armPos(t)).toFixed(1)}`).join('')} fill="none" stroke="var(--ch-joint)" strokeWidth={1.5} opacity={0.6} />
        {ticks.map((t) => (
          <rect key={t} x={x(t) - 4} y={y(armPos(t)) - 4} width={8} height={8} transform={`rotate(45 ${x(t)} ${y(armPos(t))})`} fill="var(--screen-ink)" stroke="var(--screen)" strokeWidth={1.5} />
        ))}
        <text x={6} y={10} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
          joint position, sampled at each tick
        </text>
        {camTicks.map((t) => {
          const onGrid = ticks.some((g) => Math.abs(g - t) < 1e-6);
          return <rect key={t} x={x(t) - 5} y={160} width={10} height={14} rx={2} fill={onGrid ? 'rgba(196,135,15,0.35)' : 'none'} stroke="var(--ch-cam)" strokeWidth={1} opacity={onGrid ? 1 : 0.5} />;
        })}
        <text x={6} y={152} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
          camera frames (30 Hz): filled when a tick lands on one
        </text>
      </svg>
      <p className="step-fig__readout">
        {fps === '30' && (
          <>
            <b>30 rows per second, 108,000 per hour.</b> Every tick has a real frame. This is the usual choice.
          </>
        )}
        {fps === '50' && (
          <>
            <b>Faster than the camera.</b> Most ticks fall between frames, and images can't be interpolated. You'd repeat
            frames and pretend.
          </>
        )}
        {fps === '15' && (
          <>
            <b>Half the camera rate.</b> Every other frame is thrown away, and fast action detail goes with it.
          </>
        )}
      </p>
    </div>
  );
}

/* ---------- step 5: checks before writing ---------- */

function ValidateFigure() {
  const checks: { ok: 'good' | 'bad' | 'mid'; text: ReactNode; detail: string }[] = [
    { ok: 'good', text: 'Timestamps strictly increase in every stream', detail: '0 reversals in 4 streams' },
    { ok: 'good', text: 'A visible event lines up across streams', detail: 'grasp agrees to within one frame' },
    { ok: 'good', text: 'Commands lead joint motion, not the reverse', detail: 'lead 60 ms. Negative means a clock or sign bug' },
    { ok: 'bad', text: 'Gap in front camera at 12.40 s', detail: '5 frames (167 ms) missing: split the episode here' },
    { ok: 'mid', text: 'Wrist IMU at 400 Hz', detail: 'low-pass, then sample on the 30 Hz grid' },
    { ok: 'good', text: 'Every row has every feature, or a mask', detail: 'ready to write as LeRobot v3' },
  ];
  return (
    <div className="step-fig">
      <div className="checks" role="list">
        {checks.map((c, i) => (
          <div key={i} role="listitem" className={`checks__row verdict--${c.ok}`}>
            <span className="verdict__icon" aria-hidden="true">
              {c.ok === 'good' ? '✓' : c.ok === 'bad' ? '✕' : '~'}
            </span>
            <span className="checks__text">
              {c.text}
              <span className="checks__detail mono">{c.detail}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="step-fig__readout">
        Example report for one episode. LeRobot checks none of this. The one time check it runs on the data happens at
        load: each video frame must sit within 0.1 ms of its row's timestamp.
      </p>
    </div>
  );
}

export function SyncCode() {
  return (
    <div className="code-pair">
      <Code title="One episode, pandas" note="timestamps already on one clock">
        {`import numpy as np
import pandas as pd

FPS = 30
JOINTS = ["shoulder_pan", "shoulder_lift", "elbow_flex",
          "wrist_flex", "wrist_roll"]

def align_episode(ep: pd.DataFrame) -> pd.DataFrame:
    cam = ep[ep.stream == "front_cam"].sort_values("t")
    grid = pd.DataFrame({"t": cam.t.iloc[0] + np.arange(len(cam)) / FPS})

    # continuous: interpolate
    arm = ep[ep.stream == "joints"].sort_values("t")
    for j in JOINTS:
        grid[j] = np.interp(grid.t, arm.t, arm[j])

    # discrete: hold the last value
    grip = ep[ep.stream == "gripper"].sort_values("t")
    grid = pd.merge_asof(grid, grip[["t", "closed"]], on="t",
                         direction="backward")

    # images: nearest frame, NaN if none within half a tick
    grid = pd.merge_asof(grid, cam[["t", "frame_id"]], on="t",
                         direction="nearest", tolerance=0.5 / FPS)
    return grid`}
      </Code>
      <Code title="Every episode, Ray Data" note="CPU only">
        {`import ray

# one row per log line, every stream, every episode
logs = ray.data.read_parquet("s3://fleet-logs/2026-10/")

# one episode per call, on CPU workers
rows = logs.groupby("episode_id").map_groups(
    align_episode, batch_format="pandas")

# then pack the rows as LeRobot v3
rows.write_parquet("s3://datasets/aligned/")

# groupby shuffles every log line across the cluster.
# If logs are already one file per episode, align each
# file in a map step instead and skip the shuffle.`}
      </Code>
    </div>
  );
}
