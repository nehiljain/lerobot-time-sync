import { useState, type ReactNode } from 'react';
import { FrameGlyph } from '../components/FrameGlyph';
import { Switch } from '../components/controls';
import { useElementWidth, usePrefersReducedMotion, useTween } from '../lib/hooks';
import { fmtMs, linear } from '../lib/math';
import { CAM_LATENCY, CLOCK, DT, GRIP_DETECT, GRIP_T, JOINT_DRIVER, LOGS, TRIGGER_T } from '../lib/world';

const T0 = GRIP_T - 0.115;
const T1 = GRIP_T + 0.175;

// the first frame that shows the fingers closed
const EVENT_FRAME = LOGS.frames.find((f) => !f.dropped && f.exposure >= GRIP_T)!;

export function RawStreams() {
  const reduced = usePrefersReducedMotion();
  const [fixDelay, setFixDelay] = useState(false);
  const [fixClock, setFixClock] = useState(false);
  const a = useTween(fixDelay ? 1 : 0, 650, reduced);
  const b = useTween(fixClock ? 1 : 0, 650, reduced);
  const [ref, W] = useElementWidth<HTMLDivElement>(960);

  // correction applied to each stream's logged timestamps
  const shift = {
    cam: CAM_LATENCY * a + CLOCK.camPc * b,
    joint: 0,
    action: CLOCK.teleopPc * b,
    grip: 0,
  };

  // where each stream places the grasp, relative to when it really happened
  const camEvt = EVENT_FRAME.logged - shift.cam;
  const events = [
    { id: 'cam', t: camEvt },
    { id: 'joint', t: GRIP_T + JOINT_DRIVER },
    { id: 'action', t: TRIGGER_T + CLOCK.teleopPc - shift.action },
    { id: 'grip', t: GRIP_T + GRIP_DETECT },
  ] as const;

  const compact = W < 640;
  const labelW = compact ? 50 : 150;
  const x0 = labelW + 10;
  const x1 = W - 10;
  const x = linear(T0, T1, x0, x1);
  const top = 34;
  const laneH = 50;
  const gap = 10;
  const laneTop = (i: number) => top + i * (laneH + gap);
  const bottom = laneTop(4) - gap;
  const H = bottom + 44;
  const yIn = (i: number, v: number) => laneTop(i) + laneH / 2 - v * (laneH / 2 - 7);
  const inWin = (t: number) => t > T0 - 0.06 && t < T1 + 0.06;

  const lanes = [
    { name: 'Front camera', meta: fixDelay ? '30 Hz · at exposure' : '30 Hz · on arrival', short: 'CAM', color: 'var(--ch-cam)' },
    { name: 'Joint encoders', meta: '500 Hz · robot PC', short: 'JNT', color: 'var(--ch-joint)' },
    { name: 'Teleop trigger', meta: 'on change · teleop PC', short: 'CMD', color: 'var(--ch-action)' },
    { name: 'Gripper state', meta: 'on change · robot PC', short: 'GRP', color: 'var(--ch-grip)' },
  ];

  const joints = LOGS.joints.filter((s) => inWin(s.t));
  const jpath = joints.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${yIn(1, (s.v - 0.62) * 9).toFixed(1)}`).join('');
  const trigT = TRIGGER_T + CLOCK.teleopPc - shift.action;
  const gripT = GRIP_T + GRIP_DETECT;
  const fw = Math.min(28, ((x1 - x0) / ((T1 - T0) / DT)) * 0.72);

  const ticks = [-0.1, -0.05, 0, 0.05, 0.1, 0.15];

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 4</b> &nbsp;One grasp, four timestamps
        </div>
      </div>
      <div className="raw-controls">
        <Switch checked={fixDelay} onChange={setFixDelay} hint={`camera: ${fmtMs(-CAM_LATENCY, true)}`}>
          Stamp frames at exposure, not arrival
        </Switch>
        <Switch checked={fixClock} onChange={setFixClock} hint={`camera PC ${fmtMs(-CLOCK.camPc, true)} · teleop PC ${fmtMs(-CLOCK.teleopPc, true)}`}>
          Put every PC on one clock
        </Switch>
      </div>
      <div className="fig__body" ref={ref}>
        <svg className="fig__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Four streams record the same grasp at different logged times. Corrections move them together, except the teleop trigger, which really happens 40 ms earlier.">
          <defs>
            <clipPath id="raw-plot">
              <rect x={x0} y={0} width={x1 - x0} height={H} />
            </clipPath>
          </defs>

          {/* true moment */}
          <line x1={x(GRIP_T)} x2={x(GRIP_T)} y1={top - 12} y2={bottom + 6} stroke="var(--screen-ink)" strokeWidth={1.2} opacity={0.8} />
          <text x={x(GRIP_T)} y={top - 18} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink)">
            fingers close (true time)
          </text>

          {lanes.map((l, i) => (
            <g key={l.name}>
              <line x1={x0} x2={x1} y1={laneTop(i) + laneH / 2} y2={laneTop(i) + laneH / 2} stroke="var(--screen-grid)" />
              <rect x={0} y={laneTop(i) + (compact ? laneH / 2 - 4 : 9)} width={8} height={8} rx={2} fill={l.color} />
              {compact ? (
                <text x={14} y={laneTop(i) + laneH / 2 + 3.5} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-2)">
                  {l.short}
                </text>
              ) : (
                <>
                  <text x={16} y={laneTop(i) + 17} fontSize={13} fill="var(--screen-ink)">
                    {l.name}
                  </text>
                  <text x={16} y={laneTop(i) + 32} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                    {l.meta}
                  </text>
                </>
              )}
            </g>
          ))}

          <g clipPath="url(#raw-plot)">
            {LOGS.frames
              .filter((f) => !f.dropped && inWin(f.logged - shift.cam))
              .map((f) => (
                <FrameGlyph
                  key={f.k}
                  x={x(f.logged - shift.cam)}
                  y={laneTop(0) + laneH / 2}
                  w={fw}
                  h={laneH * 0.62}
                  pose={f.pose}
                  grip={f.grip}
                  highlight={f.k === EVENT_FRAME.k}
                />
              ))}
            <path d={jpath} fill="none" stroke="var(--ch-joint)" strokeWidth={1.4} />
            <path
              d={`M${x0 - 20},${yIn(2, -0.65)}H${x(trigT)}V${yIn(2, 0.65)}H${x1 + 20}`}
              fill="none"
              stroke="var(--ch-action)"
              strokeWidth={2}
            />
            <path d={`M${x0 - 20},${yIn(3, -0.65)}H${x(gripT)}V${yIn(3, 0.65)}H${x1 + 20}`} fill="none" stroke="var(--ch-grip)" strokeWidth={2} />
          </g>

          {/* each stream's claim, measured against the true moment */}
          {events.map((e, i) => {
            const ex = x(e.t);
            const cy = laneTop(i) + laneH - 4;
            const d = e.t - GRIP_T;
            const right = ex >= x(GRIP_T);
            return (
              <g key={e.id}>
                <line x1={x(GRIP_T)} x2={ex} y1={cy} y2={cy} stroke="var(--focus-screen)" strokeWidth={1.5} />
                <path d={`M${ex},${cy - 4} L${ex + 4},${cy} L${ex},${cy + 4} L${ex - 4},${cy} Z`} fill="var(--focus-screen)" />
                <text
                  x={ex + (right ? 8 : -8)}
                  y={cy + 3.5}
                  textAnchor={right ? 'start' : 'end'}
                  fontSize={10.5}
                  fontWeight={600}
                  fontFamily="var(--font-mono)"
                  fill="var(--screen-ink)"
                >
                  {fmtMs(d, true)}
                </text>
              </g>
            );
          })}

          {/* axis: time relative to the grasp */}
          <line x1={x0} x2={x1} y1={bottom + 12} y2={bottom + 12} stroke="var(--screen-rule)" />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(GRIP_T + t)} x2={x(GRIP_T + t)} y1={bottom + 12} y2={bottom + 17} stroke="var(--screen-rule)" />
              <text x={x(GRIP_T + t)} y={bottom + 30} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                {fmtMs(t, true)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="raw-readout">
        <ReadoutRow color="var(--ch-cam)" name="Camera" value={camEvt - GRIP_T}>
          {fixDelay && fixClock
            ? 'What is left is frame spacing: the grasp fell between two frames 33 ms apart.'
            : `Arrival delay ${fmtMs(CAM_LATENCY)} + camera PC clock ${fmtMs(CLOCK.camPc, true)} + frame spacing.`}
        </ReadoutRow>
        <ReadoutRow color="var(--ch-joint)" name="Joints" value={JOINT_DRIVER}>
          Robot PC is the reference here. 1 ms of driver delay.
        </ReadoutRow>
        <ReadoutRow color="var(--ch-action)" name="Teleop" value={trigT - GRIP_T}>
          {fixClock
            ? 'The remaining 40 ms is real: the operator squeezes before the fingers close. Keep it. That lead is what the policy learns.'
            : `Teleop PC clock runs ${fmtMs(-CLOCK.teleopPc)} behind, on top of a real 40 ms lead.`}
        </ReadoutRow>
        <ReadoutRow color="var(--ch-grip)" name="Gripper" value={GRIP_DETECT}>
          Logged only when the state changes. 4 ms to detect it.
        </ReadoutRow>
      </div>
    </figure>
  );
}

function ReadoutRow({ color, name, value, children }: { color: string; name: string; value: number; children: ReactNode }) {
  return (
    <div className="raw-readout__row">
      <span className="raw-readout__key" style={{ background: color }} />
      <span className="raw-readout__val">{fmtMs(value, true)}</span>
      <span className="raw-readout__name">{name}</span>
      <span className="raw-readout__why">{children}</span>
    </div>
  );
}
