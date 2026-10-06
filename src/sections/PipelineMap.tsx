import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Seg } from '../components/controls';
import { usePrefersReducedMotion } from '../lib/hooks';

type NodeId = 'video' | 'logs' | 'labels' | 'caption' | 'embed' | 'split' | 'ft' | 'serve';
type CalloutId = 'hetero' | 'starve' | 'batch' | 'big';
type Sel = NodeId | CalloutId;

type NodeSpec = { x: number; y: number; w: number; h: number; label: string; kind: 'cpu' | 'gpu' | 'edge' };

const NODES: Record<NodeId, NodeSpec> = {
  video: { x: 66, y: 206, w: 280, h: 40, label: 'Read → decode → resize → batch frames', kind: 'cpu' },
  logs: { x: 66, y: 336, w: 280, h: 40, label: 'Read → time synchronization / alignment', kind: 'cpu' },
  labels: { x: 372, y: 206, w: 216, h: 40, label: 'class labels, bounding boxes', kind: 'gpu' },
  caption: { x: 372, y: 262, w: 216, h: 40, label: 'LLM generate frame descrip.', kind: 'gpu' },
  embed: { x: 372, y: 336, w: 216, h: 40, label: 'embedding → similarity search', kind: 'gpu' },
  split: { x: 614, y: 206, w: 138, h: 40, label: 'train / eval split', kind: 'cpu' },
  ft: { x: 776, y: 206, w: 50, h: 40, label: 'FT', kind: 'gpu' },
  serve: { x: 866, y: 96, w: 164, h: 328, label: 'Serve (on-device)', kind: 'edge' },
};

type CalloutSpec = { x: number; y: number; w: number; h: number; lines: string[]; wire: string };

const CALLOUTS: Record<CalloutId, CalloutSpec> = {
  hetero: { x: 222, y: 18, w: 466, h: 36, lines: ['Heterogeneous (CPU + GPU) orchestration for multimodal pipelines'], wire: 'M455,54 V96' },
  starve: { x: 588, y: 146, w: 254, h: 36, lines: ['GPU starvation from slow data loading'], wire: 'M764,182 V226' },
  batch: { x: 372, y: 458, w: 216, h: 36, lines: ['Scalable batch AI processing'], wire: 'M400,376 V458' },
  big: { x: 716, y: 446, w: 314, h: 52, lines: ['large model / large dataset →', 'distributed training'], wire: 'M801,246 V446' },
};

const EDGES: { d: string; arrow?: boolean }[] = [
  { d: 'M38,226 H66', arrow: true },
  { d: 'M38,356 H66', arrow: true },
  { d: 'M346,226 H372', arrow: true },
  { d: 'M359,226 V282 H372', arrow: true },
  { d: 'M588,226 H614', arrow: true },
  { d: 'M588,282 H601 V226' },
  { d: 'M346,356 H372', arrow: true },
  { d: 'M588,356 H683 V246', arrow: true },
  { d: 'M752,226 H776', arrow: true },
  { d: 'M826,226 H866', arrow: true },
];

type Detail = { title: string; kind?: string; rows: [string, ReactNode][] };

const DETAILS: Record<Sel, Detail> = {
  video: {
    title: 'Read → decode → resize → batch frames',
    kind: 'CPU',
    rows: [
      ['What', 'Pull raw video from fleet storage, decode it, resize to the model input, batch.'],
      ['Why CPU', 'Decoding is CPU work. One hour of 30 fps video is 108,000 frames per camera.'],
      ['Output', 'Frames with their timestamps. Those timestamps are the grid the logs get aligned to.'],
      ['On Ray', 'Ray Data read + map_batches on a CPU node pool, streaming into the GPU steps.'],
    ],
  },
  logs: {
    title: 'Read → time synchronization / alignment',
    kind: 'CPU',
    rows: [
      ['What', 'Read state, actions, gripper and other sensor logs. Shift them onto one clock and resample them onto the frame timeline, per episode.'],
      ['Why here', 'These logs come at 100 to 1000 Hz, from other computers, on other clocks. This is the step that makes each LeRobot row true.'],
      ['Output', 'One row per frame tick: state, action, gripper, plus masks where data is missing.'],
      ['On Ray', 'groupby("episode_id").map_groups(align_episode) on CPU, or a map over per-episode files.'],
      ['The line', 'The vertical line to the video read: alignment needs the frame timestamps (or a shared clock) to build its grid.'],
    ],
  },
  labels: {
    title: 'class labels, bounding boxes',
    kind: 'GPU',
    rows: [
      ['What', 'Run a detector over frames to tag objects and scenes.'],
      ['Why', 'Lets you filter and balance the training mix, for example only episodes with a mug on the table.'],
      ['On Ray', 'map_batches with a GPU actor pool. The model loads once per actor, not once per batch.'],
    ],
  },
  caption: {
    title: 'LLM generate frame description',
    kind: 'GPU',
    rows: [
      ['What', 'A vision-language model writes text for frames or segments: what the robot is doing.'],
      ['Why', 'VLAs are conditioned on language. Fleet logs rarely come with good instructions, so you generate or refine them.'],
      ['On Ray', 'Ray Data LLM: batch inference with vLLM engines on GPU workers.'],
    ],
  },
  embed: {
    title: 'embedding → similarity search',
    kind: 'GPU',
    rows: [
      ['What', 'Embed frames, trajectories or whole episodes, then query an index.'],
      ['Why', 'Find near-duplicates to drop, rare cases to upweight, or more examples like a failure you saw.'],
      ['On Ray', 'GPU map_batches to embed, then write to a vector index.'],
    ],
  },
  split: {
    title: 'train / eval split',
    kind: 'CPU',
    rows: [
      ['What', 'Split curated episodes into training and evaluation sets.'],
      ['Watch out', 'Split by episode, or by robot, scene or day. Never by frame: frames 33 ms apart are near-identical, so a frame split leaks training data into eval.'],
      ['Output', 'LeRobot-format datasets. This is where the format shows up.'],
    ],
  },
  ft: {
    title: 'FT (fine-tune)',
    kind: 'GPU',
    rows: [
      ['What', 'Fine-tune the VLA, for example pi0.5, SmolVLA, GR00T or OpenVLA, on the curated episodes.'],
      ['Why distributed', '3B to 7B parameters and terabytes of video. A 7B full fine-tune with AdamW holds about 120 GB of weights, gradients and optimizer state, so it needs sharding.'],
      ['On Ray', 'Ray Train with DDP or FSDP. Ray Data streams decoded batches from CPU nodes so GPUs don\'t wait.'],
    ],
  },
  serve: {
    title: 'Serve (on-device)',
    kind: 'Robot',
    rows: [
      ['What', 'Export the trained policy to the robot\'s own computer, for example a Jetson, and run it at the control rate.'],
      ['Why outside the box', 'Control loops can\'t wait on a network round trip. The cloud part ends at a checkpoint.'],
    ],
  },
  hetero: {
    title: 'Heterogeneous (CPU + GPU) orchestration',
    kind: 'Bottleneck',
    rows: [
      ['Problem', 'Decode and alignment want many CPUs. Labels, captions and embeddings want GPUs. Run them as separate jobs and one side idles while the other works.'],
      ['Fix', 'One streaming pipeline with CPU and GPU stages scheduled together, each scaled to keep the next one fed.'],
    ],
  },
  starve: {
    title: 'GPU starvation from slow data loading',
    kind: 'Bottleneck',
    rows: [
      ['Problem', 'Video decode on the training node can\'t keep up with the GPUs, so they wait.'],
      ['Fix', 'Decode on a separate CPU node pool and stream batches into training.'],
    ],
  },
  batch: {
    title: 'Scalable batch AI processing',
    kind: 'Bottleneck',
    rows: [
      ['Problem', 'Detection, captions and embeddings are model inference over millions of frames.'],
      ['Fix', 'Batch inference with autoscaling GPU pools and backpressure, so a slow model doesn\'t flood memory.'],
    ],
  },
  big: {
    title: 'Large model / large dataset → distributed training',
    kind: 'Bottleneck',
    rows: [
      ['Problem', 'Models and datasets outgrow one GPU and one node.'],
      ['Fix', 'Multi-GPU, multi-node training with sharding (FSDP) and checkpoints that survive node failures.'],
    ],
  },
};

const VB_W = 1040;
const VB_H = 560;

export function PipelineMap() {
  const reduced = usePrefersReducedMotion();
  const [sel, setSel] = useState<Sel>('logs');
  const [layer, setLayer] = useState<'bottlenecks' | 'lerobot'>('bottlenecks');
  const detail = DETAILS[sel];

  const nodeProps = (id: Sel, label: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    'aria-pressed': sel === id,
    onClick: () => setSel(id),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSel(id);
      }
    },
    className: 'pm-hit',
    style: { cursor: 'pointer' },
  });

  return (
    <figure className="fig pm" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 8</b> &nbsp;The Ray Summit slide, as a map · click any box
        </div>
        <div className="fig__controls">
          <Seg
            label="Overlay"
            value={layer}
            onChange={setLayer}
            options={[
              { value: 'bottlenecks', label: 'Bottlenecks' },
              { value: 'lerobot', label: 'Where LeRobot fits' },
            ]}
          />
        </div>
      </div>
      <div className="pm__scroll">
        <svg className="pm__svg" viewBox={`0 0 ${VB_W} ${VB_H}`} role="group" aria-label="VLA fine-tuning pipeline">
          <defs>
            <marker id="pm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="#5f6964" />
            </marker>
          </defs>

          {/* cloud box */}
          <rect x={48} y={96} width={794} height={328} rx={12} fill="#ffffff" stroke="var(--rule-strong)" />
          <text x={445} y={138} textAnchor="middle" fontSize={17} fill="var(--ink-2)">
            Data Prep + Fine-Tune (Cloud)
          </text>

          {/* inputs */}
          <g aria-hidden="true">
            <rect x={11} y={216} width={18} height={20} rx={3} fill="var(--ink)" />
            <path d="M29,221 L37,216 V236 L29,231 Z" fill="var(--ink)" />
            <text x={24} y={254} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
              video
            </text>
            <ellipse cx={24} cy={343} rx={11} ry={4} fill="var(--ink)" />
            <path d="M13,343 V367 A11,4 0 0 0 35,367 V343" fill="var(--ink)" />
            <path d="M13,351 A11,4 0 0 0 35,351 M13,359 A11,4 0 0 0 35,359" fill="none" stroke="#fff" strokeWidth={1.2} />
            <text x={24} y={386} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
              logs
            </text>
          </g>

          {/* edges */}
          <path d="M206,246 V336" stroke="#5f6964" strokeWidth={1.5} fill="none" />
          {EDGES.map((e, i) => (
            <path key={i} id={`pm-e${i}`} d={e.d} stroke="#5f6964" strokeWidth={1.5} fill="none" markerEnd={e.arrow ? 'url(#pm-arrow)' : undefined} />
          ))}
          {!reduced &&
            EDGES.map((e, i) => (
              <circle key={`dot${i}`} r={2.6} fill="var(--ink)">
                <animateMotion dur={`${1.4 + (i % 3) * 0.25}s`} repeatCount="indefinite" path={e.d} begin={`${(i * 0.17) % 1}s`} />
              </circle>
            ))}

          {/* lerobot overlay, behind the nodes */}
          {layer === 'lerobot' && (
            <g aria-hidden="true">
              <rect x={58} y={190} width={540} height={204} rx={10} fill="rgba(27,33,30,0.04)" stroke="var(--ink)" strokeDasharray="5 4" />
              <text x={70} y={410} fontSize={12} fill="var(--ink)">
                getting to aligned, labeled, curated rows
              </text>
              <rect x={604} y={196} width={158} height={60} rx={10} fill="rgba(42,120,214,0.08)" stroke="var(--ink)" strokeWidth={2} />
              <text x={772} y={282} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">
                LeRobot v3 datasets
              </text>
              <text x={772} y={298} textAnchor="middle" fontSize={11} fill="var(--ink-2)">
                written here, read by FT
              </text>
            </g>
          )}

          {/* nodes */}
          {(Object.keys(NODES) as NodeId[]).map((id) => {
            const n = NODES[id];
            const active = sel === id;
            if (n.kind === 'edge') {
              return (
                <g key={id} {...nodeProps(id, n.label)}>
                  <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={12} fill="#ffffff" stroke={active ? 'var(--ink)' : 'var(--rule-strong)'} strokeWidth={active ? 2 : 1} />
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 - 4} textAnchor="middle" fontSize={17} fill="var(--ink-2)">
                    Serve
                  </text>
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 18} textAnchor="middle" fontSize={17} fill="var(--ink-2)">
                    (on-device)
                  </text>
                </g>
              );
            }
            return (
              <g key={id} {...nodeProps(id, `${n.label}, ${n.kind.toUpperCase()} task`)}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx={8}
                  fill={active ? '#ffffff' : '#fbfcfa'}
                  stroke={active ? 'var(--ink)' : '#c4ccc5'}
                  strokeWidth={active ? 2 : 1}
                />
                {n.kind === 'cpu' ? (
                  <circle cx={n.x + 17} cy={n.y + n.h / 2} r={7.5} fill="var(--cpu)" />
                ) : (
                  <rect x={n.x + 10} y={n.y + n.h / 2 - 7} width={14} height={14} rx={2.5} fill="var(--gpu)" />
                )}
                <text x={n.x + 32} y={n.y + n.h / 2 + 4.2} fontSize={12} fill="var(--ink)">
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* bottleneck callouts */}
          {layer === 'bottlenecks' &&
            (Object.keys(CALLOUTS) as CalloutId[]).map((id) => {
              const c = CALLOUTS[id];
              const active = sel === id;
              return (
                <g key={id}>
                  <path d={c.wire} stroke="var(--warn-edge)" strokeWidth={1.5} fill="none" />
                  <g {...nodeProps(id, `Bottleneck: ${c.lines.join(' ')}`)}>
                    <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={4} fill="var(--warn-fill)" stroke="var(--warn-edge)" strokeWidth={active ? 2.5 : 1.5} />
                    <path
                      d={`M${c.x + 18},${c.y + c.h / 2 - 7} L${c.x + 26},${c.y + c.h / 2 + 6} L${c.x + 10},${c.y + c.h / 2 + 6} Z`}
                      fill="#e5a01a"
                      stroke="#9a6400"
                      strokeWidth={0.8}
                    />
                    <text x={c.x + 18} y={c.y + c.h / 2 + 4.5} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#3a2600">
                      !
                    </text>
                    {c.lines.map((l, i) => (
                      <text key={i} x={c.x + 34} y={c.y + c.h / 2 + 4.5 + (i - (c.lines.length - 1) / 2) * 16} fontSize={12} fontWeight={600} fill="var(--warn-ink)">
                        {l}
                      </text>
                    ))}
                  </g>
                </g>
              );
            })}

          {/* legend */}
          <g aria-hidden="true">
            <rect x={60} y={452} width={128} height={36} rx={4} fill="#fff" stroke="var(--rule-strong)" />
            <circle cx={80} cy={470} r={7.5} fill="var(--cpu)" />
            <text x={96} y={474} fontSize={12} fontWeight={600} fill="var(--ink)">
              CPU tasks
            </text>
            <rect x={200} y={452} width={128} height={36} rx={4} fill="#fff" stroke="var(--rule-strong)" />
            <rect x={213} y={463} width={14} height={14} rx={2.5} fill="var(--gpu)" />
            <text x={236} y={474} fontSize={12} fontWeight={600} fill="var(--ink)">
              GPU tasks
            </text>
          </g>
        </svg>
      </div>

      <div className="pm__detail" aria-live="polite">
        <div className="pm__detail-head">
          {detail.kind && <span className={`pm__kind pm__kind--${detail.kind.toLowerCase()}`}>{detail.kind}</span>}
          <h3>{detail.title}</h3>
        </div>
        <dl className="pm__rows">
          {detail.rows.map(([k, v]) => (
            <div key={k} className="pm__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </figure>
  );
}
