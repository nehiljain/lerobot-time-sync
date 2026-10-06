import { useMemo, useRef, useState } from 'react';
import { Seg } from '../components/controls';
import { useElementWidth, useInView, usePrefersReducedMotion, useRafLoop } from '../lib/hooks';
import { clamp, mulberry32 } from '../lib/math';

/*
  A ROS graph and a recorder. The recorder is just another subscriber: it gets a copy of every
  message on the topics it subscribed to, stamps the time it received it, and appends it to the bag.
  Bandwidth math runs at real scale; the animation runs slowed down so dots stay readable.
*/

type TopicId = 'cam' | 'wrist' | 'joints' | 'cmd' | 'grip';

const TOPICS: {
  id: TopicId;
  node: string;
  topic: string;
  rate: number; // Hz, real
  bytes: number; // per message, real
  color: string;
  visRate: number; // dots per second on screen
  big: boolean;
}[] = [
  { id: 'cam', node: 'camera_driver', topic: '/cam_front/image_raw', rate: 30, bytes: 640 * 480 * 3, color: 'var(--ch-cam)', visRate: 2.6, big: true },
  { id: 'wrist', node: 'wrist_camera', topic: '/cam_wrist/image_raw', rate: 30, bytes: 640 * 480 * 3, color: '#a87410', visRate: 2.6, big: true },
  { id: 'joints', node: 'arm_driver', topic: '/joint_states', rate: 500, bytes: 220, color: 'var(--ch-joint)', visRate: 7, big: false },
  { id: 'cmd', node: 'teleop', topic: '/teleop/cmd', rate: 100, bytes: 120, color: 'var(--ch-action)', visRate: 4.5, big: false },
  { id: 'grip', node: 'gripper', topic: '/gripper/state', rate: 2, bytes: 40, color: 'var(--ch-grip)', visRate: 0.8, big: false },
];

const DISKS = {
  nvme: { label: 'NVMe SSD', mbps: 1500 },
  sata: { label: 'SATA SSD', mbps: 450 },
  sd: { label: 'SD card', mbps: 40 },
} as const;
type DiskId = keyof typeof DISKS;

const CACHE_MB = 100; // rosbag2's --max-cache-size CLI default is 100 MiB (double-buffered)
const TRAVEL = 2.2; // seconds a dot takes from publisher to recorder, on screen

type Dot = { id: number; topic: TopicId; born: number; fate: 'write' | 'drop' | 'skip'; done?: boolean };
type Tick = { id: number; topic: TopicId; at: number; dropped: boolean };

export function BusRecorder() {
  const reduced = usePrefersReducedMotion();
  const [ref, W] = useElementWidth<HTMLDivElement>(1000);
  const [viewRef, inView] = useInView<HTMLDivElement>('0px', false);
  const [on, setOn] = useState<Record<TopicId, boolean>>({ cam: true, wrist: true, joints: true, cmd: true, grip: true });
  const [disk, setDisk] = useState<DiskId>('sd');
  const [, force] = useState(0);
  const sim = useRef({ t: 0, nextId: 1, acc: {} as Record<string, number>, dots: [] as Dot[], tape: [] as Tick[], cache: 0, dropped: 0, written: 0 });
  const rnd = useMemo(() => mulberry32(9), []);

  const inMBps = TOPICS.reduce((a, tp) => a + (on[tp.id] ? (tp.rate * tp.bytes) / 1e6 : 0), 0);
  const outMBps = DISKS[disk].mbps;
  const saturated = inMBps > outMBps;
  const dropFrac = saturated ? 1 - outMBps / inMBps : 0;
  const fillSeconds = saturated ? CACHE_MB / (inMBps - outMBps) : Infinity;

  useRafLoop(inView && !reduced, (dt) => {
    const s = sim.current;
    s.t += dt;
    // cache fills (on screen) over a few seconds when the disk can't keep up, drains otherwise
    const visFill = saturated ? dt / clamp(fillSeconds / 2.5, 1.6, 6) : -dt / 1.2;
    s.cache = clamp(s.cache + visFill, 0, 1);
    for (const tp of TOPICS) {
      s.acc[tp.id] = (s.acc[tp.id] ?? rnd()) + dt * tp.visRate;
      while (s.acc[tp.id] >= 1) {
        s.acc[tp.id] -= 1;
        const fate: Dot['fate'] = !on[tp.id] ? 'skip' : s.cache >= 0.999 && rnd() < dropFrac ? 'drop' : 'write';
        s.dots.push({ id: s.nextId++, topic: tp.id, born: s.t, fate });
      }
    }
    for (const d of s.dots) {
      if (!d.done && s.t - d.born >= TRAVEL) {
        d.done = true;
        if (d.fate === 'write') {
          s.written++;
          s.tape.push({ id: d.id, topic: d.topic, at: s.t, dropped: false });
        } else if (d.fate === 'drop') {
          s.dropped++;
          s.tape.push({ id: d.id, topic: d.topic, at: s.t, dropped: true });
        }
      }
    }
    s.dots = s.dots.filter((d) => s.t - d.born < TRAVEL + 0.5);
    s.tape = s.tape.filter((k) => s.t - k.at < 9);
    force((n) => (n + 1) % 1_000_000);
  });

  /* layout */
  const compact = W < 720;
  const nodeW = compact ? 92 : 150;
  const laneTop = 54;
  const laneGap = compact ? 44 : 48;
  const xIn = nodeW + 14;
  const recW = compact ? 92 : 156;
  const xRec = W - recW - 8;
  const laneY = (i: number) => laneTop + i * laneGap;
  const tapeY = laneY(TOPICS.length) + 26;
  const H = tapeY + 42;
  const s = sim.current;

  const cmd = (() => {
    const chosen = TOPICS.filter((tp) => on[tp.id]).map((tp) => tp.topic);
    if (chosen.length === TOPICS.length) return 'ros2 bag record --all';
    if (chosen.length === 0) return 'ros2 bag record   # pick at least one topic';
    return `ros2 bag record ${chosen.join(' ')}`;
  })();

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }} ref={viewRef}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 1</b> &nbsp;The recorder is one more subscriber
        </div>
        <div className="fig__controls">
          <Seg
            label="Disk the bag is written to"
            value={disk}
            onChange={setDisk}
            options={(Object.keys(DISKS) as DiskId[]).map((k) => ({ value: k, label: DISKS[k].label }))}
          />
        </div>
      </div>
      <div className="bus-topics" role="group" aria-label="Topics to record">
        {TOPICS.map((tp) => (
          <button
            key={tp.id}
            type="button"
            className="topic-chip"
            aria-pressed={on[tp.id]}
            onClick={() => setOn((o) => ({ ...o, [tp.id]: !o[tp.id] }))}
          >
            <span className="topic-chip__dot" style={{ background: tp.color }} />
            {tp.topic}
          </button>
        ))}
      </div>
      <div className="fig__body" ref={ref}>
        <svg className="fig__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Five publishers send messages to a recorder writing to ${DISKS[disk].label}. Incoming ${inMBps.toFixed(1)} MB/s, disk ${outMBps} MB/s.`}>
          <text x={0} y={22} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            publishers
          </text>
          <text x={xRec} y={22} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            recorder
          </text>
          {TOPICS.map((tp, i) => {
            const y = laneY(i);
            return (
              <g key={tp.id} opacity={on[tp.id] ? 1 : 0.45}>
                <rect x={0} y={y - 15} width={nodeW} height={30} rx={7} fill="var(--screen-2)" stroke="var(--screen-rule)" />
                <circle cx={12} cy={y} r={4} fill={tp.color} />
                <text x={22} y={y + 4} fontSize={compact ? 10 : 12} fill="var(--screen-ink)" fontFamily={compact ? 'var(--font-mono)' : undefined}>
                  {compact ? tp.node.split('_')[0] : tp.node}
                </text>
                <line x1={xIn} x2={xRec} y1={y} y2={y} stroke="var(--screen-grid)" strokeWidth={2} />
                {!compact && (
                  <text x={xIn + 6} y={y - 8} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                    {tp.topic} · {tp.rate} Hz
                  </text>
                )}
              </g>
            );
          })}

          {/* messages in flight */}
          {s.dots.map((d) => {
            const i = TOPICS.findIndex((tp) => tp.id === d.topic);
            const tp = TOPICS[i];
            const p = clamp((s.t - d.born) / TRAVEL, 0, 1.2);
            const x = xIn + p * (xRec - xIn);
            const y = laneY(i);
            if (d.fate === 'skip') {
              // nobody records this topic: the message still flows on the bus, past the recorder
              return p <= 1 ? <rect key={d.id} x={x - 3} y={y - 3} width={6} height={6} rx={1.5} fill={tp.color} opacity={0.35} /> : null;
            }
            if (p > 1) {
              if (d.fate !== 'drop') return null;
              const k = (p - 1) / 0.2;
              return (
                <g key={d.id} opacity={1 - k}>
                  <line x1={xRec - 8} y1={y - 8} x2={xRec + 8} y2={y + 8} stroke="var(--bad)" strokeWidth={2.2} />
                  <line x1={xRec - 8} y1={y + 8} x2={xRec + 8} y2={y - 8} stroke="var(--bad)" strokeWidth={2.2} />
                </g>
              );
            }
            return tp.big ? (
              <rect key={d.id} x={x - 9} y={y - 7} width={18} height={14} rx={2.5} fill={tp.color} opacity={0.9} />
            ) : (
              <circle key={d.id} cx={x} cy={y} r={3.4} fill={tp.color} />
            );
          })}

          {/* recorder with its write cache */}
          <rect x={xRec} y={laneY(0) - 24} width={recW} height={laneY(TOPICS.length - 1) - laneY(0) + 48} rx={10} fill="var(--screen-2)" stroke="var(--screen-ink-3)" />
          <text x={xRec + 12} y={laneY(0) - 4} fontSize={compact ? 10 : 12} fill="var(--screen-ink)" fontFamily="var(--font-mono)">
            {compact ? 'record' : 'ros2 bag record'}
          </text>
          {(() => {
            const cx = xRec + 14;
            const cy0 = laneY(0) + 12;
            const ch = laneY(TOPICS.length - 1) - laneY(0) - 12;
            const fill = s.cache;
            return (
              <g>
                <rect x={cx} y={cy0} width={16} height={ch} rx={4} fill="var(--screen)" stroke="var(--screen-rule)" />
                <rect x={cx + 2} y={cy0 + 2 + (ch - 4) * (1 - fill)} width={12} height={(ch - 4) * fill} rx={2.5} fill={fill > 0.98 ? 'var(--bad)' : 'var(--focus-screen)'} />
                {!compact && (
                  <>
                    <text x={cx + 26} y={cy0 + 10} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-2)">
                      write cache
                    </text>
                    <text x={cx + 26} y={cy0 + 24} fontSize={9.5} fontFamily="var(--font-mono)" fill={fill > 0.98 ? '#f08a8a' : 'var(--screen-ink-3)'}>
                      {fill > 0.98 ? 'full: dropping' : `${Math.round(fill * 100)}% full`}
                    </text>
                    <text x={cx + 26} y={cy0 + ch - 14} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-2)">
                      → {DISKS[disk].label}
                    </text>
                    <text x={cx + 26} y={cy0 + ch} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                      {outMBps} MB/s
                    </text>
                  </>
                )}
              </g>
            );
          })()}

          {/* the bag: one stream, every topic interleaved by receive time */}
          <text x={0} y={tapeY - 8} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            {compact ? 'my_bag_0.mcap · receive order' : 'my_bag_0.mcap · messages in the order the recorder received them'}
          </text>
          <rect x={0} y={tapeY} width={W} height={34} rx={6} fill="var(--screen)" stroke="var(--screen-rule)" />
          {s.tape.map((k) => {
            const age = s.t - k.at;
            const x = W - 10 - age * ((W - 20) / 9);
            const tp = TOPICS.find((t) => t.id === k.topic)!;
            if (k.dropped) {
              return <rect key={k.id} x={x - 2} y={tapeY + 6} width={4} height={22} rx={1} fill="none" stroke="var(--bad)" strokeWidth={1} strokeDasharray="2 2" />;
            }
            return <rect key={k.id} x={x - (tp.big ? 3 : 1.5)} y={tapeY + (tp.big ? 6 : 11)} width={tp.big ? 6 : 3} height={tp.big ? 22 : 12} rx={1} fill={tp.color} />;
          })}
        </svg>
      </div>
      <div className="bus-stats">
        <code className="bus-cmd">{cmd}</code>
        <div className="bus-nums">
          <span>
            in <b>{inMBps.toFixed(1)} MB/s</b>
          </span>
          <span>
            disk <b>{outMBps} MB/s</b>
          </span>
          <span className={saturated ? 'is-bad' : 'is-ok'}>
            {saturated
              ? `cache full after ${fillSeconds.toFixed(1)} s, then ~${Math.round(dropFrac * 100)}% of messages dropped`
              : 'keeping up'}
          </span>
        </div>
      </div>
      <p className="fig__note">
        Two raw 640×480 cameras at 30 Hz are 55 MB/s. rosbag2's write cache defaults to 100 MiB; when it fills, new messages are dropped and
        counted, and the total is printed once, when recording stops. Rates and sizes are real; the animation is slowed down.
      </p>
    </figure>
  );
}
