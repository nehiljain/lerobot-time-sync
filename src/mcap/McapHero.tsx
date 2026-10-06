import { useEffect, useMemo, useState } from 'react';
import { IconReplay, Seg } from '../components/controls';
import { useElementWidth, usePrefersReducedMotion, useRafLoop } from '../lib/hooks';
import { clamp, easeInOut } from '../lib/math';
import { CHUNK_SECONDS, GROUP_COLOR, GROUP_LABEL, RECORDS, TOTAL_BYTES, fmtBytes, type Group } from './model';
import { SectionBrackets, Strip, layoutStrip } from './Strip';

const T_WRITE: [number, number] = [0.2, 3.4];
const T_CLOSE: [number, number] = [3.6, 4.4];
const T_SEEK: [number, number] = [4.9, 8.2];
const T_END = 8.4;

const dataUnits = RECORDS.filter((r) => r.section === 'data').reduce((a, r) => a + r.units, 0);
const tailUnits = RECORDS.filter((r) => r.section !== 'data').reduce((a, r) => a + r.units, 0);

export function McapHero() {
  const reduced = usePrefersReducedMotion();
  const [ref, W0] = useElementWidth<HTMLDivElement>(1000);
  const W = Math.max(W0, 760);
  const [clock, setClock] = useState(reduced ? T_END : 0);
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState<'1.0' | '7.3' | '11.5'>('7.3');

  // auto-start once on mount; safe under StrictMode because the cleanup cancels the pending start
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => setPlaying(true), 400);
    return () => window.clearTimeout(id);
  }, [reduced]);

  useRafLoop(playing, (dt) =>
    setClock((c) => {
      const n = c + dt;
      if (n >= T_END) {
        setPlaying(false);
        return T_END;
      }
      return n;
    }),
  );

  const layout = useMemo(() => layoutStrip(W), [W]);
  const tt = Number(target);
  const chunkIdx = Math.min(5, Math.floor(tt / CHUNK_SECONDS));

  const writeP = clamp((clock - T_WRITE[0]) / (T_WRITE[1] - T_WRITE[0]), 0, 1);
  const closeP = clamp((clock - T_CLOSE[0]) / (T_CLOSE[1] - T_CLOSE[0]), 0, 1);
  const seekP = clamp((clock - T_SEEK[0]) / (T_SEEK[1] - T_SEEK[0]), 0, 1);
  const step = seekP <= 0 ? 0 : seekP < 0.22 ? 1 : seekP < 0.5 ? 2 : seekP < 0.72 ? 3 : 4;
  const done = clock >= T_END;

  // progressive reveal by drawing units
  const unitStart: number[] = [];
  {
    let acc = 0;
    let accTail = 0;
    RECORDS.forEach((r, i) => {
      if (r.section === 'data') {
        unitStart[i] = acc;
        acc += r.units;
      } else {
        unitStart[i] = accTail;
        accTail += r.units;
      }
    });
  }
  const visible = (_: unknown, i: number) => {
    const r = RECORDS[i];
    if (r.section === 'data') return clamp((writeP * dataUnits - unitStart[i]) / r.units, 0, 1);
    return clamp((closeP * tailUnits - unitStart[i]) / r.units, 0, 1);
  };

  const hotKeys = new Set<string>();
  const readKeys = new Set<string>();
  if (step >= 1) {
    hotKeys.add('footer');
    readKeys.add('magic1');
  }
  if (step >= 2) RECORDS.filter((r) => r.section === 'summary').forEach((r) => readKeys.add(r.key));
  if (step >= 3) hotKeys.add(`ci${chunkIdx}`);
  if (step >= 4) {
    hotKeys.add(`chunk${chunkIdx}`);
    readKeys.add(`mi${chunkIdx}-1`);
    readKeys.add(`mi${chunkIdx}-2`);
  }
  const state = (r: (typeof RECORDS)[number]) => {
    if (step === 0) return 'normal' as const;
    if (hotKeys.has(r.key)) return 'hot' as const;
    if (readKeys.has(r.key)) return 'read' as const;
    return 'dim' as const;
  };

  const bytesRead =
    (step >= 1 ? 37 : 0) +
    (step >= 2 ? RECORDS.filter((r) => r.section === 'summary').reduce((a, r) => a + r.bytes, 0) : 0) +
    (step >= 4 ? RECORDS.filter((r) => r.chunk === chunkIdx && r.section === 'data').reduce((a, r) => a + r.bytes, 0) : 0);

  const y = 92;
  const h = 46;
  const H = 214;
  const pos = (key: string) => {
    const l = layout.find((x) => x.rec.key === key)!;
    return { x: l.x + l.w / 2, x0: l.x, x1: l.x + l.w };
  };
  const arc = (from: number, to: number, height: number, p: number, color: string) => {
    const mid = (from + to) / 2;
    const d = `M${from},${y - 4} Q${mid},${y - 4 - height} ${to},${y - 4}`;
    const len = Math.abs(to - from) * 1.25 + height;
    return <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray={len} strokeDashoffset={len * (1 - p)} markerEnd={p > 0.95 ? 'url(#mh-arrow)' : undefined} />;
  };
  const sumStart = layout.find((l) => l.rec.section === 'summary')!.x;
  const cursorX = (() => {
    if (writeP <= 0 || writeP >= 1) return null;
    const i = layout.findIndex((l, k) => visible(l.rec, k) > 0 && visible(l.rec, k) < 1);
    return i < 0 ? null : layout[i].x + layout[i].w * visible(layout[i].rec, i);
  })();
  const stepP = (a: number, b: number) => easeInOut((seekP - a) / (b - a));

  const captions = [
    'A writer streams records front to back. Messages go into compressed chunks; each chunk is followed by message indexes.',
    '1 · A reader starts at the end: the last 37 bytes are the footer and the magic, and the footer says where the summary begins.',
    '2 · The summary repeats schemas and channels and lists every chunk with its time range.',
    `3 · The chunk index for ${tt.toFixed(1)} s gives the byte offset of chunk ${chunkIdx + 1}.`,
    `4 · Read and decompress one chunk. ${fmtBytes(bytesRead)} read out of ${fmtBytes(TOTAL_BYTES)}.`,
  ];
  const caption = clock < T_WRITE[1] ? captions[0] : step === 0 ? 'On close, the writer appends the summary and the footer.' : captions[step];

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label" aria-live="polite">
          <b>Fig. 1</b> &nbsp;{done ? `Seek to ${tt.toFixed(1)} s: ${fmtBytes(bytesRead)} read of ${fmtBytes(TOTAL_BYTES)}` : 'Writing, closing, then seeking'}
        </div>
        <div className="fig__controls">
          <Seg
            label="Seek target"
            value={target}
            onChange={(v) => {
              setTarget(v);
              if (!reduced) {
                setClock(T_SEEK[0] - 0.05);
                setPlaying(true);
              }
            }}
            options={[
              { value: '1.0', label: 'seek 1.0 s' },
              { value: '7.3', label: 'seek 7.3 s' },
              { value: '11.5', label: 'seek 11.5 s' },
            ]}
          />
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (reduced) return setClock(T_END);
              setClock(0);
              setPlaying(true);
            }}
          >
            <IconReplay /> Replay
          </button>
        </div>
      </div>
      <div className="fig__body">
        <div className="hscroll" ref={ref}>
          <svg className="fig__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 760 }} role="img" aria-label="An MCAP file is written front to back as chunks of messages, then a summary and footer are appended on close. A reader seeks by reading the footer, then the summary's chunk index, then one chunk.">
            <defs>
              <marker id="mh-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="var(--screen-ink)" />
              </marker>
            </defs>
            <SectionBrackets layout={layout} y={y - 54} />
            <Strip layout={layout} y={y} h={h} visible={visible} state={state} />
            {/* write cursor */}
            {cursorX !== null && <line x1={cursorX} x2={cursorX} y1={y - 10} y2={y + h + 10} stroke="var(--screen-ink)" strokeWidth={1.5} />}
            {/* the reader's jumps */}
            {step >= 1 && arc(pos('footer').x, sumStart + 4, 46, stepP(0.22, 0.42), 'var(--screen-ink)')}
            {step >= 3 && arc(pos(`ci${chunkIdx}`).x, pos(`chunk${chunkIdx}`).x, 70, stepP(0.5, 0.7), 'var(--focus-screen)')}
            <text x={0} y={y + h + 30} fontSize={12.5} fill="var(--screen-ink)">
              {caption}
            </text>
          </svg>
        </div>
        <div className="mcap-legend">
          {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
            <span key={g}>
              <span className="swatch" style={{ background: GROUP_COLOR[g] }} />
              {GROUP_LABEL[g]}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
