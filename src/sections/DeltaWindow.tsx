import { useState } from 'react';
import { Range, Seg } from '../components/controls';
import { useElementWidth } from '../lib/hooks';

const FPS = 30;
const EP_LEN = 450; // episode 0: 15 s at 30 fps
const NEXT_LEN = 60; // the start of episode 1, for context

export function DeltaWindow() {
  const [chunk, setChunk] = useState<'50' | '100'>('50');
  const [idx, setIdx] = useState(425);
  const [ref, W] = useElementWidth<HTMLDivElement>(900);
  const H = Number(chunk);

  // what LeRobot does: delta_indices = round(dt * fps); clamp to the episode; mark the rest as padding
  const real = Math.max(0, Math.min(H, EP_LEN - idx));
  const pad = H - real;

  const total = EP_LEN + NEXT_LEN;
  const stripX0 = 0;
  const stripW = W;
  const px = (i: number) => stripX0 + (i / total) * stripW;
  const cells = H;
  const gap = cells > 60 ? 1 : 2;
  const cellW = (W - gap * (cells - 1)) / cells;

  return (
    <figure className="fig" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 3</b> &nbsp;One training sample's action window
        </div>
        <div className="fig__controls">
          <Seg
            label="Action chunk size"
            value={chunk}
            onChange={setChunk}
            options={[
              { value: '50', label: '50 actions · pi0, pi0.5, SmolVLA' },
              { value: '100', label: '100 · ACT' },
            ]}
          />
        </div>
      </div>
      <div className="fig__body" ref={ref}>
        <Range
          label="Current frame in episode 0"
          value={idx}
          min={0}
          max={EP_LEN - 1}
          display={`frame ${idx} · t = ${(idx / FPS).toFixed(3)} s`}
          onChange={setIdx}
          style={{ maxWidth: 420 }}
        />

        <svg className="fig__svg" width={W} height={132} viewBox={`0 0 ${W} 132`} style={{ marginTop: 18 }} aria-hidden="true">
          {/* episode strip */}
          <text x={0} y={12} fontSize={10} fontFamily="var(--font-mono)" fill="var(--ink-3)">
            episode 0 · 450 rows
          </text>
          <text x={px(EP_LEN) + 6} y={12} fontSize={10} fontFamily="var(--font-mono)" fill="var(--ink-3)">
            episode 1
          </text>
          <rect x={px(0)} y={20} width={px(EP_LEN) - px(0) - 1} height={18} rx={3} fill="#dfe5dd" />
          <rect x={px(EP_LEN) + 1} y={20} width={px(total) - px(EP_LEN) - 1} height={18} rx={3} fill="#e8ebe5" />
          <line x1={px(EP_LEN)} x2={px(EP_LEN)} y1={14} y2={44} stroke="var(--ink)" strokeWidth={1.5} />
          <rect x={px(idx)} y={20} width={Math.max(2, px(idx + real) - px(idx))} height={18} rx={2} fill="var(--ch-action)" opacity={0.85} />
          <line x1={px(idx)} x2={px(idx)} y1={16} y2={42} stroke="var(--ink)" strokeWidth={2} />

          {/* zoom: the window slots */}
          <path
            d={`M${px(idx)},44 L0,62 M${px(idx + H)},44 L${W},62`}
            stroke="var(--rule-strong)"
            strokeWidth={1}
            fill="none"
          />
          <defs>
            <pattern id="pad-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--ink-3)" strokeWidth="1.2" />
            </pattern>
          </defs>
          {Array.from({ length: cells }, (_, j) => {
            const isPad = j >= real;
            return (
              <rect
                key={j}
                x={j * (cellW + gap)}
                y={66}
                width={cellW}
                height={30}
                rx={Math.min(3, cellW / 3)}
                fill={isPad ? 'url(#pad-hatch)' : 'var(--ch-action)'}
                stroke={isPad ? 'var(--ink-3)' : 'none'}
                strokeWidth={isPad ? 0.8 : 0}
                opacity={isPad ? 0.9 : 0.35 + 0.65 * (1 - j / cells)}
              />
            );
          })}
          <text x={0} y={114} fontSize={10} fontFamily="var(--font-mono)" fill="var(--ink-2)">
            t+0
          </text>
          <text x={W} y={114} textAnchor="end" fontSize={10} fontFamily="var(--font-mono)" fill="var(--ink-2)">
            t+{H - 1} · {((H - 1) / FPS).toFixed(3)} s
          </text>
          {pad > 0 && (
            <text
              x={real * (cellW + gap) > W / 2 ? W : real * (cellW + gap)}
              y={128}
              textAnchor={real * (cellW + gap) > W / 2 ? 'end' : 'start'}
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--ink)"
            >
              {pad} padded · action_is_pad = True
            </text>
          )}
        </svg>

        <div className="delta-readout">
          <div>
            <span className="delta-readout__k">you ask</span>
            <code>{`delta_timestamps = {"action": [0, 1/30, …, ${H - 1}/30]}`}</code>
          </div>
          <div>
            <span className="delta-readout__k">LeRobot does</span>
            <code>{`round(dt × 30) → rows [0, 1, …, ${H - 1}]`}</code>
          </div>
          <div>
            <span className="delta-readout__k">you get</span>
            <span>
              rows {idx} to {idx + real - 1}
              {pad > 0 ? `, then ${pad} copies of the last row marked as padding` : ''}. The window never crosses into
              the next episode.
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
