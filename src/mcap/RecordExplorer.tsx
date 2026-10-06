import { useMemo, useState } from 'react';
import { useElementWidth } from '../lib/hooks';
import { GROUP_COLOR, GROUP_LABEL, RECORDS, fmtBytes, opHex, type Rec } from './model';
import { SectionBrackets, Strip, layoutStrip } from './Strip';

export function RecordExplorer() {
  const [ref, W0] = useElementWidth<HTMLDivElement>(1000);
  const W = Math.max(W0, 760);
  const layout = useMemo(() => layoutStrip(W), [W]);
  const [sel, setSel] = useState<string>('ci3');
  const rec = RECORDS.find((r) => r.key === sel)!;

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 2</b> &nbsp;Every record in the file · click one
        </div>
      </div>
      <div className="fig__body">
        <div className="hscroll" ref={ref}>
          <svg className="fig__svg" width={W} height={112} viewBox={`0 0 ${W} 112`} style={{ minWidth: 760 }} role="group" aria-label="MCAP records">
            <SectionBrackets layout={layout} y={30} />
            <Strip layout={layout} y={50} h={44} onPick={(r: Rec) => setSel(r.key)} selected={sel} state={(r) => (r.key === sel ? 'hot' : 'normal')} />
          </svg>
        </div>
        <div className="rec-panel" aria-live="polite">
          <div className="rec-panel__head">
            <span className="rec-panel__op mono" style={{ borderColor: GROUP_COLOR[rec.group] }}>
              {rec.op === null ? 'not a record' : `opcode ${opHex(rec.op)}`}
            </span>
            <h3>{rec.name}</h3>
            <span className="rec-panel__meta mono">
              {GROUP_LABEL[rec.group]} · {rec.section === 'end' ? 'end of file' : `${rec.section} section`} · ~{fmtBytes(rec.bytes)}
            </span>
          </div>
          <p className="rec-panel__purpose">{rec.purpose}</p>
          <dl className="rec-panel__fields">
            {rec.fields.map(([k, v]) => (
              <div key={k}>
                <dt className="mono">{k}</dt>
                <dd className="mono">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="fig__note">
        Every record is a 1-byte opcode, an 8-byte length, then its fields, so a reader can skip records it doesn't understand. Values
        here are examples.
      </p>
    </figure>
  );
}
