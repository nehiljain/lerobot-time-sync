import { useMemo, useState } from 'react';
import { Range } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { CHUNKS, CHUNK_SECONDS, RECORDS } from './model';
import { Strip, layoutStrip } from './Strip';

/*
  A chunked writer keeps the chunk it is filling in memory and writes it out whole.
  Cut the power and you keep every finished chunk, lose the one in memory, and have no summary.
*/

export function CrashLab() {
  const [ref, W0] = useElementWidth<HTMLDivElement>(1000);
  const W = Math.max(W0, 760);
  const layout = useMemo(() => layoutStrip(W), [W]);
  const [cut, setCut] = useState(7.3);

  const done = Math.min(CHUNKS, Math.floor(cut / CHUNK_SECONDS));
  const lostFrom = done * CHUNK_SECONDS;
  const lost = cut - lostFrom;

  const onDisk = (r: (typeof RECORDS)[number]) => {
    if (r.section !== 'data') return false;
    if (r.chunk === undefined) return r.key !== 'dataend';
    return r.chunk < done;
  };
  const afterRecover = (r: (typeof RECORDS)[number]) => {
    if (r.chunk !== undefined) return r.chunk < done;
    return true;
  };

  const ghost = (pred: (r: (typeof RECORDS)[number]) => boolean, y: number, h: number) =>
    layout
      .filter((l) => !pred(l.rec))
      .map((l) => (
        <rect key={l.rec.key} x={l.x} y={y} width={l.w} height={h} rx={3} fill="none" stroke="var(--screen-rule)" strokeDasharray="3 3" />
      ));

  const memChunk = layout.find((l) => l.rec.key === `chunk${done}`);

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 4</b> &nbsp;Pull the plug mid-recording
        </div>
      </div>
      <div className="fig__body">
        <Range label="Robot loses power at" value={cut} min={0.4} max={11.8} step={0.1} display={`${cut.toFixed(1)} s`} onChange={setCut} style={{ maxWidth: 440 }} />
        <div className="hscroll" ref={ref} style={{ marginTop: 14 }}>
          <svg className="fig__svg" width={W} height={210} viewBox={`0 0 ${W} 210`} style={{ minWidth: 760 }} role="img" aria-label={`Power lost at ${cut.toFixed(1)} seconds. ${done} complete chunks survive; ${lost.toFixed(1)} seconds in the unfinished chunk are lost; mcap recover rebuilds the summary.`}>
            <text x={0} y={14} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
              on disk after the crash
            </text>
            {ghost(onDisk, 24, 40)}
            <Strip layout={layout} y={24} h={40} visible={(r) => (onDisk(r) ? 1 : 0)} />
            {memChunk && (
              <g>
                <rect x={memChunk.x} y={24} width={memChunk.w * (lost / CHUNK_SECONDS)} height={40} rx={3} fill="rgba(208,59,59,0.25)" stroke="var(--bad)" strokeDasharray="3 3" />
                <text x={memChunk.x + 4} y={80} fontSize={9.5} fontFamily="var(--font-mono)" fill="#f08a8a">
                  in memory, lost
                </text>
              </g>
            )}
            <text x={layout.find((l) => l.rec.section === 'summary')!.x} y={80} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
              no summary, no footer
            </text>

            <text x={0} y={124} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
              after mcap recover
            </text>
            {ghost(afterRecover, 134, 40)}
            <Strip layout={layout} y={134} h={40} visible={(r) => (afterRecover(r) ? 1 : 0)} />
            <text x={0} y={196} fontSize={11} fill="var(--screen-ink)">
              {done === 0
                ? 'No chunk was finished, so nothing survives.'
                : `Kept 0 to ${lostFrom.toFixed(0)} s in ${done} chunk${done > 1 ? 's' : ''}. Lost ${lost.toFixed(1)} s. A fresh summary and footer make the file seekable again.`}
            </text>
          </svg>
        </div>
        <div className="crash-cmds">
          <code>mcap recover crashed.mcap -o fixed.mcap</code>
          <code>mcap doctor fixed.mcap</code>
          <span className="crash-cmds__note">ros2 bag reindex alone does not rebuild MCAP indexes</span>
        </div>
      </div>
      <p className="fig__note">
        Foxglove's chunk-size study found compression flat from 256 KiB to 32 MiB, while reader memory and the bytes read for one message grow
        with chunk size: about 0.4 MiB per point read at 1 MiB chunks, 14 MiB at 32 MiB. Writers now default to 1 MiB; rosbag2 uses its vendored
        768 KiB.
      </p>
    </figure>
  );
}
