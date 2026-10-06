/*
  One simulated teleop grasp, shared by every figure so the numbers agree.

  Time is in seconds on the robot PC's clock ("true" time).
  Each device logs with its own rate, clock offset and delay:
    logged_time = true_time + clock_offset (+ delivery delay for cameras)
  All numbers are illustrative, chosen to be typical rather than worst case.
*/
import { minJerk, mulberry32 } from './math';

export const FPS = 30;
export const DT = 1 / FPS;

/** Arm position (normalized -1..1): rest, reach, hold while grasping, lift. */
export function armPos(t: number): number {
  if (t < 0.1) return -0.7;
  if (t < 0.6) return -0.7 + 1.4 * minJerk((t - 0.1) / 0.5);
  if (t < 0.72) return 0.7;
  return 0.7 - 0.9 * minJerk((t - 0.72) / 0.38);
}

/** The leader arm runs ahead of the follower. This lead is real, not a clock error. */
export const COMMAND_LEAD = 0.06;
export const cmdPos = (t: number) => armPos(t + COMMAND_LEAD);

/** The fingers close on the object. */
export const GRIP_T = 0.64;
/** The operator squeezes the trigger before the fingers close. */
export const TRIGGER_T = GRIP_T - 0.04;
export const gripTrue = (t: number) => (t >= GRIP_T ? 1 : 0);

export const CLOCK = {
  camPc: 0.025, // camera PC runs 25 ms ahead of the robot PC
  robotPc: 0,
  teleopPc: -0.018, // teleop PC runs 18 ms behind
};
/** Exposure to "frame written to the log" on the camera PC. */
export const CAM_LATENCY = 0.042;
export const GRIP_DETECT = 0.004;
export const JOINT_DRIVER = 0.001;
/** One frame that never made it over USB. */
export const DROPPED_FRAME = 13;

export type Sample = { t: number; v: number };

export type Frame = {
  k: number;
  exposure: number; // true time the sensor was exposed
  logged: number; // what the camera PC wrote down (arrival, on its own clock)
  pose: number; // arm position visible in the frame
  grip: number; // 0 open, 1 closed, as visible in the frame
  dropped: boolean;
};

export interface Logs {
  frames: Frame[];
  joints: Sample[]; // 500 Hz, logged time
  teleop: Sample[]; // 100 Hz arm command, logged time
  trigger: Sample[]; // gripper command, on change, logged time
  grip: Sample[]; // gripper state, on change, logged time
}

/** Offsets that alignment removes, per stream (logged - true). */
export const STREAM_OFFSET = {
  cam: CLOCK.camPc + CAM_LATENCY,
  joint: CLOCK.robotPc + JOINT_DRIVER,
  action: CLOCK.teleopPc,
  grip: CLOCK.robotPc + GRIP_DETECT,
};

export function makeLogs(seed = 11): Logs {
  const rnd = mulberry32(seed);
  const jit = (a: number) => (rnd() * 2 - 1) * a;

  const frames: Frame[] = [];
  for (let k = -10; k <= 46; k++) {
    const exposure = k * DT + jit(0.0012);
    const logged = exposure + CLOCK.camPc + CAM_LATENCY + jit(0.004);
    frames.push({
      k,
      exposure,
      logged,
      pose: armPos(exposure),
      grip: gripTrue(exposure),
      dropped: k === DROPPED_FRAME,
    });
  }

  const joints: Sample[] = [];
  for (let i = -160; i <= 760; i++) {
    const t = i / 500;
    // the fingers closing on the object nudge the arm
    const contact = -0.07 * Math.exp(-(((t - GRIP_T) / 0.012) ** 2));
    joints.push({ t: t + CLOCK.robotPc + JOINT_DRIVER, v: armPos(t) + contact + jit(0.006) });
  }

  const teleop: Sample[] = [];
  for (let i = -32; i <= 152; i++) {
    const t = i / 100 + jit(0.0018);
    teleop.push({ t: t + CLOCK.teleopPc, v: cmdPos(t) });
  }

  const trigger: Sample[] = [
    { t: -10, v: 0 },
    { t: TRIGGER_T + CLOCK.teleopPc, v: 1 },
  ];
  const grip: Sample[] = [
    { t: -10, v: 0 },
    { t: GRIP_T + GRIP_DETECT, v: 1 },
  ];

  return { frames, joints, teleop, trigger, grip };
}

export const LOGS = makeLogs();

/* ---------- sampling ---------- */

function bracket(s: Sample[], t: number): number {
  // index of the last sample with s[i].t <= t (assumes sorted, t inside range)
  let lo = 0;
  let hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Linear interpolation. Right for continuous signals. */
export function interpAt(s: Sample[], t: number): number {
  if (t <= s[0].t) return s[0].v;
  const last = s.length - 1;
  if (t >= s[last].t) return s[last].v;
  const i = bracket(s, t);
  const a = s[i];
  const b = s[i + 1];
  return a.v + (b.v - a.v) * ((t - a.t) / (b.t - a.t));
}

/** Last value at or before t. Right for discrete states. */
export function holdAt(s: Sample[], t: number): number {
  if (t < s[0].t) return s[0].v;
  const last = s.length - 1;
  if (t >= s[last].t) return s[last].v;
  return s[bracket(s, t)].v;
}

export function holdSample(s: Sample[], t: number): Sample {
  if (t < s[0].t) return s[0];
  const last = s.length - 1;
  if (t >= s[last].t) return s[last];
  return s[bracket(s, t)];
}

export function nearestSample(s: Sample[], t: number): Sample {
  if (t <= s[0].t) return s[0];
  const last = s.length - 1;
  if (t >= s[last].t) return s[last];
  const i = bracket(s, t);
  return t - s[i].t <= s[i + 1].t - t ? s[i] : s[i + 1];
}

/** Window mean over [t - w/2, t + w/2]. Right for high-rate, noisy signals. */
export function meanAt(s: Sample[], t: number, w: number): number {
  let sum = 0;
  let n = 0;
  for (const p of s) {
    if (p.t >= t - w / 2 && p.t < t + w / 2) {
      sum += p.v;
      n++;
    }
  }
  return n ? sum / n : interpAt(s, t);
}

export function nearestFrame(
  frames: Frame[],
  t: number,
  tol: number,
  timeOf: (f: Frame) => number,
): { frame: Frame | null; dist: number } {
  let best: Frame | null = null;
  let bestD = Infinity;
  for (const f of frames) {
    if (f.dropped) continue;
    const d = Math.abs(timeOf(f) - t);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return bestD <= tol ? { frame: best, dist: bestD } : { frame: null, dist: bestD };
}

/* ---------- a longer session, for estimating a clock offset ---------- */

const MOVES: [number, number, number, number][] = [
  // start, end, from, to
  [0.35, 0.8, -0.8, 0.4],
  [1.3, 1.62, 0.4, -0.15],
  [2.2, 2.75, -0.15, 0.85],
  [3.4, 3.72, 0.85, 0.2],
  [4.45, 4.9, 0.2, -0.6],
];

export function sessionPos(t: number): number {
  let p = MOVES[0][2];
  for (const [a, b, from, to] of MOVES) {
    if (t >= a) p = from + (to - from) * minJerk((t - a) / (b - a));
  }
  return p;
}

export function sessionSpeed(t: number): number {
  const h = 0.004;
  return Math.abs(sessionPos(t + h) - sessionPos(t - h)) / (2 * h);
}

/** The offset the finder should recover: robot logs run 83 ms ahead of the camera. */
export const HIDDEN_OFFSET = 0.083;
export const SESSION_LEN = 5.6;

export function makeSession(seed = 5) {
  const rnd = mulberry32(seed);
  const noise = (a: number) => (rnd() * 2 - 1) * a;
  // camera: pixel change between consecutive frames (noisy), 30 Hz, on the reference clock
  const motion: Sample[] = [];
  for (let k = 0; k * DT <= SESSION_LEN; k++) {
    const t = k * DT;
    motion.push({ t, v: Math.max(0, sessionSpeed(t) * 0.42 + 0.05 + noise(0.07)) });
  }
  // encoders: joint speed, 100 Hz, stamped by a clock that runs ahead
  const speed: Sample[] = [];
  for (let i = -30; i / 100 <= SESSION_LEN + 0.3; i++) {
    const t = i / 100;
    speed.push({ t: t + HIDDEN_OFFSET, v: sessionSpeed(t) * 0.42 + 0.05 + noise(0.015) });
  }
  return { motion, speed };
}

/* ---------- force-torque at 1 kHz, for the resampling lab ---------- */

export function makeForce(seed = 3): Sample[] {
  const rnd = mulberry32(seed);
  const out: Sample[] = [];
  let hum = 0;
  for (let i = 300; i <= 900; i++) {
    const t = i / 1000;
    hum = 0.82 * hum + (rnd() * 2 - 1) * 0.16; // correlated sensor noise
    const contact = t >= GRIP_T ? 0.62 * (1 - Math.exp(-(t - GRIP_T) / 0.012)) : 0;
    const ring = t >= GRIP_T ? 0.22 * Math.exp(-(t - GRIP_T) / 0.03) * Math.sin((t - GRIP_T) * 2 * Math.PI * 55) : 0;
    out.push({ t, v: -0.55 + contact + ring + hum });
  }
  return out;
}
